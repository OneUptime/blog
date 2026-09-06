# How to Create an Authenticated API Monitor in OneUptime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, API Monitoring, Authentication, Monitoring, REST API

Description: Create a OneUptime API monitor with secret-backed authentication headers, JSON response assertions, and failure-safe criteria.

---

An authenticated health check should prove more than reachability without turning the monitoring system into a credential leak. OneUptime API monitors support custom methods, headers, JSON bodies, monitor secrets, response criteria, and optional mutual TLS.

This walkthrough follows the OneUptime 12.0.33 monitor behavior.

## Create a least-privilege target credential

Ask the monitored service for a dedicated read-only credential that can access only its health or diagnostic endpoint. It should not be a developer's token and should not mutate data. Prefer a short, structured response such as:

```json
{
  "status": "ok",
  "database": "connected",
  "version": "2026.09.1"
}
```

Do not return internal secrets, stack traces, or customer data from a health endpoint.

## Store the credential as a monitor secret

Open the project's monitor-secret settings and create a secret such as `HealthApiToken`. Grant the new API monitor access to that secret. Access is explicit, so creating a project secret does not automatically expose it to every monitor.

Reference the secret in a header rather than pasting its value:

```text
Authorization: Bearer {{monitorSecrets.HealthApiToken}}
Accept: application/json
```

OneUptime resolves monitor secrets server-side and does not render the value in the dashboard. Keep tokens out of monitor names, descriptions, URLs, query parameters, and criteria.

## Create the request step

In **Monitors**, choose **Create Monitor**, select **API**, and configure:

```text
URL: https://api.example.com/v1/health
Method: GET
Follow redirects: yes
Allow self-signed certificates: no
```

If authentication is bound to one hostname, consider disabling redirects or asserting the final behavior carefully. A redirect to a different host can change where credentials travel, depending on client policy. Test it explicitly.

For POST, PUT, or PATCH checks, OneUptime supports a JSON request body and secrets inside it. Use a non-mutating diagnostic operation. Never run a production write merely to determine uptime.

If the service requires mutual TLS, enable the API monitor's client-certificate option and provide the certificate, private key, and optional passphrase through monitor secrets. Use a dedicated client identity and plan certificate rotation.

## Add layered criteria

Create one Online criterion that requires all filters to match. Start with a JavaScript Expression filter for the HTTP status:

```javascript
{{responseStatusCode}} === 200
```

In the same criterion, add a second JavaScript Expression filter to verify the parsed JSON contract:

```javascript
"{{responseBody.status}}" === "ok" &&
"{{responseBody.database}}" === "connected"
```

For API and Website criteria, OneUptime exposes `responseBody`, `responseHeaders`, `responseStatusCode`, and `responseTimeInMs`. Write a JavaScript expression that returns a boolean. In version 12.0.33, the evaluator uses the sandbox’s default five-second timeout; an error or timeout leaves the filter unmatched. Keep it deterministic and small.

API criteria are evaluated in order, and the first match wins. Replace any broader Online criterion that would accept a 200 response alone. After the combined Online criterion, add an Offline criterion with the JavaScript expression `true` as a catch-all, and configure its alert or incident actions. This gives failed status checks, unhealthy JSON, and expression errors an explicit failure path.

You can also use built-in status, response-time, body, and header criteria. Built-ins are easier for another operator to review; use JavaScript only when the JSON relationship needs it.

## Decide how much evidence is enough

A single failure gives fast detection but can page on a transient network event. OneUptime can evaluate supported metric filters, such as response status code, response time, and Is Online, over a period of past checks. The JavaScript expressions above evaluate the current response, not a history of expression results. `Any Value` reacts to one breach, while `All Values` waits until the configured window is covered and all samples match. Choose `If No Data` deliberately for those filters; it controls missing history when evaluation runs and does not itself schedule an evaluation when checks stop arriving.

For a critical health API, a common pattern is a short interval, limited retries, and a small sustained-failure window. Measure the resulting time to detect and align it with the service objective.

## Test failure modes safely

Before enabling production notifications, use a staging endpoint or a controlled feature flag to test:

1. valid token and healthy JSON
2. invalid token returning 401 or 403
3. status 200 with unhealthy JSON
4. timeout
5. invalid or expired TLS certificate
6. malformed response body

Confirm each result maps to the intended monitor status and that alert recovery works. Review logs for accidental header or body disclosure. Rotate the test token if it was exposed during debugging.

## Conclusion

An effective authenticated API monitor uses a dedicated credential, a monitor-secret reference, strict TLS, and separate transport and JSON checks. Validate denial, timeout, and unhealthy-body paths before connecting the monitor to production paging.

## Official Documentation

- [OneUptime API monitors](https://oneuptime.com/docs/en/monitor/api-monitor)
- [OneUptime monitor secrets](https://oneuptime.com/docs/en/monitor/monitor-secrets)
- [OneUptime JavaScript expression criteria](https://oneuptime.com/docs/en/monitor/javascript-expression)
