import { tsxToJsx, formatJs } from "../utils/code-utils";

describe("code-utils", function() {
  it("typescript to javascript should work", function() {
    const code = `
// This is a skeleton starter React component generated by Plasmic.
// @jsx helper
import React, { ReactNode } from "react";
import {
    PlasmicCodeSandboxDialogContent__RenderHelper,
    PlasmicCodeSandboxDialogContent__VariantsArgs,
    PlasmicCodeSandboxDialogContent__ArgsType,
    PlasmicCodeSandboxDialogContent__VariantsType,
    PlasmicCodeSandboxDialogContent__TriggerStateType
} from "./PP__CodeSandboxDialogContent"; // plasmic-import: f68b061e-0f85-41c1-8707-3ba9f634f1af/render

import Button from "../Button"; // plasmic-import: 4SYnkOQLd5/component
import { PlasmicButton__VariantsArgs } from "../../../plasmic/PlasmicButton"; // plasmic-import: 4SYnkOQLd5/renderer
import Dropdown from "./Dropdown"; // plasmic-import: a200b79f-288d-4306-be99-e5fd221b8ba6/component
import { PlasmicDropdown__VariantsArgs } from "./PP__Dropdown"; // plasmic-import: a200b79f-288d-4306-be99-e5fd221b8ba6/renderer
import DropdownItem from "./DropdownItem"; // plasmic-import: f4c2f0bb-8dce-49c7-a106-65abe9e70e51/component
import { PlasmicDropdownItem__VariantsArgs } from "./PP__DropdownItem"; // plasmic-import: f4c2f0bb-8dce-49c7-a106-65abe9e70e51/renderer
import IconButton from "../../IconButton"; // plasmic-import: cfe92-5RW/component
import { PlasmicIconButton__VariantsArgs } from "../../../plasmic/PlasmicIconButton"; // plasmic-import: cfe92-5RW/renderer
import { hasVariant, DefaultFlexStack, FlexStack } from "@plasmicapp/react-web";
import { StudioCtx } from "../../../StudioCtx";
import { ensure, asOne, isValidEmail } from "../../../../common";
import { CodeSandboxInfo } from "../../../../shared/db-json-blobs";
import { createSandboxUrl } from "../../../../codesandbox/url";
import { Tooltip } from "antd";
import { observer } from "mobx-react-lite";

interface CodeSandboxDialogContentProps {
    sc: StudioCtx;
    onClose: () => void;

    // Required className prop is used for positioning this component
    className?: string;
}

function _CodeSandboxDialogContent(props: CodeSandboxDialogContentProps) {
    const sc = props.sc;
    const [inviting, setInviting] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [email, setEmail] = React.useState("");
    const [sandboxInfo, setSandboxInfo] = React.useState<
    CodeSandboxInfo | undefined
    >(asOne(sc.siteInfo.codeSandboxInfos));
    const [codeScheme, setCodeScheme] = React.useState<"blackbox" | "direct">(
    sandboxInfo ? sandboxInfo.code.scheme : "blackbox"
    );

    const openSandboxPopup = (sandboxId: string) => {
    const url = createSandboxUrl({ id: sandboxId });
    if (sc.popupCodesandboxWindow && !sc.popupCodesandboxWindow.closed) {
        sc.popupCodesandboxWindow.location.href = url;
        sc.popupCodesandboxWindow.focus();
    } else {
        sc.popupCodesandboxWindow = window.open(url);
    }
    };

    const onCreateOrUpdateSandbox = async () => {
    setSubmitting(true);
    const { id } = await sc.appCtx.api.publishCodeSandbox(
        sc.siteInfo.id,
        sandboxInfo
        ? { ...sandboxInfo }
        : { code: { lang: "ts", scheme: codeScheme } }
    );

    await sc.refreshSiteInfo();
    setSubmitting(false);
    setSandboxInfo((sc.siteInfo.codeSandboxInfos || []).find(x => x.id === id));
    openSandboxPopup(id);
    };

    const onInvite = () => {
    setInviting(true);
    sc.appCtx.api
        .shareCodeSandbox(sc.siteInfo.id, ensure(sandboxInfo).id, email)
        .then(() => {
        setInviting(false);
        });
    setEmail("");
    };

    const onSwitchCodeScheme = (scheme: "blackbox" | "direct") => {
    setCodeScheme(scheme);
    setSandboxInfo(
        (sc.siteInfo.codeSandboxInfos || []).find(x => x.code.scheme === scheme)
    );
    };

    const onDeleteSandbox = async () => {
    setSubmitting(true);
    await sc.appCtx.api.detachCodeSandbox(
        sc.siteInfo.id,
        ensure(sandboxInfo).id
    );

    await sc.refreshSiteInfo();
    setSubmitting(false);
    setSandboxInfo(undefined);
    };

    const variants: PlasmicCodeSandboxDialogContent__VariantsArgs = {
    state: inviting ? "inviting" : submitting ? "submitting" : undefined,
    hasSandbox: !!sandboxInfo ? "yes" : "no",
    invalidEmail: !isValidEmail(email) ? "yes" : undefined,
    canEdit: !sc.canEditProject() ? "no" : undefined,
    scheme: codeScheme === "direct" ? "direct" : "blackbox"
    };

    const args: PlasmicCodeSandboxDialogContent__ArgsType = {};

    // The following code block is fully managed by Plasmic. Don't edit - it will
    // be overwritten after every "plasmic sync".
    // plasmic-managed-start

    const rh = new PlasmicCodeSandboxDialogContent__RenderHelper(
    variants,
    args,
    props.className
    );

    // plasmic-managed-end

    // plasmic-managed-jsx/5487
    return (
    <div className={rh.clsRoot()}>
        <div className={rh.clsF7050e55$eea1$41ab$9682$db9ad8d08cb1()}>
        <div className={rh.cls70032be2$1620$48b3$ba29$c027e30b7907()}>
            CodeSandbox
        </div>
        <DefaultFlexStack className={rh.cls8oFaZaiIX()}>
            {rh.showOpenButton() && (
            <Button
                startIcon={
                <img className={rh.cls$qzB2zcT8()} {...rh.props$qzB2zcT8()} />
                }
                {...rh.propsOpenButton()}
                onClick={() => openSandboxPopup(ensure(sandboxInfo).id)}
            >
                Open in new tab
            </Button>
            )}

            <img
            className={rh.clsCloseButton()}
            {...rh.propsCloseButton()}
            onClick={props.onClose}
            />
        </DefaultFlexStack>
        </div>
        <div className={rh.cls43fcb29a$5286$4b5a$8593$49b737cdd7b0()} />
        <DefaultFlexStack className={rh.clsWL8ypAgbq()}>
        <div className={rh.clsTmQlfUKwS()}>Code scheme</div>
        <Dropdown
            {...rh.propsCodeSchemeDropdown()}
            selectedValue={rh.childStrCodeSchemeDropdown()}
            items={
            <>
                <DropdownItem
                {...rh.propsBlackBoxOption()}
                value={"Blackbox Library"}
                selected={codeScheme === "blackbox"}
                onSelected={() => onSwitchCodeScheme("blackbox")}
                />

                <DropdownItem
                {...rh.propsPlainReactOption()}
                value={"Plain React"}
                selected={codeScheme === "direct"}
                onSelected={() => onSwitchCodeScheme("direct")}
                />
            </>
            }
        />
        </DefaultFlexStack>
        <div className={rh.clsH1u3gI8vG()}>{rh.childStrH1u3gI8vG()}</div>
        {rh.showCreateHint() && (
        <div className={rh.clsCreateHint()}>
            {rh.showCreateHint2() && (
            <div className={rh.clsCreateHint2()}>
                {rh.childStrCreateHint2()}
            </div>
            )}
        </div>
        )}

        {rh.showCreateButton() && (
        <Button
            startIcon={
            <img className={rh.clsGvtJoBerl()} {...rh.propsGvtJoBerl()} />
            }
            {...rh.propsCreateButton()}
            onClick={onCreateOrUpdateSandbox}
        >
            {rh.childStrCreateButton()}
        </Button>
        )}

        {rh.showUpdateHint() && (
        <div className={rh.clsUpdateHint()}>
            <div className={rh.clsCreateHint22()}>
            {rh.childStrCreateHint22()}
            </div>
        </div>
        )}

        {rh.showNmdHeAjEx() && (
        <DefaultFlexStack className={rh.clsNmdHeAjEx()}>
            <input
            className={rh.clsEmail()}
            {...rh.propsEmail()}
            onChange={e => setEmail(e.target.value)}
            value={email}
            />

            <Button {...rh.propsInviteButton()} onClick={onInvite}>
            {rh.childStrInviteButton()}
            </Button>
            <div className={rh.clsZG$NA1rCh()} />
            {rh.show$kdxH_yN6() && (
            <div className={rh.cls$kdxH_yN6()}>
                {rh.showUpdateButton() && (
                <Button
                    startIcon={
                    rh.showL4QcXYzNZ() && (
                        <img
                        className={rh.clsL4QcXYzNZ()}
                        {...rh.propsL4QcXYzNZ()}
                        />
                    )
                    }
                    {...rh.propsUpdateButton()}
                    onClick={onCreateOrUpdateSandbox}
                >
                    {rh.childStrUpdateButton()}
                </Button>
                )}

                {rh.showDeleteButton() && (
                <Tooltip title="Detach this code sandbox. You can still access it via codesandbox.io, but Plasmic will start using a new sandbox instead.">
                    <IconButton
                    {...rh.propsDeleteButton()}
                    onClick={onDeleteSandbox}
                    />
                </Tooltip>
                )}
            </div>
            )}
        </DefaultFlexStack>
        )}
    </div>
    );
}

export const CodeSandboxDialogContent = observer(
    _CodeSandboxDialogContent as React.FunctionComponent<
    CodeSandboxDialogContentProps
    >
);`;
    expect(tsxToJsx(code).trim()).toEqual(
      `
// This is a skeleton starter React component generated by Plasmic.
// @jsx helper
import React from "react";
import { PlasmicCodeSandboxDialogContent__RenderHelper } from "./PP__CodeSandboxDialogContent"; // plasmic-import: f68b061e-0f85-41c1-8707-3ba9f634f1af/render
import Button from "../Button"; // plasmic-import: 4SYnkOQLd5/component
import Dropdown from "./Dropdown"; // plasmic-import: a200b79f-288d-4306-be99-e5fd221b8ba6/component
import DropdownItem from "./DropdownItem"; // plasmic-import: f4c2f0bb-8dce-49c7-a106-65abe9e70e51/component
import IconButton from "../../IconButton"; // plasmic-import: cfe92-5RW/component
import { DefaultFlexStack } from "@plasmicapp/react-web";
import { ensure, asOne, isValidEmail } from "../../../../common";
import { createSandboxUrl } from "../../../../codesandbox/url";
import { Tooltip } from "antd";
import { observer } from "mobx-react-lite";
function _CodeSandboxDialogContent(props) {
    const sc = props.sc;
    const [inviting, setInviting] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [email, setEmail] = React.useState("");
    const [sandboxInfo, setSandboxInfo] = React.useState(asOne(sc.siteInfo.codeSandboxInfos));
    const [codeScheme, setCodeScheme] = React.useState(sandboxInfo ? sandboxInfo.code.scheme : "blackbox");
    const openSandboxPopup = (sandboxId) => {
        const url = createSandboxUrl({ id: sandboxId });
        if (sc.popupCodesandboxWindow && !sc.popupCodesandboxWindow.closed) {
            sc.popupCodesandboxWindow.location.href = url;
            sc.popupCodesandboxWindow.focus();
        }
        else {
            sc.popupCodesandboxWindow = window.open(url);
        }
    };
    const onCreateOrUpdateSandbox = async () => {
        setSubmitting(true);
        const { id } = await sc.appCtx.api.publishCodeSandbox(sc.siteInfo.id, sandboxInfo
            ? { ...sandboxInfo }
            : { code: { lang: "ts", scheme: codeScheme } });
        await sc.refreshSiteInfo();
        setSubmitting(false);
        setSandboxInfo((sc.siteInfo.codeSandboxInfos || []).find(x => x.id === id));
        openSandboxPopup(id);
    };
    const onInvite = () => {
        setInviting(true);
        sc.appCtx.api
            .shareCodeSandbox(sc.siteInfo.id, ensure(sandboxInfo).id, email)
            .then(() => {
            setInviting(false);
        });
        setEmail("");
    };
    const onSwitchCodeScheme = (scheme) => {
        setCodeScheme(scheme);
        setSandboxInfo((sc.siteInfo.codeSandboxInfos || []).find(x => x.code.scheme === scheme));
    };
    const onDeleteSandbox = async () => {
        setSubmitting(true);
        await sc.appCtx.api.detachCodeSandbox(sc.siteInfo.id, ensure(sandboxInfo).id);
        await sc.refreshSiteInfo();
        setSubmitting(false);
        setSandboxInfo(undefined);
    };
    const variants = {
        state: inviting ? "inviting" : submitting ? "submitting" : undefined,
        hasSandbox: !!sandboxInfo ? "yes" : "no",
        invalidEmail: !isValidEmail(email) ? "yes" : undefined,
        canEdit: !sc.canEditProject() ? "no" : undefined,
        scheme: codeScheme === "direct" ? "direct" : "blackbox"
    };
    const args = {};
    // The following code block is fully managed by Plasmic. Don't edit - it will
    // be overwritten after every "plasmic sync".
    // plasmic-managed-start
    const rh = new PlasmicCodeSandboxDialogContent__RenderHelper(variants, args, props.className);
    // plasmic-managed-end
    // plasmic-managed-jsx/5487
    return (<div className={rh.clsRoot()}>
        <div className={rh.clsF7050e55$eea1$41ab$9682$db9ad8d08cb1()}>
        <div className={rh.cls70032be2$1620$48b3$ba29$c027e30b7907()}>
            CodeSandbox
        </div>
        <DefaultFlexStack className={rh.cls8oFaZaiIX()}>
            {rh.showOpenButton() && (<Button startIcon={<img className={rh.cls$qzB2zcT8()} {...rh.props$qzB2zcT8()}/>} {...rh.propsOpenButton()} onClick={() => openSandboxPopup(ensure(sandboxInfo).id)}>
                Open in new tab
            </Button>)}

            <img className={rh.clsCloseButton()} {...rh.propsCloseButton()} onClick={props.onClose}/>
        </DefaultFlexStack>
        </div>
        <div className={rh.cls43fcb29a$5286$4b5a$8593$49b737cdd7b0()}/>
        <DefaultFlexStack className={rh.clsWL8ypAgbq()}>
        <div className={rh.clsTmQlfUKwS()}>Code scheme</div>
        <Dropdown {...rh.propsCodeSchemeDropdown()} selectedValue={rh.childStrCodeSchemeDropdown()} items={<>
                <DropdownItem {...rh.propsBlackBoxOption()} value={"Blackbox Library"} selected={codeScheme === "blackbox"} onSelected={() => onSwitchCodeScheme("blackbox")}/>

                <DropdownItem {...rh.propsPlainReactOption()} value={"Plain React"} selected={codeScheme === "direct"} onSelected={() => onSwitchCodeScheme("direct")}/>
            </>}/>
        </DefaultFlexStack>
        <div className={rh.clsH1u3gI8vG()}>{rh.childStrH1u3gI8vG()}</div>
        {rh.showCreateHint() && (<div className={rh.clsCreateHint()}>
            {rh.showCreateHint2() && (<div className={rh.clsCreateHint2()}>
                {rh.childStrCreateHint2()}
            </div>)}
        </div>)}

        {rh.showCreateButton() && (<Button startIcon={<img className={rh.clsGvtJoBerl()} {...rh.propsGvtJoBerl()}/>} {...rh.propsCreateButton()} onClick={onCreateOrUpdateSandbox}>
            {rh.childStrCreateButton()}
        </Button>)}

        {rh.showUpdateHint() && (<div className={rh.clsUpdateHint()}>
            <div className={rh.clsCreateHint22()}>
            {rh.childStrCreateHint22()}
            </div>
        </div>)}

        {rh.showNmdHeAjEx() && (<DefaultFlexStack className={rh.clsNmdHeAjEx()}>
            <input className={rh.clsEmail()} {...rh.propsEmail()} onChange={e => setEmail(e.target.value)} value={email}/>

            <Button {...rh.propsInviteButton()} onClick={onInvite}>
            {rh.childStrInviteButton()}
            </Button>
            <div className={rh.clsZG$NA1rCh()}/>
            {rh.show$kdxH_yN6() && (<div className={rh.cls$kdxH_yN6()}>
                {rh.showUpdateButton() && (<Button startIcon={rh.showL4QcXYzNZ() && (<img className={rh.clsL4QcXYzNZ()} {...rh.propsL4QcXYzNZ()}/>)} {...rh.propsUpdateButton()} onClick={onCreateOrUpdateSandbox}>
                    {rh.childStrUpdateButton()}
                </Button>)}

                {rh.showDeleteButton() && (<Tooltip title="Detach this code sandbox. You can still access it via codesandbox.io, but Plasmic will start using a new sandbox instead.">
                    <IconButton {...rh.propsDeleteButton()} onClick={onDeleteSandbox}/>
                </Tooltip>)}
            </div>)}
        </DefaultFlexStack>)}
    </div>);
}
export const CodeSandboxDialogContent = observer(_CodeSandboxDialogContent);`.trim()
    );
  });
});
