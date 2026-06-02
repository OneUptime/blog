# Validation Summary: How to Set Up IoT Core Fleet Indexing for Device Search

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IoT Core
- AWS IoT Device Management Fleet Indexing
- AWS IoT Device Shadows
- AWS IoT Thing Groups and dynamic thing groups
- AWS IoT Device Defender
- AWS CLI
- Bash

## Sources Consulted
- AWS IoT Core Developer Guide: Fleet indexing: https://docs.aws.amazon.com/iot/latest/developerguide/iot-indexing.html
- AWS IoT Core Developer Guide: Manage thing indexing: https://docs.aws.amazon.com/iot/latest/developerguide/managing-index.html
- AWS IoT Core Developer Guide: Managing fleet indexing: https://docs.aws.amazon.com/iot/latest/developerguide/managing-fleet-index.html
- AWS IoT Core Developer Guide: Query syntax: https://docs.aws.amazon.com/iot/latest/developerguide/query-syntax.html
- AWS IoT Core Developer Guide: Querying for aggregate data: https://docs.aws.amazon.com/iot/latest/developerguide/index-aggregate.html
- AWS IoT API Reference: ThingIndexingConfiguration: https://docs.aws.amazon.com/iot/latest/apireference/API_ThingIndexingConfiguration.html
- AWS CLI Command Reference: update-indexing-configuration: https://docs.aws.amazon.com/cli/latest/reference/iot/update-indexing-configuration.html
- AWS CLI Command Reference: get-cardinality: https://docs.aws.amazon.com/cli/latest/reference/iot/get-cardinality.html
- AWS IoT Device Management endpoints and quotas: https://docs.aws.amazon.com/general/latest/gr/iot_device_management.html
- AWS IoT Device Management Pricing: https://aws.amazon.com/iot-device-management/pricing/

## Issues Found
- The initial `update-indexing-configuration` example put ordinary shadow fields in `managedFields`. AWS managed fields are predefined by AWS IoT and cannot be modified by updating fleet indexing configuration. Moved those fields to `customFields`.
- The configuration enabled named shadow indexing without specifying a named shadow filter. AWS requires named shadows to be listed in `filter.namedShadowNames` when named shadow indexing is enabled. Added a `filter` example.
- The custom field example exceeded the default AWS things index custom field quota after moving shadow fields into `customFields`. Removed unused custom attributes so the example stays within the default quota.
- The "connected in the last hour" query used an invalid range expression with `> [...]`. Changed it to compare `connectivity.timestamp` directly with an epoch-milliseconds value.
- The dashboard queried `numberOfThings` from `get-cardinality`, but the CLI returns `cardinality`. Updated the JMESPath queries.
- The cost section described indexing as charged per thing-month. AWS pricing currently describes Fleet Indexing charges in terms of index updates and queries. Updated the wording.
- The limits section said the maximum custom fields value was 100 and that aggregation queries were limited to 500 buckets. Current AWS quotas list 5 custom fields in the AWS things index by default and 12 query terms per query. Updated the limits.

## Review Notes
The AWS CLI was not installed in the local environment, so command behavior was verified against official AWS CLI documentation rather than local `--help` output.
