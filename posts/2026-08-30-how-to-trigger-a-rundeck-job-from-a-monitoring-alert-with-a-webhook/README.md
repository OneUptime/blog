# How to Trigger a Rundeck Job from a Monitoring Alert with a Webhook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Webhook, Monitoring, Automation, Security

Description: Connect a JSON monitoring alert to Rundeck's Run Job webhook with mapped options, constrained targets, least-privilege authorization, and idempotent remediation.

---

Rundeck's built-in **Run Job** webhook handler can turn an incoming JSON event into a job execution. It can map parsed payload fields to job options, override a node filter, or pass the raw payload. The safest integration maps a small allowlisted set of alert fields into a narrowly authorized, idempotent remediation job.

## Design the Remediation Job First

Create a job such as `Monitoring/Restart Unhealthy Service` with explicit options:

- `service`: enforced values such as `checkout,catalog,search`
- `environment`: enforced values such as `stage,prod`
- `alert_id`: a required identifier matching a conservative regex
- `status`: enforced values such as `firing,resolved`
- `severity`: enforced values understood by the workflow

Keep the saved node filter constrained:

```text
application: ${option.service} environment: ${option.environment}
```

Use node ACLs as the final authorization boundary. A payload field should express a requested service, not grant the webhook identity arbitrary access to every node.

Make remediation idempotent. Monitoring systems resend alerts, and Rundeck callers can retry after a network timeout even if the first request succeeded. Use `alert_id` or the provider's fingerprint as a deduplication key, inspect current service state before changing it, and make a repeated restart/no-op safe.

## Create the Webhook

In the target project, open **Webhooks**, add a webhook, and select the **Run Job** event plugin. Configure:

- A descriptive name, such as `Production service remediation`.
- An enabled state.
- The target job.
- A dedicated webhook user and minimal roles.
- Option arguments that map parsed JSON fields.

The configured webhook user must exist and must have logged in to Rundeck at least once before it can be selected successfully. Its effective ACLs need application-context `read` access to the project and project-context permissions to `post` to webhooks, `view` (or `read`) and `run` the target job, and `read` and `run` the allowed nodes. Do not run the webhook as `admin`.

After saving, copy the generated **Post URL** exactly. It contains a webhook authentication token and must be handled as a secret. The send-event API currently follows this shape:

```text
POST /api/V/webhook/AUTH_TOKEN
```

Do not replace this token with a normal Rundeck API token.

## Map a Stable JSON Contract

Suppose the monitoring adapter sends:

```json
{
  "status": "firing",
  "severity": "critical",
  "fingerprint": "alert-8c71a1",
  "labels": {
    "service": "checkout",
    "environment": "prod"
  }
}
```

The Run Job plugin can address parsed values with `${data...}`. Configure its job arguments as:

```text
-service ${data.labels.service} -environment ${data.labels.environment} -alert_id ${data.fingerprint} -status ${data.status} -severity ${data.severity}
```

The plugin handles JSON payloads only. Keep field names and types stable in an adapter under your control rather than binding remediation directly to every monitoring provider's full, changeable schema. The basic Run Job handler does not provide the conditional rule processing of the commercial Advanced Run Job handler: if a provider sends both firing and resolved events, filter them in the sender/adapter or make the job's first step handle `status` as an explicit, safe no-op.

Rundeck also supports `${raw}` to pass the entire payload to an option, and webhook variables such as `${webhook.id}`, `${webhook.project}`, `${webhook.sender}`, and `${webhook.timestamp}`. Raw payloads are useful for logging/archival jobs but create a larger injection and secret-handling surface. A remediation command should consume specific validated fields.

## Add Webhook Header Authorization

Rundeck webhooks have an optional **Use Authorization Header** setting. When enabled, Rundeck displays an authorization string once after save. Store it in the monitoring system's secret store and send it verbatim in the standard header:

```bash
curl --fail-with-body --request POST "$RUNDECK_WEBHOOK_URL" \
  --header "Authorization: $RUNDECK_WEBHOOK_AUTHORIZATION" \
  --header "Content-Type: application/json" \
  --data @test-alert.json
```

The value is not automatically `Bearer <token>`; use the exact generated string. A regenerated authorization string takes effect when the webhook is saved and replaces the previous value. Ensure a reverse proxy preserves the `Authorization` header.

Even with header authorization, protect the Post URL and expose it only over HTTPS. Restrict inbound network paths or place a validating relay in front when the monitoring platform supports signed requests that the basic Run Job handler does not validate itself.

## Test the End-to-End Behavior

Start with a staging-only job and a payload fixture. A successful Run Job webhook response includes both job and execution IDs:

```json
{
  "executionId": "8471",
  "jobId": "9bb310cf-fa0a-4a66-89a0-1892d73021e2"
}
```

That response means Rundeck started the job; it does not mean remediation finished successfully. If the monitoring workflow needs the outcome, use the execution ID to query execution status through the authenticated API, or let Rundeck send a completion notification.

Test these cases before production:

- Valid firing alert starts one correctly targeted execution.
- Repeated `alert_id` is a safe no-op or joins the existing remediation.
- Resolved/non-firing alert is filtered before the basic handler or becomes a deliberate no-op in the job.
- Unknown service/environment is rejected by enforced job options or a validation step.
- Missing JSON field fails visibly rather than becoming a broad node filter.
- The webhook user cannot run unrelated jobs or target unrelated nodes.

## Operate the Integration

Monitor the webhook's HTTP responses and Rundeck execution outcomes separately. The webhook update API does not allow its Post URL token to be changed, so rotate that token by recreating the webhook or through a project-archive import that regenerates webhook tokens. Rotate the optional authorization string with its **Regenerate** control. Coordinate either change so the sender and receiver do not drift. Avoid logging full URLs, headers, or raw alert payloads containing credentials or customer data.

For troubleshooting, Rundeck can emit webhook activity to its dedicated webhook log when configured. Apply retention and access controls because payloads may include sensitive labels and annotations.

## Conclusion

Use a dedicated Run Job webhook, map a small JSON contract to constrained options, and authorize its identity for one job and one node subset. Add HTTPS and the optional authorization header, make remediation idempotent, and treat the returned execution ID as a kickoff acknowledgement rather than proof of success.

## Official Documentation

- [Rundeck Webhooks](https://docs.rundeck.com/docs/manual/webhooks.html)
- [Run Job Webhook Plugin](https://docs.rundeck.com/docs/manual/webhooks/run-job.html)
- [Rundeck Access Control Policy](https://docs.rundeck.com/docs/administration/security/authorization.html)
- [Rundeck API: Send Webhook Event](https://docs.rundeck.com/docs/api/#send-webhook-event)
