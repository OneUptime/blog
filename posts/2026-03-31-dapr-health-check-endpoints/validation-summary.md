# Validation Summary: How to Set Up Dapr Health Check Endpoints

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar health API, metadata API)
- Kubernetes (Deployment, liveness/readiness probes, annotations)
- Python (requests library for health polling)
- JavaScript/Node.js (Express health endpoint with fetch)
- Bash (curl for metadata inspection)

## Sources Consulted
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr troubleshooting/common issues: https://docs.dapr.io/operations/troubleshooting/common_issues/

## Issues Found

1. **Incorrect HTTP status code for `/v1.0/healthz/outbound` in prose (line 61)**: The text stated the outbound endpoint "returns HTTP 200" when healthy. Per the official Dapr Health API docs, both `/v1.0/healthz` and `/v1.0/healthz/outbound` return **HTTP 204** when healthy and HTTP 500 when unhealthy. The Python and JavaScript code examples already correctly checked for 204, contradicting their own surrounding prose. Fixed the prose to say HTTP 204.

2. **Misleading description of `/v1.0/healthz/outbound` purpose (line 18, line 49)**: The post described this endpoint as verifying the "sidecar can reach all components" and that it checks components are "accessible" at runtime. Per official docs, this endpoint checks that all components are **initialized** and the Dapr HTTP port is available, but notably does **not** require the app channel to be established. Its primary use case is SDK startup sequencing (e.g., `waitForSidecar`), not runtime connectivity verification. Fixed the table description and the section text.

3. **Fabricated `"status"` field in metadata API response (lines 108-119)**: The JSON example for the `/v1.0/metadata` response included a `"status": "OK"` field on component objects. The official Dapr Metadata API documentation shows component objects contain only `name`, `type`, `version`, and `capabilities` — there is no `status` field. Removed the fabricated field.

4. **Kubernetes probes configured on the wrong container (lines 25-43)**: The YAML example showed a liveness probe added manually to the **app container** targeting port 3500. In practice, Dapr's sidecar injector automatically adds liveness and readiness probes to the **daprd sidecar container**. Users customize these via Dapr annotations (e.g., `dapr.io/sidecar-liveness-probe-delay-seconds`), not by manually adding probes to the app container. Replaced the YAML with the correct annotation-based approach.

5. **Readiness probe YAML was also incorrectly framed**: The standalone readiness probe YAML snippet (lines 49-58) implied manual configuration on the app container. Replaced this section with an explanation of the outbound endpoint's purpose and correct HTTP status codes, since readiness probe configuration is already covered via annotations in the updated liveness probe section.

## Review Notes
- The Python and JavaScript code examples correctly check for status code 204, which was consistent with official docs even before the prose fix.
- The `/v1.0/metadata` endpoint response in the blog is a simplified excerpt. The full response includes additional fields like `id`, `activeActorsCount`, `extended`, and `subscriptions` that are not shown. This is acceptable for a focused tutorial.
- The `curl` command piping through `python3 -m json.tool | grep -A 5 "components"` is functional but `grep -A 5` may not capture the full component array if there are multiple components. This is a minor usability concern, not a technical error.
