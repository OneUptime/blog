# Validation Summary: Why Are OpenSearch Logs Visible in Discover but Missing from Observability? Fixing Data Source and Field Mapping

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenSearch REST APIs
- OpenSearch indexes, aliases, data streams, mappings, and reindexing
- OpenSearch Dashboards 3.5+ Discover Logs
- OpenSearch Dashboards workspaces, data sources, and datasets
- OpenSearch Dashboards Security multi-tenancy
- OpenSearch trace-to-log correlations
- OpenTelemetry and Elastic Common Schema (ECS) log fields
- Piped Processing Language (PPL)

## Sources Consulted
- OpenSearch datasets: https://docs.opensearch.org/latest/observing-your-data/exploring-observability-data/datasets/
- OpenSearch Discover Logs: https://docs.opensearch.org/latest/observing-your-data/exploring-observability-data/discover-logs/
- Using Discover for observability: https://docs.opensearch.org/latest/observing-your-data/exploring-observability-data/index/
- OpenSearch correlations: https://docs.opensearch.org/latest/observing-your-data/exploring-observability-data/correlations/
- OpenSearch Dashboards workspaces: https://docs.opensearch.org/latest/dashboards/workspace/workspace/
- Creating and associating data sources with a workspace: https://docs.opensearch.org/latest/dashboards/workspace/create-workspace/
- Managing workspace data-source associations: https://docs.opensearch.org/latest/dashboards/workspace/manage-workspace/
- OpenSearch Dashboards multiple data sources and the local-cluster option: https://docs.opensearch.org/latest/dashboards/management/multi-data-sources/
- OpenSearch Resolve Index API: https://docs.opensearch.org/latest/api-reference/index-apis/resolve-index/
- OpenSearch Search API: https://docs.opensearch.org/latest/api-reference/search-apis/search/
- OpenSearch Field Capabilities API: https://docs.opensearch.org/latest/api-reference/search-apis/field-caps/
- OpenSearch Get Index Settings API: https://docs.opensearch.org/latest/api-reference/index-apis/get-settings/
- OpenSearch Create or Update Index Mappings API: https://docs.opensearch.org/latest/api-reference/index-apis/put-mapping/
- OpenSearch Reindex Documents API: https://docs.opensearch.org/latest/api-reference/document-apis/reindex/
- OpenSearch keyword field type: https://docs.opensearch.org/latest/mappings/supported-field-types/keyword/
- OpenSearch `date_nanos` field type: https://docs.opensearch.org/latest/field-types/supported-field-types/date-nanos/
- OpenSearch Dashboards 3.5 field-type normalization for `date` and `date_nanos`: https://github.com/opensearch-project/OpenSearch-Dashboards/blob/3.5.0/src/plugins/data/common/osd_field_types/osd_field_types_factory.ts#L71-L76
- OpenSearch Dashboards 3.5 field-capabilities conversion: https://github.com/opensearch-project/OpenSearch-Dashboards/blob/3.5.0/src/plugins/data/server/index_patterns/fetcher/lib/field_capabilities/field_caps_response.ts#L158-L165
- OpenSearch Dashboards 3.3 feature-flag configuration: https://github.com/opensearch-project/OpenSearch-Dashboards/blob/3.3.0/config/opensearch_dashboards.yml#L386-L409
- OpenSearch Dashboards 3.3 and 3.4 release notes: https://github.com/opensearch-project/OpenSearch-Dashboards/blob/main/release-notes/opensearch-dashboards.release-notes-3.3.0.md and https://github.com/opensearch-project/OpenSearch-Dashboards/blob/main/release-notes/opensearch-dashboards.release-notes-3.4.0.md
- OpenTelemetry Logs Data Model: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry trace context in non-OTLP log formats: https://opentelemetry.io/docs/specs/otel/compatibility/logging_trace_context/
- Elastic Common Schema tracing and service fields: https://www.elastic.co/docs/reference/ecs/ecs-tracing and https://www.elastic.co/docs/reference/ecs/ecs-service

## Issues Found
- The post referred generally to OpenSearch 3.5 even though Discover Logs, datasets, workspaces, and the listed feature flags are OpenSearch Dashboards features. Changed the version wording to OpenSearch Dashboards 3.5.
- The `_field_caps` request omitted most of the OTel and ECS field-name alternatives listed later in the post, so those fields could not appear in its response. Expanded the request to include all of the listed timestamp, trace ID, span ID, and service-name candidates.
- The time-field check accepted only `date`. OpenSearch Dashboards normalizes both `date` and `date_nanos` as date fields for the selector, so the post now accepts either mapping.
- The mapping guidance did not state that OpenSearch rejects an in-place field type change, and it presented an upstream pipeline fix as an alternative for an index already mapped incorrectly. Clarified that existing documents must be reindexed into a correctly mapped destination and that future documents must be written to a new correctly mapped index after fixing the template or pipeline.
- The five-setting configuration block was described as required by the Logs page alone. Official Discover Logs documentation lists three direct flags; dataset management and trace correlation account for the other two. Reworded the claim to apply the five flags to the complete workflow described in the post.
- The data-source instructions assumed every source was a saved connection associated with the workspace. Added the distinct local-cluster path, which does not require a saved data-source association.
- The Resolve Index API does not return index UUIDs. Kept the UUID comparison advice but added a valid Get Index Settings request to retrieve the UUID after resolving the concrete index.
- The correlation section covered schema mappings but omitted the separate correlation object that links a trace dataset to one or more logs datasets. Added the official **Correlated datasets > Configure correlation** step, stated the minimum Trace ID mapping, and updated the decision tree.
- The older-version caveat incorrectly said that the listed feature flags did not exist before 3.5. Workspaces and experimental Explore/dataset flags existed earlier, while the current documentation labels the specialized dataset-based Discover interfaces as introduced in 3.5. Replaced the categorical statement with version-matched guidance.

## Review Notes
- The Resolve Index, Search, Field Capabilities, and Get Index Settings requests use valid, current OpenSearch APIs and syntax.
- Classic Discover uses index patterns, while the specialized Discover Logs page uses logs datasets in an Observability workspace.
- The five configuration keys and `opensearch_security.multitenancy.enabled: false` are valid. Disabling Security multi-tenancy remains a deployment-impacting change that should be planned and tested.
- The OTel and ECS field examples are valid common representations. Trace IDs should use a non-analyzed exact-value mapping such as `keyword` for reliable equality matching.
- All links in the post resolved to the intended official documentation; the general Discover-for-observability link uses a working redirect to its canonical `index/` page.
