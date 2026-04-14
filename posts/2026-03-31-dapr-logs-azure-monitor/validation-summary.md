# Validation Summary: How to Send Dapr Logs to Azure Monitor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar logging configuration)
- Azure Monitor Container Insights
- Azure Kubernetes Service (AKS)
- Azure Monitor Log Analytics (KQL queries)
- Azure Monitor Scheduled Query Alerts
- Azure Monitor Data Collection Rules (DCR)
- Azure CLI (`az aks`, `az monitor`)

## Sources Consulted
- Azure Monitor Logs reference - ContainerLog: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/containerlog
- Azure Monitor Logs reference - ContainerLogV2: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/containerlogv2
- Configure the ContainerLogV2 schema for Container Insights: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-logs-schema
- Query container logs in Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-log-query
- az aks enable-addons CLI reference: https://learn.microsoft.com/en-us/cli/azure/aks
- az monitor scheduled-query create CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- Enable Monitoring for AKS Clusters: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-monitoring-enable
- Manage the Container Insights agent: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-manage-agent
- Migrate to Azure Monitor Agent from Log Analytics agent: https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-migration
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Structure of a DCR in Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-rule-structure

## Issues Found

### 1. KQL queries used legacy `ContainerLog` table with non-existent columns
**What was wrong:** All KQL queries referenced the legacy `ContainerLog` table using `ContainerName`, `PodName`, and `LogEntry` columns. The legacy `ContainerLog` table does NOT have `ContainerName` or `PodName` as direct columns (those require joins with `KubePodInventory`), and is being retired on September 30, 2026.
**What was changed:** Switched all queries to use `ContainerLogV2`, which has `ContainerName`, `PodName`, and `PodNamespace` as direct columns. Changed `LogEntry` to `LogMessage` (the correct column name in `ContainerLogV2`).
**Why:** `ContainerLogV2` is the current default schema, has the columns used in the queries, and the legacy table is being deprecated.

### 2. OMS agent reference is deprecated
**What was wrong:** The verification command `kubectl get pods -n kube-system | grep omsagent` references the OMS agent, which was retired on August 31, 2024 and replaced by the Azure Monitor Agent (AMA).
**What was changed:** Updated to `kubectl get pods -n kube-system | grep ama-logs` and changed the comment from "OMS agent" to "Azure Monitor Agent".
**Why:** The OMS/Log Analytics agent is retired. AMA pods are named `ama-logs-*` instead of `omsagent-*`.

### 3. `az monitor scheduled-query create` had incorrect `--condition` format
**What was wrong:** `--condition-query` provided a raw KQL query without a placeholder name, and `--condition "count > 10"` was missing the required query placeholder reference. The correct format requires named placeholders.
**What was changed:** Changed `--condition-query` to use placeholder format (`Placeholder_1="..."`) and updated `--condition` to reference the placeholder (`count 'Placeholder_1' > 10`). Also updated the KQL within the condition to use `ContainerLogV2` and `LogMessage`.
**Why:** The `az monitor scheduled-query create` command requires `--condition` to reference a named placeholder defined in `--condition-query`.

### 4. DCR stream name was deprecated
**What was wrong:** The Data Collection Rule JSON used `"Microsoft-ContainerLog"` which targets the legacy table being retired September 2026.
**What was changed:** Updated to `"Microsoft-ContainerLogV2"`.
**Why:** Aligns with the recommended `ContainerLogV2` schema and avoids the deprecated legacy table.

### 5. Description referenced deprecated "OMS Agent"
**What was wrong:** The post description mentioned "OMS Agent" which is the retired Log Analytics agent.
**What was changed:** Removed "OMS Agent" from the description, keeping just "Azure Monitor Container Insights".
**Why:** The OMS agent has been retired and replaced by Azure Monitor Agent.

## Review Notes
- The section numbering is inconsistent ("Option 1" followed by "Step 2", "Step 3", "Step 4", then "Option 2"). This is a structural/stylistic issue that was not changed per review guidelines.
- The Dapr annotations (`dapr.io/log-as-json` and `dapr.io/log-level`) are correct and current.
- The `az aks enable-addons` command syntax is correct.
- The `ContainerLogV2` table's `LogMessage` column is of `dynamic` type and natively supports JSON, so `parse_json()` calls on it are safe but may be redundant if the log data is already parsed. Keeping them ensures the queries work regardless of whether the data arrives as a JSON object or JSON string.
