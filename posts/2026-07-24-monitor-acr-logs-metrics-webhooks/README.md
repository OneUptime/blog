# Monitoring Azure Container Registry with Diagnostic Logs, Metrics, and Webhooks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Azure, Azure Container Registry, Azure Monitor, Observability, Webhook, Container

Description: Build practical ACR monitoring with platform metrics, audit logs, alerts, Service Health, and secure repository webhooks.

---

Azure Container Registry sits on the critical path between a build and a deployment. A registry can be reachable while pulls are failing for one identity, healthy while an image was deleted unexpectedly, or serving images normally while a release webhook is broken.

No single signal covers those cases. A useful ACR monitoring design combines:

- Platform metrics for rates, storage, and ACR Tasks activity.
- Resource logs for login and repository audit events.
- The Azure Activity Log for control-plane changes.
- Resource Health and Service Health for Azure-side incidents.
- Webhooks or Event Grid for event-driven automation.

Metrics and the Activity Log are collected automatically. ACR resource logs are not retained or queryable until you create a diagnostic setting.

## Start with a Monitoring Contract

Before enabling every category, decide what the team needs to detect:

| Question | Best signal |
|---|---|
| Are total pulls or pushes changing unexpectedly? | Platform metrics |
| Who failed to authenticate and from which IP? | Login resource logs |
| Who deleted a manifest or repository? | Repository resource logs |
| Who changed networking or registry configuration? | Activity Log |
| Is Azure reporting a service or resource incident? | Service Health or Resource Health |
| Should an image push start an external workflow? | Webhook or Event Grid |
| Did an ACR Task fail or become slower? | Task run records, logs, and run-duration metric |

This prevents a common mistake: treating a webhook as an audit log or treating aggregate pull counts as proof that every deployment can authenticate.

## Inventory the Available Metrics and Logs

Get the registry resource ID:

```bash
RESOURCE_GROUP="rg-container-platform"
ACR_NAME="contosoprod"

ACR_ID=$(az acr show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --query id \
  --output tsv)
```

List current metric definitions:

```bash
az monitor metrics list-definitions \
  --resource "$ACR_ID" \
  --output table
```

As of July 2026, the documented ACR platform metrics are:

- `TotalPullCount`
- `SuccessfulPullCount`
- `TotalPushCount`
- `SuccessfulPushCount`
- `StorageUsed`
- `RunDuration`
- `AgentPoolCPUTime`

Pull, push, task-run, and agent-pool metrics have one-minute time grains. `StorageUsed` has a one-hour time grain and a `Geolocation` dimension. Check the live metric definition before coding an alert because supported metrics can evolve.

Query the last hour of pull counters:

```bash
az monitor metrics list \
  --resource "$ACR_ID" \
  --metric TotalPullCount SuccessfulPullCount \
  --interval PT1M \
  --aggregation Total \
  --offset 1h \
  --output json
```

Platform metrics are lightweight aggregates. They do not identify the caller, repository, tag, or reason for a failed login.

List diagnostic categories exposed by this registry:

```bash
az monitor diagnostic-settings categories list \
  --resource "$ACR_ID" \
  --output table
```

The documented ACR resource-log categories are:

- `ContainerRegistryLoginEvents`
- `ContainerRegistryRepositoryEvents`

## Route Resource Logs to Log Analytics

Create or select a Log Analytics workspace:

```bash
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group "rg-observability" \
  --workspace-name "law-platform-prod" \
  --query id \
  --output tsv)
```

Create a diagnostic setting:

```bash
az monitor diagnostic-settings create \
  --name "acr-audit-to-log-analytics" \
  --resource "$ACR_ID" \
  --workspace "$WORKSPACE_ID" \
  --export-to-resource-specific true \
  --logs '[
    {
      "category": "ContainerRegistryLoginEvents",
      "enabled": true
    },
    {
      "category": "ContainerRegistryRepositoryEvents",
      "enabled": true
    }
  ]' \
  --metrics '[
    {
      "category": "AllMetrics",
      "enabled": true
    }
  ]'
```

This example routes both audit categories and exportable metrics to one workspace. Other supported destinations include an Azure Storage account, Event Hubs, and monitoring partners. Choose destinations by purpose:

- Log Analytics for interactive queries, workbooks, and log alerts.
- Storage for long retention or archive requirements.
- Event Hubs for streaming into a SIEM or external platform.

Diagnostic settings begin collecting after they are created. They do not backfill resource logs from before the setting existed. Apply the configuration with infrastructure as code or Azure Policy so new registries do not start without auditing.

Log ingestion, retention, archive, query, and alert rules can incur Azure Monitor charges. Estimate volume and retain each category according to an explicit security and operations requirement.

## Query Login Failures

Use the resource-specific table rather than the legacy `AzureDiagnostics` table when the diagnostic setting uses resource-specific mode.

Recent failed registry authentication:

```kusto
ContainerRegistryLoginEvents
| where TimeGenerated > ago(1h)
| where ResultDescription != "200"
| project TimeGenerated, LoginServer, Identity, CallerIpAddress,
          ResultType, ResultDescription, Region
| order by TimeGenerated desc
```

Group failures to find a burst:

```kusto
ContainerRegistryLoginEvents
| where TimeGenerated > ago(30m)
| where ResultDescription != "200"
| summarize Failures=count(),
            Identities=dcount(Identity)
  by CallerIpAddress, bin(TimeGenerated, 5m)
| where Failures >= 10
| order by Failures desc
```

A high count can indicate an expired pipeline credential, a role change, a blocked address, or hostile password attempts. Alert text should preserve the caller IP and identity but must not include access tokens.

Successful login is not the same as repository authorization. A caller can obtain a registry token and still lack permission for a repository operation, especially with repository-scoped ABAC roles or scope-map tokens.

## Audit Repository Changes and Failures

Find recent repository events:

```kusto
ContainerRegistryRepositoryEvents
| where TimeGenerated > ago(1d)
| project TimeGenerated, OperationName, Repository, Tag, Digest,
          Identity, CallerIpAddress, Region, ResultType, ResultDescription
| order by TimeGenerated desc
```

Find delete and untag operations:

```kusto
ContainerRegistryRepositoryEvents
| where TimeGenerated > ago(7d)
| where OperationName contains "Delete"
    or OperationName contains "Untag"
| project TimeGenerated, LoginServer, OperationName, Repository,
          Tag, Digest, Identity, CallerIpAddress, Region
| order by TimeGenerated desc
```

Find client errors:

```kusto
ContainerRegistryRepositoryEvents
| where TimeGenerated > ago(1h)
| where ResultDescription contains "40"
| summarize Failures=count() by OperationName, Repository,
          ResultDescription, bin(TimeGenerated, 5m)
| order by Failures desc
```

The table schema includes `CorrelationId`, `UserAgent`, and `UserTenantId`, which are useful when tracing a request across systems or investigating cross-tenant access. Treat `Identity` as evidence from the event, not necessarily a human-friendly name. Resolve object IDs through the appropriate identity inventory during an investigation.

## Monitor the Control Plane Separately

The Azure Activity Log records operations performed against the registry resource through Azure Resource Manager. Examples include changing a SKU, firewall, public access, private endpoint association, replication, policy, or webhook configuration.

Repository pushes and pulls are data-plane operations and belong in ACR resource logs and metrics, not the Activity Log.

Create Activity Log alerts for high-impact changes such as:

- Registry deletion.
- Public network access enabled.
- Firewall or private endpoint changes.
- Geo-replica deletion.
- Diagnostic setting deletion.
- Webhook creation or modification.
- Registry policy changes.

Role assignments are separate Azure resources. Include authorization changes in the subscription's Activity Log monitoring rather than expecting every assignment to appear as an ACR repository event.

## Build Alerts from Symptoms, Not Noise

Useful alert candidates include:

- Failed login burst by identity or caller IP.
- Repository deletion or untag in a protected namespace.
- A sustained gap between total and successful pulls or pushes.
- Storage growth approaching an internal budget or service limit.
- Repeated ACR Task failures or abnormal run duration.
- Resource Health becoming unavailable or degraded.
- Diagnostic setting deleted or disabled.

Avoid alerting on every failed login or every push. Deployment systems legitimately retry and scanners legitimately pull. Aggregate over a short window, attach identity and repository context, and choose a threshold based on observed normal traffic.

`StorageUsed` includes shared layers, manifests, and replica copies. In a geo-replicated registry, use its `Geolocation` dimension when investigating regional storage. A storage alert is a capacity and cost signal, not proof that deleting the oldest tags is safe. Preserve digests referenced by current deployments and rollback plans.

Create Resource Health and Service Health alerts as well. A data-plane incident can affect many otherwise unrelated clients, while an authentication failure limited to one identity will not appear as a broad Azure incident.

## Use Native ACR Webhooks for Focused Events

ACR webhooks send an HTTP `POST` with a JSON body when selected registry actions occur. Supported CLI actions are:

```text
push
delete
chart_push
chart_delete
quarantine
```

Native webhooks can be scoped to a repository and tag. For example, `payments:*` covers every tag in the `payments` repository, while `payments:stable` covers one tag.

Create a secure, scoped push webhook:

```bash
WEBHOOK_URI="https://hooks.example.com/acr/payments"
WEBHOOK_SECRET="replace-with-secret-from-a-secure-store"

az acr webhook create \
  --registry "$ACR_NAME" \
  --name "PaymentsPush" \
  --actions push \
  --uri "$WEBHOOK_URI" \
  --scope "payments:*" \
  --headers "X-Webhook-Secret=$WEBHOOK_SECRET" \
  --status enabled
```

Do not place the literal secret in a checked-in script. Retrieve it from a secure CI secret or vault and prevent command tracing. `az acr webhook get-config` returns the service URI and custom headers, so access to that control-plane operation is sensitive.

Microsoft documents that the receiver must be publicly accessible from the registry. A private-only service behind an internal load balancer is not a valid native webhook target. Use HTTPS, authenticate every request through a custom header or another supported endpoint mechanism, and restrict request size and processing time.

The payload includes an event `id`, timestamp, action, target digest, repository, and tag for a push. Deduplicate on the event ID and use the digest as the artifact identity. Return promptly and hand slow work to a queue. These are safe receiver design practices even though the webhook itself should not be treated as the authoritative audit store.

Test delivery:

```bash
az acr webhook ping \
  --registry "$ACR_NAME" \
  --name "PaymentsPush"

az acr webhook list-events \
  --registry "$ACR_NAME" \
  --name "PaymentsPush" \
  --output table
```

The ping proves endpoint reachability and shows the HTTP response. Then perform a nonproduction push to verify the real payload and downstream workflow.

There are several caveats:

- Webhook quotas differ by ACR service tier.
- In a geo-replicated registry, each webhook is associated with a regional replica.
- A delete webhook is triggered by repository or manifest deletion, not by deleting only a tag.
- Chart actions describe the legacy Helm chart event model. For OCI artifacts, verify the current event behavior before designing automation around those action names.
- Webhooks complement logs and metrics; they do not replace either.

For broader Azure-native event routing, ACR also integrates with Azure Event Grid. Compare supported event types, endpoint requirements, filtering, delivery behavior, and operational model before choosing.

## Dashboard and Runbook Design

A practical workbook can show:

1. Total and successful pulls and pushes.
2. Failed authentication by identity and IP.
3. Repository failures by operation and repository.
4. Recent delete and untag events.
5. Storage by geolocation.
6. ACR Task duration and recent failed runs.
7. Resource Health and open Service Health events.

Every alert should link to a short runbook. For example, a pull-failure runbook can ask:

1. Is Resource Health degraded?
2. Did total pulls rise without successful pulls?
3. Which identity, IP, repository, and region failed?
4. Was a role, firewall, private endpoint, or tag changed?
5. Does `az acr check-health` succeed from the affected network?
6. Can the workload pull the exact digest with its own identity?

The dashboard explains what changed. The runbook turns it into a repeatable diagnosis.

## Production Checklist

- Route both ACR resource-log categories before onboarding workloads.
- Preserve Activity Log alerts for control-plane and role changes.
- Baseline pull, push, task, and storage metrics.
- Alert on failure rates and destructive operations, not every normal event.
- Add Resource Health and Service Health notifications.
- Use HTTPS and authenticated, repository-scoped webhooks.
- Test webhook ping and a real nonproduction event.
- Verify geo-replica webhook location and data-endpoint monitoring.
- Set retention and ingestion budgets.
- Review access to logs because they contain identities and caller IPs.
- Test every alert and runbook at least once.

Together, metrics provide the trend, logs provide the actor and operation, the Activity Log provides configuration history, and webhooks drive narrowly scoped automation. Keeping those roles separate produces much clearer incidents and safer release automation.

## Official Documentation

- [Monitor Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/monitor-container-registry)
- [Supported ACR metrics](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-containerregistry-registries-metrics)
- [Supported ACR log categories](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-containerregistry-registries-logs)
- [ContainerRegistryRepositoryEvents schema](https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/containerregistryrepositoryevents)
- [Using Azure Container Registry webhooks](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-webhook)
- [ACR webhook schema](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-webhook-reference)
