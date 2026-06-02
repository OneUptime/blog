# Validation Summary: How to Set Up OpenSearch Index State Management (ISM)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon OpenSearch Service
- OpenSearch Index State Management (ISM)
- OpenSearch index templates and rollover aliases
- UltraWarm and cold storage
- Snapshot repositories
- curl
- JSON

## Sources Consulted
- Amazon OpenSearch Service: Index State Management in Amazon OpenSearch Service: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ism.html
- Amazon OpenSearch Service: UltraWarm storage for Amazon OpenSearch Service: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ultrawarm.html
- Amazon OpenSearch Service: Cold storage for Amazon OpenSearch Service: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/cold-storage.html
- OpenSearch Documentation: Index State Management policies: https://docs.opensearch.org/latest/im-plugin/ism/policies/
- OpenSearch Documentation: ISM API: https://docs.opensearch.org/latest/im-plugin/ism/api/

## Issues Found
- Corrected the ISM job cadence from "every 5 minutes by default" to "every 5 to 8 minutes by default on Amazon OpenSearch Service" because AWS documents a 5-minute base interval plus jitter.
- Changed `ism_template` from an array to an object to match current Amazon OpenSearch Service and OpenSearch documentation.
- Changed the Slack notification destination from `custom_webhook` to `slack` because the example uses a Slack webhook URL and the ISM notification action has a dedicated Slack destination.
- Removed an extra `force_merge` action after `warm_migration` in the UltraWarm policy example. Amazon OpenSearch Service performs force merge as part of UltraWarm migration, and the AWS ISM sample uses `warm_migration` without a separate `force_merge` action.
- Clarified that cold indexes must be attached to UltraWarm nodes before querying, matching Amazon OpenSearch Service cold storage behavior.
- Changed the snapshot template variable from `{{ctx.index_uuid}}` to `{{ctx.indexUuid}}`, which is the documented variable format for ISM snapshot names.
- Updated the manual retry example to include the JSON body with the target state, following the OpenSearch ISM Retry failed index API example.
- Adjusted the retry explanation to avoid implying every failed action automatically retries without an explicit action retry configuration.

## Review Notes
The corrected JSON payloads were syntax-checked locally. The examples still assume the caller has appropriate Amazon OpenSearch Service authentication, fine-grained access permissions where enabled, a registered snapshot repository for snapshot actions, and UltraWarm/cold storage enabled before using tier migration actions.
