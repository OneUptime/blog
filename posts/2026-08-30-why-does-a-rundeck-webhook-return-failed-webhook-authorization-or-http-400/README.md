# Why Does a Rundeck Webhook Return "Failed Webhook Authorization" or HTTP 400?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Webhook, Troubleshooting, Security, JSON

Description: Diagnose Rundeck webhook authorization and bad-request failures by checking the generated URL, optional Authorization header, JSON content type, handler mapping, and execution identity.

---

A Rundeck webhook request passes through four distinct checks: the generated URL token identifies the webhook and authenticates its configured user and roles; that identity must be allowed to `post` to webhooks in the project; optional HTTP Authorization verifies an additional secret; and the configured event plugin parses and handles the payload. A failure at any one of these layers can look like "the token is wrong," but the remedy depends on the response and server log.

## Reproduce with the Smallest Valid Request

Copy the **Post URL** from the webhook's project page and keep it in a secret variable. The webhook token is part of that generated URL; do not substitute a job UUID, webhook database ID, or ordinary API token.

For a Run Job webhook, send valid JSON:

```bash
curl --silent --show-error --fail-with-body \
  --request POST "$RUNDECK_WEBHOOK_URL" \
  --header "Content-Type: application/json" \
  --data '{"probe":"rundeck-webhook-test"}'
```

If **Use Authorization Header** is enabled, add the exact generated value:

```bash
--header "Authorization: $RUNDECK_WEBHOOK_AUTHORIZATION"
```

Do not add a `Bearer` prefix unless it is literally part of the value Rundeck generated. Do not use `X-Rundeck-Auth-Token`; that header authenticates normal API requests and does not replace webhook HTTP Authorization.

Use `curl --verbose` only in a controlled terminal and redact the URL token and headers before sharing output.

## Fix "Failed webhook authorization"

The optional Authorization string is shown only once after the webhook is saved. The sender must reproduce it exactly in the `Authorization` header. Frequent causes are:

- The header is missing.
- A client automatically prepended `Bearer` or `Basic`.
- Whitespace or quoting changed the stored value.
- The webhook's authorization string was regenerated, invalidating the old secret.
- A reverse proxy, ingress, WAF, or redirect stripped `Authorization`.
- The request was sent to a different Rundeck environment with a similar webhook name.

Compare a direct request to Rundeck from a trusted internal host with the request through the proxy. If direct works, inspect proxy header forwarding and redirects. Avoid redirecting webhook POSTs between hosts; clients differ in whether they preserve method, body, and sensitive headers.

If the one-time value was lost, regenerate it, update the sender's secret atomically, and retire the old value. Rundeck does not display the previous secret again.

## Fix HTTP 400 for a Run Job Webhook

The built-in Run Job webhook expects a JSON object. Send syntactically valid JSON and label it with the registered JSON media type:

```text
Content-Type: application/json
```

These requests commonly produce a bad request or handler error:

```text
payload=alert                    # form-encoded, not JSON
{"status":"firing",}           # trailing comma
["firing"]                       # valid JSON, but not a JSON object
```

Validate the exact bytes the monitoring system sends, not a hand-written approximation. If the provider cannot send the expected format, put a small adapter in front that verifies the provider signature, normalizes the event, and forwards JSON.

Next inspect Run Job plugin mappings. Given an argument such as:

```text
-service ${data.labels.service}
```

the payload must contain an object at `labels` with a usable `service` value. A missing or wrongly typed field can cause template substitution to fail or render as `null`; empty or invalid mapped values can then fail option or node-filter validation. Start with a Log Events webhook or a non-mutating diagnostic job to see the real structure, applying care because alert payloads can contain secrets.

The raw payload reference `${raw}` can sidestep field mapping, but it does not make arbitrary JSON safe to interpolate into a shell command. Pass it only to a plain option consumed by a parser, never directly to an unquoted command line.

## Check Webhook State and Identity

Confirm that webhooks are enabled globally and this webhook is enabled. Rundeck webhooks are enabled by default in current releases but can be disabled with:

```properties
rundeck.feature.webhooks.enabled=false
```

The configured webhook user is immutable after creation, and the user must have logged in at least once before being selected. The roles and user attached to the webhook become its execution identity. That identity needs project-scope `post` permission on webhooks, plus ACL permission for the target project, job, and nodes.

The webhook `post` ACL check occurs before the optional HTTP Authorization header is checked; job authorization occurs inside the handler after that header is accepted. Use the response body, `rundeck.webhooks.log`/`rundeck.log`, and execution details to distinguish the failures:

- **You are not authorized to perform this action:** check the webhook identity's project-scope `post` permission on webhooks.
- **Failed webhook authorization:** check the optional header secret and proxy.
- **Job not authorized/not found:** check webhook user roles and application/project ACLs.
- **No matched nodes:** check mapped option/filter data and refreshed inventory.
- **Option validation error:** check required, allowed, or regex-constrained values.

Do not recreate the webhook with an `admin` user or grant it an `admin` role to make diagnosis easier. Test the same target job interactively or by API as the webhook user/roles, then add only the missing permission.

## Inspect the Right Logs

Rundeck documents a dedicated logger for webhook events that can write to `rundeck.webhooks.log`. Correlate the request timestamp, sender address, webhook name, and returned status. Increase logging temporarily if necessary, then restore normal verbosity.

At the sender, record status, a redacted response body, request ID, and retry attempt. Do not log the generated Post URL, Authorization value, or full payload. A reverse proxy access log may expose URL tokens by default, so apply path redaction and restricted retention.

## Use a Layered Test Matrix

Test one variable at a time:

1. Direct URL, minimal JSON, authorization header if enabled.
2. Same request through the proxy.
3. Realistic payload against a diagnostic handler/job.
4. Production Run Job mappings with a staging target.
5. Real monitoring sender, including its retry behavior.

A successful Run Job response includes `jobId` and `executionId`. It acknowledges job kickoff, not successful completion. A later job failure should be debugged through that execution rather than as an HTTP 400 webhook problem.

## Conclusion

For "Failed webhook authorization," verify the exact one-time Authorization string and proxy forwarding. For HTTP 400, verify the webhook identity's `post` permission, JSON bytes, `Content-Type`, handler mappings, required options, and the webhook's execution identity. Keeping URL authentication, header authentication, payload parsing, and job authorization separate makes the failing layer obvious.

## Official Documentation

- [Rundeck Webhooks and HTTP Authorization](https://docs.rundeck.com/docs/manual/webhooks.html)
- [Run Job Webhook Plugin](https://docs.rundeck.com/docs/manual/webhooks/run-job.html)
- [Rundeck API: Send Webhook Event](https://docs.rundeck.com/docs/api/#send-webhook-event)
- [Rundeck Access Control Policy](https://docs.rundeck.com/docs/administration/security/authorization.html)
