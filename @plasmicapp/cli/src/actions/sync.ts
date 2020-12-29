import { spawnSync } from "child_process";
import L from "lodash";
import path from "upath";
import { CommonArgs } from "..";
import {
  ComponentBundle,
  ProjectMetaBundle,
  StyleConfigResponse,
} from "../api";
import {
  ComponentUpdateSummary,
  fixAllImportStatements,
  formatAsLocal,
  maybeConvertTsxToJsx,
  mkFixImportContext,
  replaceImports,
} from "../utils/code-utils";
import {
  createProjectConfig,
  getOrAddProjectConfig,
  getOrAddProjectLock,
  PlasmicContext,
  updateConfig,
} from "../utils/config-utils";
import { HandledError } from "../utils/error";
import {
  defaultResourcePath,
  fixAllFilePaths,
  renameFile,
  stripExtension,
  withBufferedFs,
  writeFileContent,
} from "../utils/file-utils";
import { getContext } from "../utils/get-context";
import {
  findInstalledVersion,
  getCliVersion,
  installCommand,
  installUpgrade,
  warnLatestReactWeb,
} from "../utils/npm-utils";
import { checkVersionResolution } from "../utils/resolve-utils";
import * as semver from "../utils/semver";
import { confirmWithUser } from "../utils/user-utils";
import {
  ComponentPendingMerge,
  syncProjectComponents,
} from "./sync-components";
import { syncGlobalVariants } from "./sync-global-variants";
import { syncProjectIconAssets } from "./sync-icons";
import { syncProjectImageAssets } from "./sync-images";
import { upsertStyleTokens } from "./sync-styles";

export interface SyncArgs extends CommonArgs {
  projects: readonly string[];
  forceOverwrite: boolean;
  newComponentScheme?: "blackbox" | "direct";
  appendJsxOnMissingBase?: boolean;
  yes?: boolean;
  force?: boolean;
  nonRecursive?: boolean;
  skipUpgradeCheck?: boolean;
  quiet?: boolean;
}

async function ensureRequiredPackages(context: PlasmicContext, yes?: boolean) {
  const requireds = await context.api.requiredPackages();

  const confirmInstall = async (
    pkg: string,
    requiredVersion: string,
    opts: { global: boolean; dev: boolean }
  ) => {
    let success = false;
    const command = installCommand(pkg, opts);
    const upgrade = await confirmWithUser(
      `A more recent version of ${pkg} >=${requiredVersion} is required. Would you like to upgrade via "${command}"?`,
      yes
    );
    if (upgrade) {
      success = installUpgrade(pkg, opts);
    } else {
      success = false;
    }

    if (!success) {
      throw new HandledError(`Upgrading ${pkg} is required to continue.`);
    }
  };

  const cliVersion = getCliVersion();
  if (!cliVersion || semver.gt(requireds["@plasmicapp/cli"], cliVersion)) {
    const isGlobal = !findInstalledVersion(context, "@plasmicapp/cli");
    await confirmInstall("@plasmicapp/cli", requireds["@plasmicapp/cli"], {
      global: isGlobal,
      dev: true,
    });
  }

  const reactWebVersion = findInstalledVersion(
    context,
    "@plasmicapp/react-web"
  );
  if (
    !reactWebVersion ||
    semver.gt(requireds["@plasmicapp/react-web"], reactWebVersion)
  ) {
    await confirmInstall(
      "@plasmicapp/react-web",
      requireds["@plasmicapp/react-web"],
      { global: false, dev: false }
    );
  }
}

/**
 * Sync will always try to sync down a set of components that are version-consistent among specified projects.
 * (we only allow 1 version per projectId).
 * NOTE: the repo/plasmic.json might include projects with conflicting versions in its dependency tree.
 * We leave it to the user to sync all projects if they want us to catch/prevent this.
 * @param opts
 */
export async function sync(opts: SyncArgs): Promise<void> {
  const context = await getContext(opts);

  if (!opts.skipUpgradeCheck) {
    await ensureRequiredPackages(context, opts.yes);
  }

  fixAllFilePaths(context);
  fixFileExtension(context);

  const projectIds =
    opts.projects.length > 0
      ? opts.projects
      : context.config.projects.map((p) => p.projectId);

  // Short-circuit if nothing to sync
  if (projectIds.length === 0) {
    throw new HandledError(
      "Don't know which projects to sync. Please specify via --projects"
    );
  }

  // Resolve what will be synced
  const projectConfigMap = L.keyBy(context.config.projects, (p) => p.projectId);
  const projectSyncParams = projectIds.map((projectId) => {
    // Use the version in plasmic.json, otherwise default to "latest"
    const versionRange = projectConfigMap[projectId]?.version ?? "latest";
    return {
      projectId,
      versionRange,
      componentIdOrNames: undefined, // Get all components!
    };
  });
  const versionResolution = await context.api.resolveSync(
    projectSyncParams,
    true // we always want to get dependency data
  );

  // Make sure the resolution is compatible with plasmic.json and plasmic.lock
  const projectsToSync = await checkVersionResolution(
    versionResolution,
    context,
    opts
  );
  if (projectsToSync.length <= 0) {
    throw new HandledError(
      "No compatible versions to sync. Please fix the warnings and try again."
    );
  }
  const summary = new Map<string, ComponentUpdateSummary>();
  const pendingMerge = new Array<ComponentPendingMerge>();

  // Perform the actual sync
  await withBufferedFs(async () => {
    // Sync in sequence (no parallelism)
    // going in reverse to get leaves of the dependency tree first
    for (const projectMeta of projectsToSync) {
      await syncProject(
        context,
        opts,
        projectMeta.projectId,
        projectMeta.componentIds,
        projectMeta.version,
        projectMeta.dependencies,
        summary,
        pendingMerge
      );
    }

    // Materialize scheme into each component config.
    context.config.projects.forEach((p) =>
      p.components.forEach((c) => {
        if (!c.scheme) {
          c.scheme = context.config.code.scheme;
        }
      })
    );

    syncStyleConfig(
      context,
      await context.api.genStyleConfig(context.config.style)
    );

    // Write the new ComponentConfigs to disk
    updateConfig(context, context.config);

    // Fix imports
    const fixImportContext = mkFixImportContext(context.config);
    for (const m of pendingMerge) {
      const resolvedEditedFile = replaceImports(
        context,
        m.editedSkeletonFile,
        m.skeletonModulePath,
        fixImportContext,
        true
      );
      const resolvedNewFile = replaceImports(
        context,
        m.newSkeletonFile,
        m.skeletonModulePath,
        fixImportContext,
        true
      );
      await m.merge(resolvedNewFile, resolvedEditedFile);
    }
    // Now we know config.components are all correct, so we can go ahead and fix up all the import statements
    fixAllImportStatements(context, summary);
  });

  // Prompt to upgrade react-web
  if (!opts.skipUpgradeCheck) {
    await warnLatestReactWeb(context, opts.yes);
  }

  // Post-sync commands
  for (const cmd of context.config.postSyncCommands || []) {
    spawnSync(cmd, { shell: true, stdio: "inherit" });
  }
}

function maybeRenamePathExt(
  context: PlasmicContext,
  path: string,
  ext: string
) {
  if (!path) {
    return path;
  }
  const correctPath = `${stripExtension(path, true)}${ext}`;
  if (path !== correctPath) {
    renameFile(context, path, correctPath);
  }
  return correctPath;
}

function fixFileExtension(context: PlasmicContext) {
  const cssExt =
    context.config.style.scheme === "css-modules" ? ".module.css" : ".css";
  context.config.style.defaultStyleCssFilePath = maybeRenamePathExt(
    context,
    context.config.style.defaultStyleCssFilePath,
    cssExt
  );
  context.config.projects.forEach((project) => {
    project.cssFilePath = maybeRenamePathExt(
      context,
      project.cssFilePath,
      cssExt
    );
    project.components.forEach((component) => {
      component.cssFilePath = maybeRenamePathExt(
        context,
        component.cssFilePath,
        cssExt
      );
    });
  });
}

async function syncProject(
  context: PlasmicContext,
  opts: SyncArgs,
  projectId: string,
  componentIds: string[],
  projectVersion: string,
  dependencies: { [projectId: string]: string },
  summary: Map<string, ComponentUpdateSummary>,
  pendingMerge: ComponentPendingMerge[]
): Promise<void> {
  const newComponentScheme =
    opts.newComponentScheme || context.config.code.scheme;
  const existingProject = context.config.projects.find(
    (p) => p.projectId === projectId
  );
  const existingCompScheme: Array<[string, "blackbox" | "direct"]> = (
    existingProject?.components || []
  ).map((c) => [c.id, c.scheme]);

  // Server-side code-gen
  const projectBundle = await context.api.projectComponents(
    projectId,
    context.config.platform,
    newComponentScheme,
    existingCompScheme,
    componentIds,
    projectVersion,
    context.config.images,
    context.config.style
  );

  // Convert from TSX => JSX
  if (context.config.code.lang === "js") {
    projectBundle.components.forEach((c) => {
      [c.renderModuleFileName, c.renderModule] = maybeConvertTsxToJsx(
        c.renderModuleFileName,
        c.renderModule
      );
      [c.skeletonModuleFileName, c.skeletonModule] = maybeConvertTsxToJsx(
        c.skeletonModuleFileName,
        c.skeletonModule
      );
    });
    projectBundle.iconAssets.forEach((icon) => {
      [icon.fileName, icon.module] = maybeConvertTsxToJsx(
        icon.fileName,
        icon.module
      );
    });
    projectBundle.globalVariants.forEach((gv) => {
      [gv.contextFileName, gv.contextModule] = maybeConvertTsxToJsx(
        gv.contextFileName,
        gv.contextModule
      );
    });
    projectBundle.projectConfig.jsBundleThemes.forEach((theme) => {
      [theme.themeFileName, theme.themeModule] = maybeConvertTsxToJsx(
        theme.themeFileName,
        theme.themeModule
      );
    });
  }
  syncGlobalVariants(
    context,
    projectBundle.projectConfig,
    projectBundle.globalVariants
  );

  await syncProjectConfig(
    context,
    projectBundle.projectConfig,
    projectVersion,
    dependencies,
    projectBundle.components,
    opts.forceOverwrite,
    !!opts.appendJsxOnMissingBase,
    summary,
    pendingMerge
  );
  upsertStyleTokens(context, projectBundle.usedTokens);
  syncProjectIconAssets(
    context,
    projectId,
    projectVersion,
    projectBundle.iconAssets
  );
  syncProjectImageAssets(
    context,
    projectId,
    projectVersion,
    projectBundle.imageAssets
  );
}

function syncStyleConfig(
  context: PlasmicContext,
  response: StyleConfigResponse
) {
  const expectedPath =
    context.config.style.defaultStyleCssFilePath ||
    path.join(
      context.config.defaultPlasmicDir,
      response.defaultStyleCssFileName
    );
  context.config.style.defaultStyleCssFilePath = expectedPath;
  writeFileContent(context, expectedPath, response.defaultStyleCssRules, {
    force: true,
  });
}

async function syncProjectConfig(
  context: PlasmicContext,
  projectBundle: ProjectMetaBundle,
  version: string,
  dependencies: { [projectId: string]: string },
  componentBundles: ComponentBundle[],
  forceOverwrite: boolean,
  appendJsxOnMissingBase: boolean,
  summary: Map<string, ComponentUpdateSummary>,
  pendingMerge: ComponentPendingMerge[]
) {
  const defaultCssFilePath = defaultResourcePath(
    context,
    projectBundle.projectName,
    projectBundle.cssFileName
  );
  const isNew = !context.config.projects.find(
    (p) => p.projectId === projectBundle.projectId
  );

  // If latest, use that as the range, otherwise set to latest published (>=0.0.0)
  const versionRange = semver.isLatest(version) ? version : ">=0.0.0";
  const projectConfig = getOrAddProjectConfig(
    context,
    projectBundle.projectId,
    createProjectConfig({
      projectId: projectBundle.projectId,
      projectName: projectBundle.projectName,
      version: versionRange,
      cssFilePath: defaultCssFilePath,
    })
  );

  // Update missing/outdated props
  projectConfig.projectName = projectBundle.projectName;
  if (!projectConfig.cssFilePath) {
    projectConfig.cssFilePath = defaultCssFilePath;
  }

  // Write out project css
  writeFileContent(context, projectConfig.cssFilePath, projectBundle.cssRules, {
    force: !isNew,
  });

  // plasmic.lock
  const projectLock = getOrAddProjectLock(context, projectConfig.projectId);
  projectLock.version = version;
  projectLock.dependencies = dependencies;

  projectBundle.jsBundleThemes.forEach((theme) => {
    let themeConfig = projectConfig.jsBundleThemes.find(
      (c) => c.bundleName === theme.bundleName
    );
    if (!themeConfig) {
      const themeFilePath = defaultResourcePath(
        context,
        projectConfig,
        theme.themeFileName
      );
      themeConfig = { themeFilePath, bundleName: theme.bundleName };
      projectConfig.jsBundleThemes.push(themeConfig);
    }
    const formatted = formatAsLocal(
      theme.themeModule,
      themeConfig.themeFilePath
    );
    writeFileContent(context, themeConfig.themeFilePath, formatted, {
      force: true,
    });
  });

  // Write out components
  await syncProjectComponents(
    context,
    projectConfig,
    version,
    componentBundles,
    forceOverwrite,
    appendJsxOnMissingBase,
    summary,
    pendingMerge
  );
}
