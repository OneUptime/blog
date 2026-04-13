# Validation Summary: How to Use Atlas Billing and Cost Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB Atlas (billing, cost management, cluster operations)
- MongoDB Atlas Admin API v2 (invoices, alert configurations, process measurements)
- MongoDB Atlas CLI (`atlas clusters pause`)
- GitHub Actions (scheduled workflow for cluster automation)
- jq (JSON processing)

## Sources Consulted
- MongoDB Atlas Admin API v2 OpenAPI specification: https://github.com/mongodb/openapi
- Atlas Admin API v2 documentation: https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/
- Atlas process measurements endpoint: https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-getgroupprocessmeasurements
- Atlas pause/resume cluster documentation: https://www.mongodb.com/docs/atlas/pause-terminate-cluster/
- Atlas CLI reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-api-alertconfigurations/

## Issues Found

1. **Incorrect metrics endpoint URL**: The post used `/api/atlas/v2/groups/{groupId}/clusters/my-cluster/metrics/measurements` which does not exist in the Atlas API v2. Measurements are available at the process level only via `/api/atlas/v2/groups/{groupId}/processes/{processId}/measurements`. Fixed by replacing with a two-step example: first list processes to find the process ID, then query measurements for that process.

2. **Invalid metric names**: `SYSTEM_CPU_PERCENT` and `SYSTEM_MEMORY_PERCENT` are not valid Atlas measurement metric names. Replaced with `PROCESS_CPU_USER` and `SYSTEM_MEMORY_USED`, which are valid process-level measurement metrics per the Atlas API v2 spec.

3. **Non-existent billing alert event type**: `CREDIT_CARD_CURRENT_BILL_THRESHOLD_EXCEEDED` does not exist as an alertable event type in the Atlas API v2. Replaced with `PENDING_INVOICE_OVER_THRESHOLD`, which is a valid billing threshold alert type.

4. **Incorrect alert threshold units**: The `units` field was set to `RAW_COUNT`, but the valid value for billing threshold alerts is `RAW`. Fixed accordingly.

5. **Wrong alert config endpoint scope**: The alert configuration was posted to `/api/atlas/v2/orgs/{orgId}/alertConfigs`, but this org-level endpoint does not exist. Alert configurations in Atlas API v2 are at the project/group level: `/api/atlas/v2/groups/{groupId}/alertConfigs`. Fixed the endpoint path.

6. **Incorrect cluster pause tier range**: The comment stated "M10-M40 only", implying M50+ clusters cannot be paused. In reality, all M10+ dedicated clusters can be paused (not just up to M40). Fixed to "M10+ dedicated clusters only".

## Review Notes
- The billing components section lists Atlas App Services, which was deprecated in September 2024 and sunset in September 2025. Since this post is dated March 2026, this reference is outdated. However, it may still appear on historical invoices, so it was left in place. A future update could remove or annotate it.
- The invoice API examples (listing invoices, getting line items, pending invoice breakdown) use correct endpoint patterns and response field names.
- The GitHub Actions workflow YAML is syntactically correct and uses the proper Atlas CLI environment variables for authentication.
