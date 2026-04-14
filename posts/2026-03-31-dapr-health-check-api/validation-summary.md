# Validation Summary: How to Use Dapr Health Check API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Health Check API (`/v1.0/healthz`, `/v1.0/healthz/outbound`)
- Dapr Metadata API (`/v1.0/metadata`)
- Bash scripting
- Node.js (axios)
- curl

## Sources Consulted
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr sidecar health documentation: https://docs.dapr.io/developing-applications/building-blocks/observability/sidecar-health/
- Dapr Apache Kafka pub/sub component docs: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/

## Issues Found

1. **Incorrect metadata API field name `registeredComponents`**: The blog used `registeredComponents` but the current Dapr metadata API uses `components`. Fixed to `components`.

2. **Incorrect metadata API field name `activeActorsCount`**: The blog used `activeActorsCount` but the current Dapr metadata API uses `actors`. Fixed to `actors`.

3. **Incorrect metadata API field name `extendedMetadata`**: The blog used `extendedMetadata` but the current Dapr metadata API uses `extended`. Fixed to `extended`.

4. **Misleading outbound health check description**: The blog claimed `/v1.0/healthz/outbound` checks live connectivity to state stores, pub/sub brokers, secret stores, and bindings. The official docs state it checks that all components have **initialized** successfully and that the Dapr HTTP port is available — it does not perform live connectivity tests to external backends. Fixed the description to accurately reflect initialization checks.

5. **Incorrect claim about outbound endpoint returning details**: The blog stated "the endpoint returns 500 with details" but the health endpoints return only HTTP status codes (204 or 500) with no response body. Fixed to remove the "with details" claim.

6. **Unverifiable `SUBSCRIBE_WILDCARDS` capability**: The blog showed `"capabilities": ["SUBSCRIBE_WILDCARDS"]` for `pubsub.kafka` in the metadata example response. This capability is not documented anywhere in the official Dapr documentation. Changed to an empty capabilities array to avoid presenting unverifiable information.

## Review Notes
- The old field names (`registeredComponents`, `activeActorsCount`, `extendedMetadata`) appear to be from an older version of the Dapr metadata API. The current API uses `components`, `actors`, and `extended`.
- The bash health check script and JavaScript polling example are both correct in their logic and syntax.
- The axios-based JavaScript example correctly handles the 204 response code and error cases, though the delay only occurs in the catch block — if a non-204 success status were returned, the loop would spin without delay. This is unlikely in practice since Dapr only returns 204 or 500.
- The current metadata API response includes additional fields not shown in the example (e.g., `runtimeVersion`, `httpEndpoints`, `subscriptions`, `appConnectionProperties`), but omitting them in a simplified example is acceptable.
