/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState, useCallback, useEffect, Fragment, useMemo } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiSpacer,
  EuiCompressedFieldSearch,
  EuiCompressedSelect,
  EuiSelectOption,
  EuiPageContent,
} from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { fieldWildcardMatcher } from '../../../../../opensearch_dashboards_utils/public';
import {
  IndexPattern,
  IndexPatternField,
  UI_SETTINGS,
  DataPublicPluginStart,
} from '../../../../../../plugins/data/public';
import { useOpenSearchDashboards } from '../../../../../opensearch_dashboards_react/public';
import { IndexPatternManagmentContext } from '../../../types';
import { createEditIndexPatternPageStateContainer } from '../edit_index_pattern_state_container';
import { TAB_INDEXED_FIELDS, TAB_SCRIPTED_FIELDS, TAB_SOURCE_FILTERS } from '../constants';
import { SourceFiltersTable } from '../source_filters_table';
import { IndexedFieldsTable } from '../indexed_fields_table';
import { ScriptedFieldsTable } from '../scripted_fields_table';
import { getTabs, getPath, convertToEuiSelectOption } from './utils';

interface TabsProps extends Pick<RouteComponentProps, 'history' | 'location'> {
  indexPattern: IndexPattern;
  fields: IndexPatternField[];
  saveIndexPattern: DataPublicPluginStart['indexPatterns']['updateSavedObject'];
}

const searchAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.searchAria',
  {
    defaultMessage: 'Search fields',
  }
);

const filterAriaLabel = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.filterAria',
  {
    defaultMessage: 'Filter field types',
  }
);

const filterPlaceholder = i18n.translate(
  'indexPatternManagement.editIndexPattern.fields.filterPlaceholder',
  {
    defaultMessage: 'Search',
  }
);

export function Tabs({ indexPattern, saveIndexPattern, fields, history, location }: TabsProps) {
  const { uiSettings, indexPatternManagementStart, docLinks } = useOpenSearchDashboards<
    IndexPatternManagmentContext
  >().services;
  const [fieldFilter, setFieldFilter] = useState<string>('');
  const [indexedFieldTypeFilter, setIndexedFieldTypeFilter] = useState<string>('');
  const [scriptedFieldLanguageFilter, setScriptedFieldLanguageFilter] = useState<string>('');
  const [indexedFieldTypes, setIndexedFieldType] = useState<EuiSelectOption[]>([]);
  const [scriptedFieldLanguages, setScriptedFieldLanguages] = useState<EuiSelectOption[]>([]);
  const [syncingStateFunc, setSyncingStateFunc] = useState<any>({
    getCurrentTab: () => TAB_INDEXED_FIELDS,
  });

  const refreshFilters = useCallback(() => {
    const tempIndexedFieldTypes: string[] = [];
    const tempScriptedFieldLanguages: string[] = [];
    indexPattern.fields.getAll().forEach((field) => {
      if (field.scripted) {
        if (field.lang) {
          tempScriptedFieldLanguages.push(field.lang);
        }
      } else {
        tempIndexedFieldTypes.push(field.type);
      }
    });

    setIndexedFieldType(convertToEuiSelectOption(tempIndexedFieldTypes, 'indexedFiledTypes'));
    setScriptedFieldLanguages(
      convertToEuiSelectOption(tempScriptedFieldLanguages, 'scriptedFieldLanguages')
    );
  }, [indexPattern]);

  useEffect(() => {
    refreshFilters();
  }, [indexPattern, indexPattern.fields, refreshFilters]);

  const fieldWildcardMatcherDecorated = useCallback(
    (filters: string[]) => fieldWildcardMatcher(filters, uiSettings.get(UI_SETTINGS.META_FIELDS)),
    [uiSettings]
  );

  const useUpdatedUX = uiSettings.get('home:useNewHomePage');

  const getFilterSection = useCallback(
    (type: string) => {
      return (
        <EuiFlexGroup>
          <EuiFlexItem grow={true}>
            <EuiCompressedFieldSearch
              fullWidth
              placeholder={filterPlaceholder}
              value={fieldFilter}
              onChange={(e) => setFieldFilter(e.target.value)}
              data-test-subj="indexPatternFieldFilter"
              aria-label={searchAriaLabel}
            />
          </EuiFlexItem>
          {type === TAB_INDEXED_FIELDS && indexedFieldTypes.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiCompressedSelect
                options={indexedFieldTypes}
                value={indexedFieldTypeFilter}
                onChange={(e) => setIndexedFieldTypeFilter(e.target.value)}
                data-test-subj="indexedFieldTypeFilterDropdown"
                aria-label={filterAriaLabel}
              />
            </EuiFlexItem>
          )}
          {type === TAB_SCRIPTED_FIELDS && scriptedFieldLanguages.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiCompressedSelect
                options={scriptedFieldLanguages}
                value={scriptedFieldLanguageFilter}
                onChange={(e) => setScriptedFieldLanguageFilter(e.target.value)}
                data-test-subj="scriptedFieldLanguageFilterDropdown"
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    },
    [
      fieldFilter,
      indexedFieldTypeFilter,
      indexedFieldTypes,
      scriptedFieldLanguageFilter,
      scriptedFieldLanguages,
    ]
  );

  const getContent = useCallback(
    (type: string) => {
      const Wrapper = useUpdatedUX ? EuiPageContent : Fragment;
      switch (type) {
        case TAB_INDEXED_FIELDS:
          return (
            <>
              {useUpdatedUX && <EuiSpacer size="m" />}
              <Wrapper {...(useUpdatedUX ? { paddingSize: 'm' } : {})}>
                <EuiSpacer size="m" />
                {getFilterSection(type)}
                <EuiSpacer size="m" />
                <IndexedFieldsTable
                  fields={fields}
                  indexPattern={indexPattern}
                  fieldFilter={fieldFilter}
                  fieldWildcardMatcher={fieldWildcardMatcherDecorated}
                  indexedFieldTypeFilter={indexedFieldTypeFilter}
                  helpers={{
                    redirectToRoute: (field: IndexPatternField) => {
                      history.push(getPath(field, indexPattern));
                    },
                    getFieldInfo: indexPatternManagementStart.list.getFieldInfo,
                  }}
                />
              </Wrapper>
            </>
          );
        case TAB_SCRIPTED_FIELDS:
          return (
            <>
              {useUpdatedUX && <EuiSpacer size="m" />}
              <Wrapper {...(useUpdatedUX ? { paddingSize: 'm' } : {})}>
                <EuiSpacer size="m" />
                {getFilterSection(type)}
                <EuiSpacer size="m" />
                <ScriptedFieldsTable
                  indexPattern={indexPattern}
                  saveIndexPattern={saveIndexPattern}
                  fieldFilter={fieldFilter}
                  scriptedFieldLanguageFilter={scriptedFieldLanguageFilter}
                  helpers={{
                    redirectToRoute: (field: IndexPatternField) => {
                      history.push(getPath(field, indexPattern));
                    },
                  }}
                  onRemoveField={refreshFilters}
                  painlessDocLink={docLinks.links.noDocumentation.scriptedFields.painless}
                  useUpdatedUX={useUpdatedUX}
                />
              </Wrapper>
            </>
          );
        case TAB_SOURCE_FILTERS:
          return (
            <>
              {useUpdatedUX && <EuiSpacer size="m" />}
              <Wrapper {...(useUpdatedUX ? { paddingSize: 'm' } : {})}>
                <EuiSpacer size="m" />
                {getFilterSection(type)}
                <EuiSpacer size="m" />
                <SourceFiltersTable
                  useUpdatedUX={useUpdatedUX}
                  saveIndexPattern={saveIndexPattern}
                  indexPattern={indexPattern}
                  filterFilter={fieldFilter}
                  fieldWildcardMatcher={fieldWildcardMatcherDecorated}
                  onAddOrRemoveFilter={refreshFilters}
                />
              </Wrapper>
            </>
          );
      }
    },
    [
      docLinks.links.noDocumentation.scriptedFields.painless,
      fieldFilter,
      fieldWildcardMatcherDecorated,
      fields,
      getFilterSection,
      history,
      indexPattern,
      indexPatternManagementStart.list.getFieldInfo,
      indexedFieldTypeFilter,
      refreshFilters,
      scriptedFieldLanguageFilter,
      saveIndexPattern,
      useUpdatedUX,
    ]
  );

  const euiTabs: EuiTabbedContentTab[] = useMemo(
    () =>
      getTabs(indexPattern, fieldFilter, indexPatternManagementStart.list).map(
        (tab: Pick<EuiTabbedContentTab, 'name' | 'id'>) => {
          return {
            ...tab,
            content: getContent(tab.id),
          };
        }
      ),
    [fieldFilter, getContent, indexPattern, indexPatternManagementStart.list]
  );

  const [selectedTabId, setSelectedTabId] = useState(euiTabs[0].id);

  useEffect(() => {
    const {
      startSyncingState,
      stopSyncingState,
      setCurrentTab,
      getCurrentTab,
    } = createEditIndexPatternPageStateContainer({
      useHashedUrl: uiSettings.get('state:storeInSessionStorage'),
      defaultTab: TAB_INDEXED_FIELDS,
    });

    startSyncingState();
    setSyncingStateFunc({
      setCurrentTab,
      getCurrentTab,
    });
    setSelectedTabId(getCurrentTab());

    return () => {
      stopSyncingState();
    };
  }, [uiSettings]);

  return (
    <EuiTabbedContent
      tabs={euiTabs}
      selectedTab={euiTabs.find((tab) => tab.id === selectedTabId)}
      onTabClick={(tab) => {
        setSelectedTabId(tab.id);
        syncingStateFunc.setCurrentTab(tab.id);
      }}
      size="s"
    />
  );
}
