# Validation Summary: How to Configure Apigee Target Server Load Balancing Across Multiple Backends

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apigee
- Google Cloud Apigee Management API
- Apigee Target Servers
- Apigee TargetEndpoint XML configuration
- Apigee load balancing and health monitoring
- Apigee analytics and flow variables
- curl
- gcloud authentication

## Sources Consulted
- Google Cloud Apigee: Load balancing across backend servers: https://docs.cloud.google.com/apigee/docs/api-platform/deploy/load-balancing-across-backend-servers
- Google Cloud Apigee REST Resource: organizations.environments.targetservers: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.targetservers
- Google Cloud Apigee Method: organizations.environments.targetservers.update: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.targetservers/update
- Google Cloud Apigee Method: organizations.environments.stats.get: https://docs.cloud.google.com/apigee/docs/reference/apis/apigee/rest/v1/organizations.environments.stats/get
- Google Cloud Apigee Analytics metrics, dimensions, and filters reference: https://docs.cloud.google.com/apigee/docs/api-platform/analytics/analytics-reference
- Google Cloud Apigee Flow variables reference: https://docs.cloud.google.com/apigee/docs/api-platform/reference/variables-reference

## Issues Found
- The XML example placed a comment before the XML declaration, which would make a copied XML file invalid. Moved the XML declaration to the first line of the snippet.
- The health monitor text said to add `HealthMonitor` to `LoadBalancer`; official Apigee configuration places it under `HTTPTargetConnection`. Updated the wording.
- The HTTP health monitor used TLS-enabled target servers but did not tell the monitor to use the target server SSL settings. Added `<UseTargetServerSSLInfo>true</UseTargetServerSSLInfo>`.
- The health monitor explanation implied a single non-200 response immediately removes a server. Updated it to reflect that health monitor failures increment the failure count and removal occurs after `MaxFailures`.
- The fallback server example used an unsupported `isFallback` attribute. Changed it to the documented `<IsFallback>true</IsFallback>` child element.
- The `ServerUnhealthyResponse` comment incorrectly described it as an availability delay. Changed it to explain that the listed response codes count as failures.
- The analytics example queried the `target` dimension, which identifies the target endpoint rather than the backend host. Changed it to `target_host` for backend traffic distribution.
- The Trace note referenced `target.url` as the resolved backend server indicator. Updated it to use the documented `loadbalancing.targetserver` and `target.host` variables.

## Review Notes
The target server examples use the current Apigee v1 Management API and the documented `sSLInfo` JSON field name. The update examples use `PUT`, which is correct and has full-replacement semantics, so callers should include the complete target server resource in the request body.
