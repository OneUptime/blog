# Validation Summary: How to Enable API Logging in Dapr for Request Debugging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (annotations, kubectl)
- jq (JSON log filtering)
- gRPC

## Sources Consulted
- Dapr API logging troubleshooting documentation: https://docs.dapr.io/operations/troubleshooting/api-logs-troubleshooting/
- Dapr annotations and arguments reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr CLI `dapr run` reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI `dapr dashboard` reference: https://docs.dapr.io/reference/cli/dapr-dashboard/

## Issues Found

### 1. Incorrect claim about what API logging captures
**What was wrong:** The post listed "HTTP method, URL, and status code," "gRPC method names and status codes," "Request timing information," and "Component name and operation type" as captured fields. Per official Dapr documentation, API logging captures HTTP method and route, gRPC method names (without arguments), app ID, instance name, and user agent — but does NOT document status codes, response timing/duration, or component names in API log output.
**What was changed:** Updated the bullet list to accurately reflect documented fields: HTTP method and route, gRPC method names, app ID and instance information, and user agent details.

### 2. False claim about Dapr Dashboard showing API call history
**What was wrong:** The post included a "Using with Dapr Dashboard" section stating "The Dapr Dashboard also shows recent API calls" and "Navigate to your app to see recent API call history." The Dapr Dashboard displays applications, components, configurations, control plane services, metadata, and logs — but it does NOT provide API call history or API call tracking functionality.
**What was changed:** Removed the entire "Using with Dapr Dashboard" section.

### 3. Inaccurate summary paragraph
**What was wrong:** The summary stated API logging provides visibility into "HTTP method, path, status code, and duration" and recommended combining it with "debug log level." Status code and duration are not documented API log fields, and API logs are emitted at info level (scope `dapr.runtime.http-info`), so debug log level is not required.
**What was changed:** Updated the summary to accurately state API logging provides visibility into "HTTP method and route" and removed the recommendation to use debug log level specifically for API logging.

## Review Notes
- The sample API log output (JSON format) shown in the post includes fields like `status`, `duration`, and `app_id` that are illustrative but do not match the official documented log format. The official sample shows fields: `app_id`, `instance`, `method` (combined HTTP method + route), `scope`, `type`, `useragent`, `ver`. These sample logs were left as-is since they serve an illustrative purpose, but readers should be aware the actual format may differ.
- The `jq` filtering examples that filter on `.status` and `.duration` fields may not work as written if those fields are not present in actual Dapr API log output. These were left in place as they demonstrate useful log filtering patterns, but may need adjustment for real Dapr log formats.
- The `dapr.io/log-as-json` annotation is valid but has no CLI equivalent for `dapr run` — the self-hosted mode section doesn't include it, which is correct.
- The `dapr dashboard` default port of 8080 was verified as correct per official documentation.
- All three Kubernetes annotations (`dapr.io/enable-api-logging`, `dapr.io/log-level`, `dapr.io/log-as-json`) were verified as valid.
- The `--enable-api-logging` flag for `dapr run` was verified as valid.
