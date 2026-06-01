# How to Configure Azure DDoS Protection with Telemetry and Alerting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, DDoS Protection, Security, Telemetry, Alerting, Networking, Monitoring

Description: A step-by-step guide to configuring Azure DDoS Protection with telemetry, diagnostic logging, and alerting to detect and respond to distributed denial-of-service attacks.

---

Distributed denial-of-service attacks are not a matter of if but when. Any public-facing Azure resource is a potential target. Azure includes infrastructure-level DDoS protection at no additional cost, and offers paid DDoS Protection tiers: DDoS IP Protection for individual public IP resources and DDoS Network Protection for resources in protected VNets.

The infrastructure-level protection handles attacks at the platform level, but it does not give you workload-specific visibility into what is happening. You will not know you are under attack until your service degrades. DDoS Network Protection adds the telemetry, diagnostics, and alerting that let you see attacks in real time and respond accordingly.

In this post, I will walk through enabling DDoS Protection, configuring telemetry, setting up alerts, and integrating with your monitoring workflow.

## DDoS Protection Tiers Compared

| Feature | Infrastructure protection | IP Protection | Network Protection |
|---------|---------------------------|---------------|-------------------|
| Always-on monitoring | Yes | Yes | Yes |
| Automatic attack mitigation | Yes | Yes | Yes |
| Adaptive tuning to your traffic | No | Yes | Yes |
| Attack telemetry and metrics | No | Yes | Yes |
| Diagnostic logs | No | Yes | Yes |
| Alert notifications | No | Yes | Yes |
| DDoS Rapid Response support | No | No | Yes |
| Cost protection (credits for scaling during attack) | No | No | Yes |
| WAF discount | No | No | Yes |

For any production workload, DDoS Network Protection is worth the investment. The adaptive tuning alone makes a significant difference because it learns your normal traffic patterns and sets mitigation thresholds accordingly.

## Step 1: Create a DDoS Protection Plan

```bash
# Create a DDoS Protection Plan

az network ddos-protection create \
  --resource-group myResourceGroup \
  --name myDDoSPlan \
  --location eastus
```

A single DDoS plan can protect resources across multiple VNets and subscriptions. You do not need one plan per VNet.

## Step 2: Associate the Plan with Your VNet

```bash
# Associate the DDoS plan with your VNet
az network vnet update \
  --resource-group myResourceGroup \
  --name myVNet \
  --ddos-protection true \
  --ddos-protection-plan myDDoSPlan
```

After this, eligible public IP resources in the VNet are protected by DDoS Network Protection.

## Step 3: Verify Protected Resources

Check which public IPs are protected:

```bash
# List public IPs in the VNet and their protection status
az network public-ip list \
  --resource-group myResourceGroup \
  --query "[].{name:name, ip:ipAddress, sku:sku.name, protection:ddosSettings.protectionMode}" \
  --output table
```

For public IPs protected through the VNet-level DDoS Network Protection plan, `VirtualNetworkInherited` indicates the IP inherits protection from the VNet. DDoS IP Protection, which is enabled directly on a public IP resource, supports only Standard SKU public IPs.

## Step 4: Enable Diagnostic Logging

This is where the telemetry comes in. Enable diagnostic settings on your protected public IPs to capture DDoS-related logs:

```bash
# Enable diagnostic logging for a protected public IP
az monitor diagnostic-settings create \
  --resource "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Network/publicIPAddresses/myPublicIP" \
  --name ddosDiagnostics \
  --workspace myLogAnalyticsWorkspace \
  --logs '[
    {"category":"DDoSProtectionNotifications","enabled":true},
    {"category":"DDoSMitigationFlowLogs","enabled":true},
    {"category":"DDoSMitigationReports","enabled":true}
  ]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
```

The three log categories:

- **DDoSProtectionNotifications:** Alerts when an attack starts and stops. This is the most important log for operational awareness.
- **DDoSMitigationFlowLogs:** Detailed packet-level information during an active attack. Useful for post-incident analysis.
- **DDoSMitigationReports:** Summary reports after mitigation completes. Includes attack vectors, peak traffic, and duration.

## Step 5: Configure DDoS Metrics

Azure Monitor provides real-time metrics for DDoS-protected resources. Key metrics include:

- **Under DDoS attack or not:** Binary indicator (0 or 1)
- **Inbound packets dropped (DDoS):** Packets dropped during mitigation
- **Inbound packets forwarded (DDoS):** Legitimate packets allowed through
- **Inbound bytes dropped (DDoS):** Volume of malicious traffic dropped
- **Inbound TCP/UDP/SYN packets:** Protocol-specific metrics

View metrics from the CLI:

```bash
# Check if currently under attack
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Network/publicIPAddresses/myPublicIP" \
  --metrics "IfUnderDDoSAttack" \
  --interval PT1M \
  --output table

# Check inbound packets dropped during mitigation
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Network/publicIPAddresses/myPublicIP" \
  --metrics "PacketsDroppedDDoS" \
  --interval PT5M \
  --aggregation Maximum \
  --output table
```

## Step 6: Set Up Attack Alerts

Configure alerts to notify your team when a DDoS attack is detected:

```bash
# Alert when a DDoS attack is detected
az monitor metrics alert create \
  --resource-group myResourceGroup \
  --name ddosAttackAlert \
  --scopes "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Network/publicIPAddresses/myPublicIP" \
  --condition "max IfUnderDDoSAttack > 0" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action securityTeam \
  --severity 1 \
  --description "DDoS attack detected on myPublicIP"
```

Set up additional alerts for traffic volume:

```bash
# Alert when the dropped-packet rate exceeds a threshold
az monitor metrics alert create \
  --resource-group myResourceGroup \
  --name ddosDroppedPacketsAlert \
  --scopes "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Network/publicIPAddresses/myPublicIP" \
  --condition "max PacketsDroppedDDoS > 10000" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action securityTeam \
  --severity 2 \
  --description "High rate of DDoS-dropped packets on myPublicIP"
```

## Step 7: Create a DDoS Monitoring Dashboard

Build a workbook or dashboard in Azure Monitor for a real-time view of DDoS activity:

```text
// KQL query for DDoS attack notifications
AzureDiagnostics
| where Category == "DDoSProtectionNotifications"
| project
    TimeGenerated,
    PublicIpAddress,
    Type,
    Message
| order by TimeGenerated desc

// KQL query for active mitigation details
AzureDiagnostics
| where Category == "DDoSMitigationFlowLogs"
| project
    TimeGenerated,
    SourcePublicIpAddress,
    SourcePort,
    DestPublicIpAddress,
    DestPort,
    Protocol,
    Message
| order by TimeGenerated desc

// KQL query for post-attack report
AzureDiagnostics
| where Category == "DDoSMitigationReports"
| project
    TimeGenerated,
    IPAddress,
    ReportType,
    MitigationPeriodStart,
    MitigationPeriodEnd,
    AttackVectors,
    TrafficOverview,
    Protocols,
    DropReasons
| order by TimeGenerated desc
```

## Understanding Adaptive Tuning

DDoS Network Protection learns your application's normal traffic patterns over time. It uses this baseline to set mitigation thresholds. For example, if your application normally receives 10,000 packets per second, a sudden spike to 100,000 packets per second triggers mitigation.

Adaptive tuning profiles your traffic over time and updates the mitigation profile as your traffic patterns change. As the profile becomes more tailored to your workload, it helps reduce false positives.

```mermaid
graph TD
    A[Enable DDoS Protection] --> B[Traffic Profiling Over Time]
    B --> C[Mitigation Profile Tuned]
    C --> D{Traffic Anomaly Detected?}
    D -->|Yes| E[Activate Mitigation]
    D -->|No| F[Normal Operation]
    E --> G[Drop Malicious Traffic]
    E --> H[Forward Legitimate Traffic]
    E --> I[Send Notification]
    G --> J[Log Metrics and Flow Data]
```

## Multi-VNet and Multi-Subscription Protection

A single DDoS plan can protect multiple VNets across subscriptions:

```bash
# Associate the plan with a VNet in a different subscription
az network vnet update \
  --resource-group rgOtherSub \
  --name vnetOtherSub \
  --ddos-protection true \
  --ddos-protection-plan "/subscriptions/<plan-sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Network/ddosProtectionPlans/myDDoSPlan"
```

The DDoS plan is billed per plan (not per VNet), so using one plan across multiple VNets is the most cost-effective approach.

## Integrating with SIEM

For organizations using a SIEM (Security Information and Event Management) tool, export DDoS logs via Event Hub:

```bash
# Export DDoS diagnostics to Event Hub for SIEM integration
az monitor diagnostic-settings create \
  --resource "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.Network/publicIPAddresses/myPublicIP" \
  --name ddosSIEMExport \
  --event-hub ddosEvents \
  --event-hub-rule "/subscriptions/<sub-id>/resourceGroups/myResourceGroup/providers/Microsoft.EventHub/namespaces/myEventHubNamespace/authorizationrules/RootManageSharedAccessKey" \
  --logs '[
    {"category":"DDoSProtectionNotifications","enabled":true},
    {"category":"DDoSMitigationReports","enabled":true}
  ]'
```

This feeds DDoS events into your SIEM for correlation with other security events.

## Incident Response Playbook

When a DDoS alert fires, here is a practical response workflow:

1. **Acknowledge the alert.** Confirm the attack is real (not a legitimate traffic spike like a marketing campaign going viral).
2. **Check mitigation status.** View the DDoS metrics to see if Azure is actively mitigating.
3. **Monitor service health.** Check if your application is still responding normally despite the attack.
4. **Review mitigation flow logs.** Identify the attack vectors (SYN flood, UDP amplification, etc.).
5. **Engage DDoS Rapid Response** if the attack is severe and mitigation is not effective (available with Network Protection).
6. **Post-incident review.** After the attack ends, review the mitigation report for lessons learned.

## Cost Considerations

DDoS Network Protection has a fixed monthly cost plus per-resource charges for protected resources above the included allowance. This covers up to 100 public IP resources. Additional public IPs are charged per resource.

The cost protection benefit offsets costs incurred during an attack (like autoscaling compute resources to absorb traffic). If an attack causes your VMs or App Services to scale up, Microsoft provides credits to cover the additional infrastructure cost.

## Common Issues

**Alerts not firing.** Verify diagnostic settings are configured on each protected public IP individually. The DDoS plan protects the resources, but diagnostics must be enabled per public IP.

**False positives during legitimate traffic spikes.** This can happen soon after enablement or after traffic pattern changes. DDoS Rapid Response can help tune the mitigation thresholds.

**Confusing public IP SKU eligibility.** DDoS Network Protection supports both Standard and Basic public IP tiers, while DDoS IP Protection supports only Standard SKU public IPs. For new deployments, use Standard SKU public IPs unless you have a specific legacy requirement.

## Summary

Azure DDoS Network Protection provides the visibility and control you need to handle DDoS attacks confidently. Enable the protection plan, associate it with your VNets, configure diagnostic logging on each protected public IP, and set up alerts for attack detection and dropped packet thresholds. The adaptive tuning learns your traffic patterns to minimize false positives, and the telemetry gives you real-time visibility into attacks. Combined with a clear incident response playbook and SIEM integration, you get a comprehensive DDoS defense that lets you detect, mitigate, and learn from attacks systematically.
