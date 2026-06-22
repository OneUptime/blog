# Validation Summary: How to Manage Elasticsearch Index Lifecycle

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch
- Index Lifecycle Management (ILM)
- Data streams
- Rollover API
- Index templates
- Searchable snapshots

## Sources Consulted
- Elastic Docs: Index lifecycle management in Elasticsearch: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management
- Elastic Docs: Index lifecycle management phases and actions: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/index-lifecycle
- Elastic Docs: Rollover ILM action: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Elastic Docs: Allocate ILM action: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-allocate
- Elastic Docs: Set up a data stream: https://www.elastic.co/docs/manage-data/data-store/data-streams/set-up-data-stream
- Elastic API Docs: Roll over to a new index: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-rollover
- Elastic Docs: Apply an index lifecycle policy to an existing Elasticsearch index: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/policy-apply
- Elastic API Docs: Explain the lifecycle state: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-explain-lifecycle
- Elastic API Docs: Get the ILM status: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-get-status
- Elastic API Docs: Retry a policy: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-retry

## Issues Found
- The manual rollover example targeted `logs-000001` directly and used the deprecated `max_size` rollover condition. The rollover API rolls over a data stream or index alias, and current docs recommend `max_primary_shard_size` instead of `max_size`. Changed the target to `logs` and the condition to `max_primary_shard_size`.
- The cold phase example used a `freeze` ILM action. Current ILM phase/action documentation no longer lists `freeze` as an available ILM action. Replaced it with the supported `readonly` action for the cold phase.
- The existing-index example applied `logs_policy`, which includes rollover, directly to an existing index. Elastic warns not to manually apply policies with rollover because the policy is not carried forward when rollover creates a new index. Changed the example to use a non-rollover `retention_policy` and added a short note.
- The data stream best-practice comment said data streams automatically manage rollover. Data streams support backing-index rollover, but ILM or data stream lifecycle is what automates lifecycle behavior. Clarified the comment to say data streams work with ILM to manage rollover.

## Review Notes
The examples using `allocate.require.data` are syntactically valid when nodes are configured with matching custom node attributes, but modern deployments commonly use Elasticsearch data tiers and the ILM `migrate` action or `_tier_preference` settings. This is a future improvement rather than a correctness blocker.
