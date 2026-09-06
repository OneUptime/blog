# How to Provision Monitors and Status Pages Automatically with the OneUptime API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, REST API, Automation, Monitoring, Status Page

Description: Provision OneUptime monitors and status pages through the REST API with least-privilege keys, idempotent reconciliation, and safe activation.

---

The OneUptime REST API can automate resources available in the dashboard, including monitors, monitor steps, and status pages. Reliable provisioning needs more than a sequence of POST requests: it needs least-privilege authentication, version-current request schemas, stable identity, read-after-write checks, and an activation gate.

This guide targets OneUptime 12.0.33 and deliberately sends readers to the live reference for resource fields because API request bodies evolve.

## Create a dedicated API key

Create a key under **Project Settings > API Keys**. OneUptime API keys begin with no permissions. Grant only the create, read, and edit permissions needed for Monitor, Monitor Step, Status Page, and any owner or label resources the automation manages.

Requests use an `ApiKey` header:

```bash
export ONEUPTIME_URL=https://oneuptime.example.com
export ONEUPTIME_PROJECT_ID=project-id-here

curl --fail-with-body --silent --show-error \
  -X POST \
  -H "ApiKey: $ONEUPTIME_API_KEY" \
  -H 'Content-Type: application/json' \
  --data '{"select":{"name":true},"query":{},"sort":{"createdAt":-1}}' \
  "$ONEUPTIME_URL/api/monitor/get-list?skip=0&limit=1"
```

Inject `ONEUPTIME_API_KEY` from a CI or workload secret. Do not put it in a URL, repository variable file, debug trace, or generated plan artifact.

## Model the desired state

Keep a declarative input that contains no credentials:

```yaml
monitors:
  - key: checkout-health
    name: Checkout health
    type: API
    url: https://api.example.com/health
    statusPageKey: public-status

statusPages:
  - key: public-status
    name: Acme Service Status
```

`key` is your automation identity, not necessarily a OneUptime field. Store it as an approved label or in the provisioner's state so renaming a display name does not create a duplicate.

## Use the current resource schemas

OneUptime's create endpoints use a JSON object containing `data`. A minimal monitor request in the current API includes project and status references in addition to type and name. For example, the shape is:

```json
{
  "data": {
    "projectId": "PROJECT_ID",
    "name": "Checkout health",
    "monitorType": "API",
    "currentMonitorStatusId": "STATUS_ID",
    "disableActiveMonitoring": true
  }
}
```

Submit it to `POST /api/monitor` only after obtaining a valid initial monitor-status ID for the project. Read the Monitor API reference for the exact required fields and enum values in your installed release.

An API monitor's URL, method, headers, body, and criteria are monitor-step resources. Reconcile them through `/api/monitor-step`; creating the monitor row alone does not create a working check. Likewise, status pages have their own `/api/status-page` schema and separate resources for what the page displays.

Use files or a JSON generator for request bodies instead of interpolating untrusted names into shell strings:

```bash
curl --fail-with-body --silent --show-error \
  -X POST \
  -H "ApiKey: $ONEUPTIME_API_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary @monitor-request.json \
  "$ONEUPTIME_URL/api/monitor"
```

## Reconcile instead of recreating

For every desired resource:

1. list or filter existing resources in the same project
2. match one resource by the stable automation identity
3. create it disabled if none exists
4. compare managed fields and update only genuine drift
5. read it back and validate IDs, steps, criteria, and relationships
6. refuse to continue if multiple resources match

Never treat a timeout as proof that creation failed. Read after a network error before retrying, or one request can create duplicates.

Keep ownership boundaries explicit. If humans may edit notification rules or branding, exclude those fields from automation rather than overwriting them on every run.

## Activate after validation

Create monitors with `disableActiveMonitoring: true`. Validate their target, probe assignment, secrets, steps, criteria, dependencies, and intended status page before enabling checks. In a non-production project, trigger one controlled failure and recovery.

For status pages, verify that the correct monitors and groups appear, subscriber settings are deliberate, and no private monitor or internal description is exposed. Creating a status page does not automatically make every project monitor public.

## Protect production automation

Pin automation to a tested OneUptime release contract. Log method, endpoint, response status, resource ID, and correlation information, but redact headers and monitor secrets. Add exponential backoff for transient errors and stop on authorization or schema failures.

Run a read-only plan in pull requests. Apply with a concurrency lock so two jobs cannot reconcile the same project. Revoke the key during decommissioning and audit its permissions periodically.

OneUptime also publishes a Terraform provider for teams that want an existing declarative state engine. That is an alternative client of OneUptime's resource model, not a requirement for direct API provisioning.

## Conclusion

Safe API provisioning is an idempotent controller, not a one-shot script. Use a permission-empty key with only required grants, follow the installed release's Monitor, Monitor Step, and Status Page schemas, create checks disabled, and verify every relationship before activation.

## Official Documentation

- [OneUptime API reference guide](https://oneuptime.com/docs/en/api-reference/api-reference)
- [OneUptime API authentication](https://oneuptime.com/reference/en/authentication)
- [OneUptime Monitor API](https://oneuptime.com/reference/en/monitor)
- [OneUptime Monitor Step API](https://oneuptime.com/reference/en/monitor-step)
- [OneUptime Status Page API](https://oneuptime.com/reference/en/status-page)
- [OneUptime Terraform provider guide](https://oneuptime.com/docs/en/terraform/index)
