/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useState, useRef, useEffect, useContext, Fragment } from "react";
import { graphql, GraphQLSchema } from "graphql";
import GraphiQLExplorer from "graphiql-explorer";
import { Button, HeroIcon, IconButton, Switch } from "@neo4j-ndl/react";
import tokens from "@neo4j-ndl/base/lib/tokens/js/tokens";
import { EditorFromTextArea } from "codemirror";
import debounce from "lodash.debounce";
import { JSONEditor } from "./JSONEditor";
import { GraphQLQueryEditor } from "./GraphQLQueryEditor";
import {
    EDITOR_PARAMS_INPUT,
    DEFAULT_QUERY,
    EDITOR_RESPONSE_OUTPUT,
    LOCAL_STATE_TYPE_LAST_PARAMS,
    LOCAL_STATE_TYPE_LAST_QUERY,
} from "../../constants";
import { Grid } from "./grid/Grid";
import { formatCode, safeParse, ParserOptions } from "./utils";
import { Extension } from "../../components/Filename";
import { ViewSelectorComponent } from "../../components/ViewSelectorComponent";
import { SettingsContext } from "../../contexts/settings";
import { AppSettings } from "../AppSettings/AppSettings";
import { HelpDrawer } from "../HelpDrawer/HelpDrawer";
import { DocExplorerComponent } from "../HelpDrawer/DocExplorerComponent";
import { Storage } from "../../utils/storage";

const DEBOUNCE_TIMEOUT = 500;

export interface Props {
    schema?: GraphQLSchema;
}

export const Editor = (props: Props) => {
    const settings = useContext(SettingsContext);
    const [initialLoad, setInitialLoad] = useState(false);
    const [loading, setLoading] = useState(false);
    const [query, setQuery] = useState("");
    const [variableValues, setVariableValues] = useState("");
    const [initVariableValues, setInitVariableValues] = useState("");
    const [output, setOutput] = useState("");
    const [showDocs, setShowDocs] = useState(false);
    const refForQueryEditorMirror = useRef<EditorFromTextArea | null>(null);
    const showRightPanel = settings.isShowHelpDrawer || settings.isShowSettingsDrawer;

    const debouncedSave = useCallback(
        debounce((key, value) => {
            Storage.store(key, value);
        }, DEBOUNCE_TIMEOUT),
        []
    );

    const formatTheCode = (): void => {
        if (!refForQueryEditorMirror.current) return;
        formatCode(refForQueryEditorMirror.current, ParserOptions.GRAPH_QL);
    };

    const onSubmit = useCallback(
        async (override?: string) => {
            let result: string;
            setLoading(true);
            if (!props.schema) return;

            try {
                const response = await graphql({
                    schema: props.schema,
                    source: override || query || "",
                    contextValue: {},
                    variableValues: safeParse(variableValues, {}),
                });

                result = JSON.stringify(response);
            } catch (error) {
                result = JSON.stringify({ errors: [error] });
            }

            setTimeout(() => {
                setOutput(result);
                setLoading(false);
            }, 500);
        },
        [query, setOutput, setLoading, variableValues]
    );

    useEffect(() => {
        const initQuery = Storage.retrieveJSON(LOCAL_STATE_TYPE_LAST_QUERY) || DEFAULT_QUERY;
        const initParams = Storage.retrieveJSON(LOCAL_STATE_TYPE_LAST_PARAMS) || "";
        setInitialLoad(true);
        setQuery(initQuery);
        setVariableValues(initParams);
        setInitVariableValues(initParams);
    }, []);

    return (
        <div className="w-full flex">
            <div className="flex flex-col w-full">
                <div className="h-12 w-full bg-white flex items-center px-6">
                    <div className="justify-start">
                        <ViewSelectorComponent
                            key="editor-view-selector"
                            elementKey="editor-view-selector"
                            isEditorDisabled={!!props.schema || loading}
                        />
                    </div>
                </div>
                <div className="flex w-full">
                    <div className="h-content-container flex justify-start w-96 bg-white graphiql-container border-t border-gray-100">
                        <div className="p-6 h-content-container">
                            {props.schema && initialLoad ? (
                                <Fragment>
                                    <div className="graphiql-explorer-open-docs-container">
                                        <Switch
                                            label="Docs"
                                            checked={showDocs}
                                            onChange={() => setShowDocs(!showDocs)}
                                        />
                                    </div>
                                    <GraphiQLExplorer
                                        schema={props.schema}
                                        query={query}
                                        onEdit={setQuery}
                                        onRunOperation={onSubmit}
                                        explorerIsOpen={true}
                                        styles={{
                                            buttonStyle: {
                                                display: "block",
                                                fontWeight: "bold",
                                                backgroundColor: "#E6E9EE",
                                                margin: "5px 5px 5px 10px",
                                                width: "50px !important",
                                            },
                                            explorerActionsStyle: {
                                                margin: "4px -8px -8px",
                                                paddingTop: "5px",
                                                bottom: "0px",
                                                textAlign: "center",
                                                background: "none",
                                                borderTop: "none",
                                                borderBottom: "none",
                                            },
                                        }}
                                    />
                                </Fragment>
                            ) : null}
                        </div>
                    </div>
                    {showDocs ? (
                        <div className="graphiql-explorer-docs-container h-content-docs-container w-96 bg-white shadow rounded">
                            <DocExplorerComponent
                                schema={props.schema}
                                displayBackButton={false}
                                onClickClose={() => setShowDocs(false)}
                            />
                        </div>
                    ) : null}
                    {/* <div
                        className={`h-content-container flex justify-start p-4 ${       ------ check this!
                            showRightPanel ? "w-editor-container" : "w-full"
                        }`}
                    > */}
                    <div className="h-content-container flex justify-start p-4 w-full">
                        <div className="flex flex-col w-full">
                            <Grid
                                isRightPanelVisible={showRightPanel}
                                queryEditor={
                                    props.schema ? (
                                        <GraphQLQueryEditor
                                            schema={props.schema}
                                            query={query}
                                            loading={loading}
                                            mirrorRef={refForQueryEditorMirror}
                                            onChangeQuery={(query) => {
                                                setQuery(query);
                                                debouncedSave(LOCAL_STATE_TYPE_LAST_QUERY, JSON.stringify(query));
                                            }}
                                            executeQuery={onSubmit}
                                            buttons={
                                                <Fragment>
                                                    <Button
                                                        aria-label="Prettify code"
                                                        className="mr-2"
                                                        color="neutral"
                                                        fill="outlined"
                                                        buttonSize="small"
                                                        onClick={formatTheCode}
                                                        disabled={loading}
                                                    >
                                                        Prettify
                                                    </Button>
                                                    <IconButton
                                                        data-test-editor-query-button
                                                        aria-label="Execute query"
                                                        color="primary"
                                                        clean
                                                        onClick={() => onSubmit()}
                                                        disabled={!props.schema || loading}
                                                    >
                                                        <HeroIcon
                                                            style={{
                                                                color: tokens.colors.primary[50],
                                                            }}
                                                            iconName="PlayIcon"
                                                            type="outline"
                                                        />
                                                    </IconButton>
                                                </Fragment>
                                            }
                                        />
                                    ) : null
                                }
                                parameterEditor={
                                    <JSONEditor
                                        id={EDITOR_PARAMS_INPUT}
                                        fileName="params"
                                        loading={loading}
                                        fileExtension={Extension.JSON}
                                        readonly={false}
                                        initialValue={initVariableValues}
                                        onChange={(params) => {
                                            setVariableValues(params);
                                            debouncedSave(LOCAL_STATE_TYPE_LAST_PARAMS, JSON.stringify(params));
                                        }}
                                    />
                                }
                                resultView={
                                    <JSONEditor
                                        id={EDITOR_RESPONSE_OUTPUT}
                                        fileName="response"
                                        loading={loading}
                                        fileExtension={Extension.JSON}
                                        readonly={true}
                                        json={output}
                                        onChange={setOutput}
                                    />
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>

            {showRightPanel ? (
                <div className="h-content-container flex justify-start w-96 bg-white border-l border-gray-100">
                    {settings.isShowHelpDrawer ? (
                        <HelpDrawer onClickClose={() => settings.setIsShowHelpDrawer(false)} schema={props.schema} />
                    ) : null}
                    {settings.isShowSettingsDrawer ? (
                        <AppSettings onClickClose={() => settings.setIsShowSettingsDrawer(false)} />
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};
