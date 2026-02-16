# How to Troubleshoot AKS Control Plane Errors Using Diagnostic Logs and Azure Monitor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Troubleshooting, Diagnostic Logs, Azure Monitor, Kubernetes, Control Plane, Monitoring

Description: Learn how to enable and query AKS control plane diagnostic logs to identify API server errors, scheduler failures, and authentication issues.

---

The AKS control plane is a managed service, which means you do not have direct SSH access to the API server, etcd, scheduler, or controller manager. When something goes wrong at the control plane level - slow API responses, failed scheduling, authentication errors - you cannot just SSH in and check logs. You need to use Azure's diagnostic logging and monitoring tools.

This guide covers enabling control plane diagnostics, querying the logs effectively, and troubleshooting the most common control plane issues you will encounter in production AKS clusters.

## What Control Plane Logs Are Available

AKS can send diagnostic logs from several control plane components:

- **kube-apiserver**: API request/response logs, authentication and authorization events
- **kube-controller-manager**: Controller reconciliation loops, resource creation/deletion events
- **kube-scheduler**: Scheduling decisions, pod placement failures
- **kube-audit / kube-audit-admin**: Detailed audit logs of all API operations
- **cluster-autoscaler**: Auto-scaling decisions, scale-up/scale-down events
- **guard**: Azure AD authentication webhook logs
- **cloud-controller-manager**: Azure resource provisioning (load balancers, disks, etc.)

## Step 1: Enable Diagnostic Settings

Configure AKS to send control plane logs to a Log Analytics workspace.

```bash
# Create a Log Analytics workspace (if you do not have one)
az monitor log-analytics workspace create \
  --resource-group myResourceGroup \
  --workspace-name myAKSLogs \
  --location eastus

# Get the workspace ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group myResourceGroup \
  --workspace-name myAKSLogs \
  --query id -o tsv)

# Get the AKS cluster resource ID
AKS_ID=$(az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query id -o tsv)

# Enable diagnostic settings for all control plane log categories
az monitor diagnostic-settings create \
  --name aks-diagnostics \
  --resource $AKS_ID \
  --workspace $WORKSPACE_ID \
  --logs '[
    {"category": "kube-apiserver", "enabled": true},
    {"category": "kube-controller-manager", "enabled": true},
    {"category": "kube-scheduler", "enabled": true},
    {"category": "kube-audit-admin", "enabled": true},
    {"category": "cluster-autoscaler", "enabled": true},
    {"category": "guard", "enabled": true},
    {"category": "cloud-controller-manager", "enabled": true}
  ]'
```

Note: I recommend `kube-audit-admin` over `kube-audit` for most cases. The full `kube-audit` log is extremely verbose and generates massive amounts of data (and cost). `kube-audit-admin` filters out read-only GET and LIST operations, which are usually not interesting for troubleshooting.

## Step 2: Wait for Logs to Flow

It takes 5-15 minutes for logs to start appearing in the Log Analytics workspace after enabling diagnostics. You can verify that logs are flowing with a simple query.

```bash
# Query to check if logs are arriving
az monitor log-analytics query \
  --workspace $WORKSPACE_ID \
  --analytics-query "AzureDiagnostics | where Category == 'kube-apiserver' | count" \
  --timespan PT1H
```

## Step 3: Troubleshoot API Server Errors

API server issues manifest as slow kubectl commands, timeouts, or HTTP 5xx errors. Here are the most useful queries.

### Find API Server Errors (5xx Responses)

```
// Query: Find all API server 5xx errors in the last hour
AzureDiagnostics
| where Category == "kube-apiserver"
| where log_s contains "\" 5"
| project TimeGenerated, log_s
| order by TimeGenerated desc
| take 50
```

### Identify Slow API Requests

```
// Query: Find API requests that took longer than 5 seconds
AzureDiagnostics
| where Category == "kube-apiserver"
| extend duration = extract("Duration: ([0-9.]+)", 1, log_s)
| where todouble(duration) > 5000
| project TimeGenerated, log_s, duration
| order by todouble(duration) desc
| take 20
```

### Check for Throttled Requests

```
// Query: Find API throttling events (429 responses)
AzureDiagnostics
| where Category == "kube-apiserver"
| where log_s contains "429"
| summarize count() by bin(TimeGenerated, 5m)
| order by TimeGenerated desc
```

## Step 4: Troubleshoot Scheduling Failures

When pods are stuck in Pending state, the scheduler logs tell you why.

### Find Scheduling Failures

```
// Query: Find pods that could not be scheduled
AzureDiagnostics
| where Category == "kube-scheduler"
| where log_s contains "FailedScheduling" or log_s contains "unable to schedule"
| project TimeGenerated, log_s
| order by TimeGenerated desc
| take 50
```

### Identify Resource Pressure

```
// Query: Find events related to resource pressure
AzureDiagnostics
| where Category == "kube-scheduler"
| where log_s contains "Insufficient" or log_s contains "insufficient"
| project TimeGenerated, log_s
| order by TimeGenerated desc
```

## Step 5: Troubleshoot Authentication Issues

Authentication failures often come from expired tokens, misconfigured RBAC, or Azure AD integration problems.

### Find Authentication Failures

```
// Query: Find authentication and authorization failures
AzureDiagnostics
| where Category == "kube-audit-admin"
| where log_s contains "\"code\":403" or log_s contains "\"code\":401"
| project TimeGenerated, log_s
| order by TimeGenerated desc
| take 50
```

### Check Azure AD Webhook Failures

```
// Query: Find Azure AD authentication webhook errors
AzureDiagnostics
| where Category == "guard"
| where log_s contains "error" or log_s contains "failed"
| project TimeGenerated, log_s
| order by TimeGenerated desc
| take 20
```

## Step 6: Troubleshoot Cluster Autoscaler Issues

When the autoscaler does not scale as expected, check its logs for decision-making details.

### Find Scale-Up Failures

```
// Query: Find autoscaler scale-up events and failures
AzureDiagnostics
| where Category == "cluster-autoscaler"
| where log_s contains "ScaleUp" or log_s contains "scale up"
| project TimeGenerated, log_s
| order by TimeGenerated desc
| take 50
```

### Find Why Autoscaler Did Not Scale Down

```
// Query: Find reasons autoscaler is not scaling down
AzureDiagnostics
| where Category == "cluster-autoscaler"
| where log_s contains "ScaleDown" or log_s contains "cannot be removed"
| project TimeGenerated, log_s
| order by TimeGenerated desc
| take 50
```

## Step 7: Troubleshoot Cloud Controller Manager

The cloud controller manager handles Azure resource operations (creating load balancers, attaching disks, managing routes). Issues here manifest as services not getting external IPs or persistent volumes not attaching.

### Find Azure Resource Provisioning Errors

```
// Query: Find cloud controller errors
AzureDiagnostics
| where Category == "cloud-controller-manager"
| where log_s contains "error" or log_s contains "failed"
| project TimeGenerated, log_s
| order by TimeGenerated desc
| take 50
```

### Track Load Balancer Operations

```
// Query: Find load balancer related events
AzureDiagnostics
| where Category == "cloud-controller-manager"
| where log_s contains "loadbalancer" or log_s contains "LoadBalancer"
| project TimeGenerated, log_s
| order by TimeGenerated desc
| take 30
```

## Step 8: Set Up Alerts

Do not wait for users to report issues. Set up proactive alerts for control plane problems.

```bash
# Alert for API server errors
az monitor scheduled-query create \
  --resource-group myResourceGroup \
  --name "AKS-APIServer-Errors" \
  --scopes $WORKSPACE_ID \
  --condition "count > 10" \
  --condition-query "AzureDiagnostics | where Category == 'kube-apiserver' | where log_s contains '\" 5'" \
  --window-size 5 \
  --evaluation-frequency 5 \
  --severity 2

# Alert for scheduling failures
az monitor scheduled-query create \
  --resource-group myResourceGroup \
  --name "AKS-Scheduling-Failures" \
  --scopes $WORKSPACE_ID \
  --condition "count > 5" \
  --condition-query "AzureDiagnostics | where Category == 'kube-scheduler' | where log_s contains 'FailedScheduling'" \
  --window-size 10 \
  --evaluation-frequency 5 \
  --severity 3
```

## Step 9: Use AKS Diagnostics in the Portal

Azure portal has a built-in diagnostics tool for AKS that runs predefined checks.

Navigate to your AKS cluster in the Azure portal, click on "Diagnose and solve problems" in the left menu, and you will find categories like:

- **Cluster and Control Plane Availability**: Checks API server responsiveness and control plane health
- **Node Health**: Identifies node-level issues
- **Create, Upgrade, Delete, and Scale Issues**: Diagnoses operations that failed
- **Networking Issues**: Checks NSG rules, DNS resolution, and connectivity

This is often the fastest way to get a diagnosis without writing KQL queries.

## Best Practices for Control Plane Log Management

**Use kube-audit-admin instead of kube-audit** unless you specifically need read operation logs. The full audit log can generate terabytes of data per day on busy clusters.

**Set log retention policies** to control costs. 30-90 days of retention is usually sufficient for troubleshooting. Archive to Azure Blob Storage if you need longer retention for compliance.

```bash
# Set retention to 30 days on the workspace
az monitor log-analytics workspace update \
  --resource-group myResourceGroup \
  --workspace-name myAKSLogs \
  --retention-time 30
```

**Create saved queries** for your most common troubleshooting scenarios. Save them in the Log Analytics workspace so the whole team can use them.

**Export critical alerts to your incident management system** (PagerDuty, Opsgenie, etc.) through Azure Monitor action groups.

**Correlate control plane logs with application logs** by using the same Log Analytics workspace for both AKS diagnostics and Container Insights. This lets you trace issues from application-level symptoms to control plane root causes.

Control plane diagnostic logs are your window into the managed portion of AKS. Enabling them proactively and knowing how to query them is the difference between spending 5 minutes diagnosing an issue and spending 5 hours guessing at the root cause.
