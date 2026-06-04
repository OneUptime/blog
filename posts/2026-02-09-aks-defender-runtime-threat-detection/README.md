# How to Configure AKS Defender for Runtime Threat Detection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Azure, AKS, Security, Microsoft Defender

Description: Learn how to enable and configure Microsoft Defender for Containers on AKS to detect runtime threats, vulnerabilities, and security misconfigurations in your Kubernetes workloads.

---

Microsoft Defender for Containers provides comprehensive security for AKS clusters through vulnerability assessment, runtime threat detection, and security posture management. It monitors container activities, detects suspicious behavior, and alerts on security best practice violations, helping protect workloads from attacks and misconfigurations.

## Understanding Defender for Containers Architecture

Defender for Containers operates at multiple layers. The Defender sensor runs as a DaemonSet on every node, monitoring kernel-level events and container activities using eBPF. The cloud-side analytics engine processes telemetry data, applying machine learning models to detect anomalies and threats.

The system provides three main capabilities: vulnerability scanning of container images in Azure Container Registry, runtime threat protection that detects malicious activities, and security recommendations based on CIS Kubernetes benchmarks and Azure security best practices.

Unlike traditional security tools that only scan images before deployment, Defender monitors actual runtime behavior to catch zero-day exploits, privilege escalation attempts, and other threats that static scanning misses.

## Enabling Defender for Containers

Enable Defender at the subscription level to protect all AKS clusters:

```bash
# Enable Defender for Containers

az security pricing create \
  --name Containers \
  --tier standard \
  --extensions name=ContainerSensor isEnabled=True \
  --extensions name=AgentlessDiscoveryForKubernetes isEnabled=True \
  --extensions name=ContainerRegistriesVulnerabilityAssessments isEnabled=True

# Verify Defender is enabled
az security pricing show \
  --name Containers \
  --query "pricingTier"
```

The Defender sensor automatically deploys to existing and new AKS clusters in the subscription when the sensor component is enabled. Verify deployment:

```bash
# Verify the Defender profile on the AKS resource
az aks show \
  --resource-group production-rg \
  --name production-cluster \
  --query "securityProfile.defender.securityMonitoring.enabled"

# Check Defender pods
kubectl get pods -n kube-system -l app=defender

# Deploy the Defender sensor manually if it was not provisioned
az aks update \
  --resource-group production-rg \
  --name production-cluster \
  --enable-defender
```

For clusters with custom configurations, ensure the Defender sensor has necessary permissions:

```bash
# Verify trusted access role binding created by Defender
az aks trustedaccess rolebinding list \
  --resource-group production-rg \
  --cluster-name production-cluster

# Check Kubernetes role bindings
kubectl get clusterrolebinding | grep -i defender
```

## Configuring Vulnerability Scanning

Defender automatically scans images pushed to Azure Container Registry when registry access is enabled in the Defender for Containers plan:

```bash
# Enable Defender for Containers with registry vulnerability assessment
az security pricing create \
  --name Containers \
  --tier standard \
  --extensions name=ContainerRegistriesVulnerabilityAssessments isEnabled=True

# Verify the registry vulnerability assessment extension is enabled
az security pricing show \
  --name Containers \
  --query "extensions[?name=='ContainerRegistriesVulnerabilityAssessments']"
```

View vulnerability scan results:

```bash
# List vulnerable images in registry
az security assessment list \
  --query "[?id contains 'vulnerabilities'].{Name:name, Status:status.code, Severity:status.severity}"

# Get detailed vulnerability report for specific image
az security sub-assessment list \
  --assessed-resource-id /subscriptions/<subscription-id>/resourceGroups/production-rg/providers/Microsoft.ContainerRegistry/registries/myregistry \
  --assessment-name c0b7cfc6-3172-465a-b378-53c7ff2cc0d5
```

Scanning runs automatically when new images are pushed or imported to supported registries, and Defender also performs periodic rescans:

```bash
# Push a new image to trigger registry vulnerability assessment
az acr import \
  --name myregistry \
  --source docker.io/library/nginx:latest \
  --image samples/nginx:latest
```

## Setting Up Runtime Threat Detection

Defender monitors cluster activities for suspicious behavior. Runtime threat detection depends on the Defender sensor being enabled on the AKS cluster:

```bash
# Verify runtime monitoring is enabled
az aks show \
  --resource-group production-rg \
  --name production-cluster \
  --query "securityProfile.defender.securityMonitoring.enabled"

# Enable the Defender sensor if needed
az aks update \
  --resource-group production-rg \
  --name production-cluster \
  --enable-defender
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
  --location <alert-location> \
  --resource-group production-rg
```

## Implementing Security Recommendations

Defender generates security recommendations based on CIS benchmarks and Azure best practices. Review recommendations:

```bash
# List security recommendations
az security assessment list \
  --query "[?resourceDetails.ResourceType=='Microsoft.ContainerService/managedClusters'].{Name:displayName, Severity:status.severity, Status:status.code}"

# Get specific recommendation details
az security assessment show \
  --name <assessment-id>
```

Common recommendations include:

- Enable role-based access control (RBAC)
- Restrict access to Kubernetes API server
- Use Azure Active Directory integration
- Enable audit logging
- Implement network policies
- Enforce Kubernetes admission and workload security policies

Remediate recommendations through Azure Policy:

```bash
# Assign policy to enforce recommendations
POLICY_SET_ID=$(az policy set-definition list \
  --query "[?contains(displayName, 'Kubernetes') && contains(displayName, 'security')].id | [0]" \
  -o tsv)

az policy assignment create \
  --name "enforce-aks-security" \
  --policy-set-definition "$POLICY_SET_ID" \
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

# Create alert rule for Defender security events
az monitor activity-log alert create \
  --name defender-security-events \
  --resource-group production-rg \
  --scope /subscriptions/<subscription-id> \
  --condition category=Security \
  --action-group security-alerts
```

Automate response to specific threats:

```json
{
  "type": "Microsoft.Security/automations",
  "apiVersion": "2019-01-01-preview",
  "name": "defender-container-alert-response",
  "location": "eastus",
  "properties": {
    "isEnabled": true,
    "scopes": [
      {
        "description": "Subscription scope",
        "scopePath": "/subscriptions/<subscription-id>"
      }
    ],
    "sources": [
      {
        "eventSource": "Alerts",
        "ruleSets": [
          {
            "rules": [
              {
                "propertyJPath": "Severity",
                "propertyType": "String",
                "expectedValue": "High",
                "operator": "Equals"
              }
            ]
          }
        ]
      }
    ],
    "actions": [
      {
        "actionType": "LogicApp",
        "logicAppResourceId": "/subscriptions/<subscription-id>/resourceGroups/security-rg/providers/Microsoft.Logic/workflows/defender-response",
        "uri": "https://prod-00.logic.azure.com/workflows/<workflow-id>/triggers/manual/paths/invoke"
      }
    ]
  }
}
```

## Investigating Security Incidents

When Defender raises an alert, investigate using Microsoft Defender for Cloud:

```bash
# Get alert timeline
az security alert show \
  --name <alert-id> \
  --location <alert-location> \
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
SUSPICIOUS_POD=$(az security alert show --name <alert-id> --location <alert-location> --query "properties.extendedProperties.podName" -o tsv)

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

# Check recent AKS network-related activity
az monitor activity-log list \
  --resource-id /subscriptions/<subscription-id>/resourceGroups/production-rg/providers/Microsoft.ContainerService/managedClusters/production-cluster \
  --start-time 2026-02-09T00:00:00Z \
  --query "[?contains(operationName.value, 'network')]"
```

## Integrating with Azure Sentinel

Export Defender alerts to Azure Sentinel for advanced threat hunting:

```bash
# Enable Sentinel connector
az sentinel data-connector create \
  --resource-group security-rg \
  --workspace-name security-workspace \
  --data-connector-id defender-connector \
  --azure-security-center '{"subscriptionId":"<subscription-id>","dataTypes":{"alerts":{"state":"Enabled"}}}'

# Verify connector
az sentinel data-connector show \
  --resource-group security-rg \
  --workspace-name security-workspace \
  --data-connector-id defender-connector
```

Create hunting queries in Sentinel:

```kusto
// Find privilege escalation attempts
SecurityAlert
| where ProviderName in ("Microsoft Defender for Cloud", "Azure Security Center")
| where AlertName contains "privilege"
| extend ClusterName = tostring(ExtendedProperties.ClusterName)
| extend PodName = tostring(ExtendedProperties.PodName)
| project TimeGenerated, AlertName, AlertSeverity, ClusterName, PodName, Description

// Detect crypto-mining activity
SecurityAlert
| where ProviderName in ("Microsoft Defender for Cloud", "Azure Security Center")
| where Description contains "mining" or Description contains "cryptocurrency"
| summarize count() by bin(TimeGenerated, 1h), AlertName
| render timechart
```

## Configuring Just-In-Time Access

If you expose SSH to AKS node VMs, manage just-in-time (JIT) VM access in Microsoft Defender for Cloud, then verify the policy:

```bash
# Get the AKS node resource group
NODE_RG=$(az aks show \
  --resource-group production-rg \
  --name production-cluster \
  --query nodeResourceGroup -o tsv)

# List JIT policies that cover the node resource group
az security jit-policy list \
  --resource-group $NODE_RG \
  --location eastus
```

Request JIT access when needed:

```bash
# Show the configured JIT policy before requesting access in Defender for Cloud
az security jit-policy show \
  --resource-group $NODE_RG \
  --location eastus \
  --name default
```

## Monitoring Defender Performance

Track Defender metrics and resource usage:

```bash
# Check Defender sensor resource consumption
kubectl top pods -n kube-system -l app=defender

# View Defender sensor logs
kubectl logs -n kube-system -l app=defender --tail=100

# Monitor AKS resource metrics while Defender is enabled
az monitor metrics list \
  --resource /subscriptions/<subscription-id>/resourceGroups/production-rg/providers/Microsoft.ContainerService/managedClusters/production-cluster \
  --metric "node_cpu_usage_percentage" \
  --start-time 2026-02-09T00:00:00Z \
  --end-time 2026-02-09T23:59:59Z
```

Query Defender telemetry in Log Analytics:

```kusto
// Defender agent health
ContainerInventory
| where Name contains "defender"
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
# Check sensor pod status
kubectl get pods -n kube-system -l app=defender

# Verify the AKS Defender profile
az aks show \
  --resource-group production-rg \
  --name production-cluster \
  --query "securityProfile.defender"

# Review agent logs for errors
kubectl logs -n kube-system -l app=defender --tail=200 | grep ERROR
```

Handle false positives:

```bash
# Suppress specific alert
az security alert update \
  --name <alert-id> \
  --location <alert-location> \
  --resource-group production-rg \
  --status dismiss

# Create suppression rule
az security alerts-suppression-rule update \
  --rule-name suppress-known-scanner \
  --alert-type "Suspicious process detected" \
  --reason "Other" \
  --comment "Legitimate scanning tool" \
  --state Enabled \
  --expiration-date-utc 2026-12-31T23:59:59Z
```

Microsoft Defender for Containers provides enterprise-grade security for AKS clusters with minimal operational overhead. The automated threat detection and vulnerability scanning capabilities help maintain strong security posture while reducing manual security assessment efforts.
