# Validation Summary: How to Configure App Health Checks in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (deployment annotations)
- Node.js / Express
- Python / Flask

## Sources Consulted
- Dapr official documentation: App health checks — https://docs.dapr.io/operations/observability/app-health/
- Dapr official documentation: Kubernetes annotations reference — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr official documentation: Configuration schema — https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr official documentation: daprd CLI reference

## Issues Found

### 1. Incorrect default probe interval
- **What was wrong:** The post stated the default `app-health-probe-interval` is 10 seconds. The official Dapr documentation specifies the default is 5 seconds.
- **What was changed:** Updated the default value from 10 to 5 in the annotation description, and changed the example YAML annotation value from `"10"` to `"5"`.

### 2. Incorrect probe timeout unit and value
- **What was wrong:** The post described `app-health-probe-timeout` as "Seconds to wait for a health response" and used a value of `"5"` in the example. The official Dapr documentation specifies this value is in **milliseconds**, with a default of 500ms.
- **What was changed:** Updated the description to say "Milliseconds to wait" with a default of 500, and changed the example YAML annotation value from `"5"` to `"500"`.

### 3. Fabricated Configuration resource (`appHealthCheck`)
- **What was wrong:** The post included a Dapr Configuration resource YAML with a `spec.appHealthCheck` section. This field does not exist in the Dapr Configuration schema. App health checks are configured exclusively via Kubernetes annotations or `daprd` CLI flags, not through a Configuration resource.
- **What was changed:** Replaced the entire "Configuring via the App Health Check API" section with a "Configuring via CLI Flags" section showing the correct `daprd` CLI flags for self-hosted mode.

### 4. "Non-200" vs "non-2xx" health status
- **What was wrong:** The post stated that a "non-200 status" triggers an unhealthy state. The official documentation specifies that any HTTP status code in the 200-299 range is considered healthy, not just exactly 200.
- **What was changed:** Updated the wording from "non-200 status" to "status code outside the 200-299 range".

### 5. Incomplete list of unhealthy behaviors
- **What was wrong:** The post only mentioned that Dapr stops service invocations and pub/sub deliveries when the app is unhealthy. The official documentation states that Dapr also stops input bindings and unregisters actor types.
- **What was changed:** Added input bindings and actor type deregistration to the list of actions Dapr takes when the app is marked unhealthy.

## Review Notes
- The JavaScript code example references a `checkDatabase()` function that is not defined. This is acceptable as illustrative pseudocode, but readers may be confused. Similarly, the Python example references `db.ping()` without importing or defining `db`. Both are common patterns in tutorial snippets and are left as-is.
- The log message examples in the "Observing Health Check Events" section are approximate representations of actual Dapr sidecar log output. The exact wording may vary by Dapr version.
- The post's default threshold value of 3 is correct per official documentation.
