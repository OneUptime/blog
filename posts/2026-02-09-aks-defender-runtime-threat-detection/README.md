# How to Configure AKS Defender for Runtime Threat Detection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Azure, AKS, Security, Microsoft Defender

Description: Learn how to enable and configure Microsoft Defender for Containers on AKS to detect runtime threats, vulnerabilities, and security misconfigurations in your Kubernetes workloads.

---

Microsoft Defender for Containers provides comprehensive security for AKS clusters through vulnerability assessment, runtime threat detection, and security posture management. It monitors container activities, detects suspicious behavior, and alerts on security best practice violations, helping protect workloads from attacks and misconfigurations.

## Understanding Defender for Containers Architecture

Defender for Containers operates at multiple layers. The Defender agent runs as a DaemonSet on every node, monitoring kernel-level events and container activities using eBPF. The cloud-side analytics engine processes telemetry data, applying machine learning models to detect anomalies and threats.

The system provides three main capabilities: vulnerability scanning of container images in Azure Container Registry, runtime threat protection that detects malicious activities, and security recommendations based on CIS Kubernetes benchmarks and Azure security best practices.

Unlike traditional security tools that only scan images before deployment, Defender monitors actual runtime behavior to catch zero-day exploits, privilege escalation attempts, and other threats that static scanning misses.

## Enabling Defender for Containers

Enable Defender at the subscription level to protect all AKS clusters:

```bash
# Enable Defender for Containers
az security pricing create \
  --name Containers \
  --tier standard

# Verify Defender is enabled
az security pricing show \
  --name Containers \
  --query "pricingTier"
```

The Defender agent automatically deploys to existing and new AKS clusters in the subscription. Verify deployment:

```bash
# Check Defender pods
kubectl get pods -n kube-system | grep defender

# Verify Defender DaemonSet
kubectl get daemonset -n kube-system microsoft-defender-collector-ds

# Check agent status
kubectl describe daemonset microsoft-defender-collector-ds -n kube-system
```

For clusters with custom configurations, ensure the Defender agent has necessary permissions:

```bash
# Verify service account
kubectl get serviceaccount -n kube-system microsoft-defender-collector

# Check role bindings
kubectl get clusterrolebinding | grep defender
```

## Configuring Vulnerability Scanning

Defender automatically scans images pushed to Azure Container Registry. Configure registry integration:

```bash
# Enable Defender for Container Registries
az security pricing create \
  --name ContainerRegistry \
  --tier standard

# Verify scanning is enabled
az acr show \
  --name myregistry \
  --query "policies.quarantinePolicy.status"
```

View vulnerability scan results:

```bash
# List vulnerable images in registry
az security assessment list \
  --query "[?id contains 'vulnerabilities'].{Name:name, Status:status.code, Severity:status.severity}"

# Get detailed vulnerability report for specific image
az security sub-assessment list \
  --assessed-resource-id /subscriptions/<subscription-id>/resourceGroups/production-rg/providers/Microsoft.ContainerRegistry/registries/myregistry \
  --assessment-name "container-registry-vulnerability-assessment"
```

Configure automatic image scanning on push:

```bash
# Enable image scanning
az acr update \
  --name myregistry \
  --resource-group production-rg \
  --anonymous-pull-enabled false

# Set up task to scan on push
az acr task create \
  --registry myregistry \
  --name scan-on-push \
  --context /dev/null \
  --image {{.Run.Registry}}/{{.Run.ImageName}}:{{.Run.ImageTag}} \
  --cmd "az security assessment create" \
  --trigger-event push
```

## Setting Up Runtime Threat Detection

Defender monitors cluster activities for suspicious behavior. Configure threat detection policies:

```bash
# View current threat detection configuration
az security setting list \
  --query "[?name=='MCAS'].{Name:name, Enabled:enabled}"

# Enable specific threat detections
az security alert update \
  --name "Suspicious process executed" \
  --resource-group production-rg \
  --status On
```

Common threat detection categories include:

**Privilege Escalation**: Detects attempts to gain elevated permissions through container breakout or exploiting RBAC misconfigurations.

**Credential Access**: Identifies suspicious access to secrets, service account tokens, or Azure credentials.

**Execution**: Catches malicious code execution, crypto-mining, or unexpected binaries running in containers.

**Persistence**: Spots attempts to maintain access through backdoors or modified container images.

View active threat alerts:

```bash
# List security alerts for cluster
az security alert list \
  --query "[?properties.extendedProperties.resourceType=='Microsoft.ContainerService/managedClusters'].{Name:name, Severity:properties.severity, Status:properties.status}"

# Get detailed alert information
az security alert show \
  --name <alert-id> \
  --resource-group production-rg
```

## Implementing Security Recommendations

Defender generates security recommendations based on CIS benchmarks and Azure best practices. Review recommendations:

```bash
# List security recommendations
az security assessment list \
  --resource-group production-rg \
  --query "[?resourceDetails.ResourceType=='Microsoft.ContainerService/managedClusters'].{Name:displayName, Severity:status.severity, Status:status.code}"

# Get specific recommendation details
az security assessment show \
  --name <assessment-id> \
  --resource-group production-rg
```

Common recommendations include:

- Enable role-based access control (RBAC)
- Restrict access to Kubernetes API server
- Use Azure Active Directory integration
- Enable audit logging
- Implement network policies
- Configure pod security policies

Remediate recommendations through Azure Policy:

```bash
# Assign policy to enforce recommendations
az policy assignment create \
  --name "enforce-aks-security" \
  --policy-set-definition "Kubernetes cluster security" \
  --scope /subscriptions/<subscription-id>/resourceGroups/production-rg
```

## Configuring Alert Rules and Automation

Create custom alert rules for specific scenarios:

```bash
# Create action group for alerts
az monitor action-group create \
  --name security-alerts \
  --resource-group production-rg \
  --action email security-team security@example.com \
  --action webhook defender-webhook https://webhook.example.com/defender

# Create alert rule for high-severity threats
az monitor metrics alert create \
  --name high-severity-threats \
  --resource-group production-rg \
  --scopes /subscriptions/<subscription-id>/resourceGroups/production-rg/providers/Microsoft.ContainerService/managedClusters/production-cluster \
  --condition "count where severity == 'High'" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action security-alerts
```

Automate response to specific threats:

```yaml
# Logic App for automated response
{
  "definition": {
    "triggers": {
      "When_a_Defender_alert_is_created": {
        "type": "ApiConnection",
        "inputs": {
          "host": {
            "connection": {
              "name": "@parameters('$connections')['azuresecuritycenter']['connectionId']"
            }
          },
          "method": "post",
          "path": "/subscriptions/@{encodeURIComponent(subscription-id)}/providers/Microsoft.Security/alerts"
        }
      }
    },
    "actions": {
      "Quarantine_Pod": {
        "type": "Http",
        "inputs": {
          "method": "POST",
          "uri": "https://management.azure.com/subscriptions/@{triggerBody()?['properties']?['subscriptionId']}/resourceGroups/@{triggerBody()?['properties']?['resourceGroup']}/providers/Microsoft.ContainerService/managedClusters/@{triggerBody()?['properties']?['clusterName']}/quarantine",
          "authentication": {
            "type": "ManagedServiceIdentity"
          }
        }
      }
    }
  }
}
```

## Investigating Security Incidents

When Defender raises an alert, investigate using Azure Security Center:

```bash
# Get alert timeline
az security alert show \
  --name <alert-id> \
  --resource-group production-rg \
  --query "properties.{Time:startTimeUtc, Description:description, Entities:entities}"

# View related events
az monitor activity-log list \
  --resource-id /subscriptions/<subscription-id>/resourceGroups/production-rg/providers/Microsoft.ContainerService/managedClusters/production-cluster \
  --start-time 2026-02-09T00:00:00Z \
  --query "[?contains(operationName.value, 'Security')]"
```

Examine suspicious pods:

```bash
# Get pod details from alert
SUSPICIOUS_POD=$(az security alert show --name <alert-id> --query "properties.extendedProperties.podName" -o tsv)

# Describe pod
kubectl describe pod $SUSPICIOUS_POD -n <namespace>

# Check pod logs
kubectl logs $SUSPICIOUS_POD -n <namespace> --previous

# Inspect running processes
kubectl exec $SUSPICIOUS_POD -n <namespace> -- ps aux
```

Analyze network connections:

```bash
# Get pod IP
POD_IP=$(kubectl get pod $SUSPICIOUS_POD -n <namespace> -o jsonpath='{.status.podIP}')

# Check network flows in Defender
az network watcher flow-log show \
  --name defender-flow-log \
  --resource-group production-rg \
  --query "flowAnalyticsConfiguration.networkWatcherFlowAnalyticsConfiguration"
```

## Integrating with Azure Sentinel

Export Defender alerts to Azure Sentinel for advanced threat hunting:

```bash
# Enable Sentinel connector
az sentinel data-connector create \
  --resource-group security-rg \
  --workspace-name security-workspace \
  --name defender-connector \
  --kind AzureSecurityCenter \
  --data-types alerts

# Verify connector
az sentinel data-connector show \
  --resource-group security-rg \
  --workspace-name security-workspace \
  --name defender-connector
```

Create hunting queries in Sentinel:

```kusto
// Find privilege escalation attempts
SecurityAlert
| where ProviderName == "Azure Security Center"
| where AlertName contains "privilege"
| extend ClusterName = tostring(ExtendedProperties.ClusterName)
| extend PodName = tostring(ExtendedProperties.PodName)
| project TimeGenerated, AlertName, AlertSeverity, ClusterName, PodName, Description

// Detect crypto-mining activity
SecurityAlert
| where ProviderName == "Azure Security Center"
| where Description contains "mining" or Description contains "cryptocurrency"
| summarize count() by bin(TimeGenerated, 1h), AlertName
| render timechart
```

## Configuring Just-In-Time Access

Implement just-in-time (JIT) VM access for AKS nodes:

```bash
# Enable JIT on node resource group
NODE_RG=$(az aks show \
  --resource-group production-rg \
  --name production-cluster \
  --query nodeResourceGroup -o tsv)

az security jit-policy create \
  --location eastus \
  --name aks-nodes-jit \
  --resource-group $NODE_RG \
  --virtual-machines $(az vm list -g $NODE_RG --query "[].id" -o tsv) \
  --port 22 \
  --protocol TCP \
  --duration PT3H
```

Request JIT access when needed:

```bash
# Request SSH access to node
az security jit-policy request \
  --resource-group $NODE_RG \
  --jit-policy-name aks-nodes-jit \
  --virtual-machines <vm-id> \
  --port 22 \
  --duration PT1H \
  --source-address-prefix $(curl -s ifconfig.me)
```

## Monitoring Defender Performance

Track Defender metrics and resource usage:

```bash
# Check Defender agent resource consumption
kubectl top pods -n kube-system -l app=microsoft-defender-collector

# View Defender logs
kubectl logs -n kube-system -l app=microsoft-defender-collector --tail=100

# Monitor scanning performance
az monitor metrics list \
  --resource /subscriptions/<subscription-id>/resourceGroups/production-rg/providers/Microsoft.ContainerService/managedClusters/production-cluster \
  --metric "SecurityScanDuration" \
  --start-time 2026-02-09T00:00:00Z \
  --end-time 2026-02-09T23:59:59Z
```

Query Defender telemetry in Log Analytics:

```kusto
// Defender agent health
ContainerInventory
| where Name contains "microsoft-defender-collector"
| summarize count() by Computer, State
| render barchart

// Scanning activity
SecurityRecommendation
| where ResourceType == "Microsoft.ContainerService/managedClusters"
| summarize count() by RecommendationName, RecommendationSeverity
| render piechart
```

## Troubleshooting Defender Issues

Common issues include agent installation failures and false positives.

Verify agent connectivity:

```bash
# Check agent status
kubectl exec -n kube-system microsoft-defender-collector-xxxxx -- defender-status

# Test connectivity to Defender backend
kubectl exec -n kube-system microsoft-defender-collector-xxxxx -- curl -v https://defender.microsoft.com

# Review agent logs for errors
kubectl logs -n kube-system microsoft-defender-collector-xxxxx | grep ERROR
```

Handle false positives:

```bash
# Suppress specific alert
az security alert update \
  --name <alert-id> \
  --resource-group production-rg \
  --status Dismissed

# Create suppression rule
az security alert-suppression-rule create \
  --name suppress-known-scanner \
  --rule-name "Suppress scanner activity" \
  --alert-type "Suspicious process detected" \
  --reason "Legitimate scanning tool" \
  --expiration-time 2026-12-31T23:59:59Z
```

Microsoft Defender for Containers provides enterprise-grade security for AKS clusters with minimal operational overhead. The automated threat detection and vulnerability scanning capabilities help maintain strong security posture while reducing manual security assessment efforts.
