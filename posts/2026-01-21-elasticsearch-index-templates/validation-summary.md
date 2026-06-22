# Validation Summary: How to Implement Index Templates in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch
- Composable index templates
- Component templates
- Dynamic templates
- Data streams
- Index Lifecycle Management (ILM)
- Rollover aliases
- Elasticsearch REST APIs
- curl

## Sources Consulted
- Elastic Docs: Create or update an index template API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-index-template
- Elastic Docs: Create or update a component template API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-component-template
- Elastic Docs: Templates - https://www.elastic.co/docs/manage-data/data-store/templates
- Elastic Docs: Dynamic templates - https://www.elastic.co/docs/manage-data/data-store/mapping/dynamic-templates
- Elastic Docs: Set up a data stream - https://www.elastic.co/docs/manage-data/data-store/data-streams/set-up-data-stream
- Elastic Docs: Create an index lifecycle management policy in Elasticsearch - https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/configure-lifecycle-policy
- Elastic Docs: Fix index lifecycle management errors - https://www.elastic.co/docs/troubleshoot/elasticsearch/index-lifecycle-management-errors
- Elastic Docs: Simulate an index API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-simulate-index-template
- Elastic Docs: Create or update a legacy index template API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-template

## Issues Found
- The dynamic templates example placed a broad `strings_as_keywords` rule before more specific string rules. Elastic processes dynamic templates in order and the first matching template wins, so fields ending in `_text`, `_ip`, or `_location` would have been mapped as `keyword` before their specific rules could apply. Reordered the dynamic templates so specific string rules run before the catch-all string rule, and added `match_mapping_type: "string"` to the IP and geo-point name-based rules.
- The alias-based ILM template configured the rollover alias in the index template's `aliases` section. Elastic documents that the rollover alias should be configured once when bootstrapping the initial index and should not be explicitly configured as the same alias in the index template. Removed the duplicate alias from the index template while keeping the bootstrap index alias.
- The production example referenced the `logs-policy` ILM policy, which includes a rollover action, but did not configure `index.lifecycle.rollover_alias`. Added the `logs-prod` rollover alias setting, removed the conflicting template alias, and added a bootstrap command for the initial production write index.
- The template priority wording could imply that multiple matching composable templates are merged. Updated the wording to clarify that the highest-priority matching composable template is the single template applied.

## Review Notes
The remaining index template, component template, data stream, ILM policy, simulate API, list/get/delete API, mapping type, and curl examples are consistent with current Elastic documentation for Elasticsearch composable index templates. All embedded curl JSON payloads were parsed locally with `python3` after the edits.
