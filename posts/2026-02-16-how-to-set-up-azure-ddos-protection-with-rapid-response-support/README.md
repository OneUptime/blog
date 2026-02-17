# How to Set Up Azure DDoS Protection with Rapid Response Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, DDoS Protection, Security, Network Security, Incident Response, High Availability

Description: Learn how to deploy Azure DDoS Protection Standard with Rapid Response support for fast mitigation during distributed denial-of-service attacks.

---

Distributed denial-of-service attacks are one of those threats you can plan for but never fully predict. When an attack hits and your services start degrading, the speed of your response determines whether it is a minor blip or a major outage. Azure DDoS Protection Standard combined with DDoS Rapid Response (DRR) gives you both automated mitigation and access to Microsoft's DDoS experts who can help during active attacks.

This guide covers how to set up DDoS Protection Standard, enable Rapid Response support, configure alerting, and tune your protection policies.

## Azure DDoS Protection Tiers

Azure offers two tiers of DDoS protection:

**DDoS Infrastructure Protection (Basic)**: This is enabled by default for every Azure resource with a public IP. It provides always-on traffic monitoring and real-time mitigation of common network-layer attacks. There is no extra cost, but you also get no customization, no metrics, and no support during attacks.

**DDoS Network Protection (Standard)**: This is the paid tier that provides enhanced mitigation capabilities, attack analytics, diagnostic logs, and access to the DDoS Rapid Response team. It protects all public IP resources in a virtual network and gives you attack-specific metrics and alerts.

For any production workload that faces the internet, Standard is what you want.

## Prerequisites

Before setting up DDoS Protection, ensure you have:

- An Azure subscription with Contributor or Owner role
- At least one virtual network with resources that have public IP addresses
- Azure Monitor configured for your subscription
- A support plan that includes DDoS Rapid Response access (requires Premier, Unified, or specific DDoS support plans)

## Step 1: Create a DDoS Protection Plan

A DDoS Protection plan is a resource that you create once and then associate with one or more virtual networks. A single plan can protect VNets across different regions and subscriptions within the same Azure AD tenant.

```bash
# Create a DDoS Protection plan
az network ddos-protection create \
  --name myDdosProtectionPlan \
  --resource-group myResourceGroup \
  --location eastus
```

The plan itself is region-specific for billing purposes but can be linked to VNets in any region.

## Step 2: Associate the Plan with Your Virtual Networks

Link the DDoS Protection plan to each VNet that contains resources you want to protect:

```bash
# Get the DDoS plan resource ID
DDOS_PLAN_ID=$(az network ddos-protection show \
  --name myDdosProtectionPlan \
  --resource-group myResourceGroup \
  --query id -o tsv)

# Associate the plan with a virtual network
az network vnet update \
  --name myVNet \
  --resource-group myResourceGroup \
  --ddos-protection-plan $DDOS_PLAN_ID \
  --ddos-protection true
```

Once associated, every public IP resource in that VNet is automatically protected. This includes public IPs attached to VMs, load balancers, application gateways, and any other resource with a public endpoint.

## Step 3: Configure DDoS Diagnostic Logging

Diagnostic logs are essential for understanding attacks and validating that mitigation is working. Enable diagnostics on the public IPs you want to monitor:

```bash
# Enable DDoS diagnostic logs for a public IP
az monitor diagnostic-settings create \
  --name "ddos-diagnostics" \
  --resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Network/publicIPAddresses/myPublicIP" \
  --workspace "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.OperationalInsights/workspaces/myWorkspace" \
  --logs '[
    {"category": "DDoSProtectionNotifications", "enabled": true},
    {"category": "DDoSMitigationFlowLogs", "enabled": true},
    {"category": "DDoSMitigationReports", "enabled": true}
  ]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

The three log categories give you different levels of detail:

- **DDoSProtectionNotifications**: Alerts when mitigation starts and stops
- **DDoSMitigationFlowLogs**: Detailed per-flow information during an attack showing dropped and forwarded traffic
- **DDoSMitigationReports**: Post-attack summary reports with aggregated statistics

## Step 4: Set Up Attack Alerts

You want to know immediately when an attack is detected. Configure Azure Monitor alerts on DDoS metrics:

```bash
# Create an action group for DDoS alerts
az monitor action-group create \
  --name DDoSAlertGroup \
  --resource-group myResourceGroup \
  --short-name DDoSAlert \
  --action email ddos-team ddos-team@mycompany.com \
  --action webhook ddos-webhook "https://hooks.mycompany.com/ddos-alert"

# Create an alert rule for when DDoS mitigation is triggered
az monitor metrics alert create \
  --name "DDoS Attack Detected" \
  --resource-group myResourceGroup \
  --scopes "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Network/publicIPAddresses/myPublicIP" \
  --condition "avg IfUnderDDoSAttack > 0" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action DDoSAlertGroup \
  --severity 1 \
  --description "Alert when DDoS attack mitigation is active"
```

You should also create alerts for specific traffic metrics to catch attacks that might not trigger full mitigation:

```bash
# Alert on unusually high inbound packet count
az monitor metrics alert create \
  --name "High Inbound Packets" \
  --resource-group myResourceGroup \
  --scopes "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Network/publicIPAddresses/myPublicIP" \
  --condition "total InboundPacketsDroppedDDoS > 10000" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action DDoSAlertGroup \
  --severity 2 \
  --description "Alert on high inbound packet drop rate during DDoS mitigation"
```

## Step 5: Enable DDoS Rapid Response

DDoS Rapid Response (DRR) gives you access to Microsoft's DDoS engineering team during an active attack. They can help with real-time investigation, custom mitigations, and post-attack analysis.

To enable DRR, you need:

1. A DDoS Protection Standard plan in place (completed in Step 1)
2. A qualifying support plan (Premier, Unified, or a plan that specifically includes DRR)

To engage DRR during an active attack, you create a support request:

1. Go to the Azure portal and open **Help + support**
2. Select **Create a support request**
3. Set Issue type to **Technical**
4. Set Service to **DDoS Protection**
5. Set Problem type to **Active attack**
6. Set Severity to **A - Critical Impact**

The DRR team will be engaged automatically for Severity A requests related to DDoS. They typically respond within 15 minutes during business hours and aim for rapid engagement during off-hours.

## Step 6: Configure DDoS Policy Tuning

DDoS Protection Standard automatically learns your traffic patterns and sets mitigation thresholds. However, you can review and tune these thresholds if the automatic values do not match your expected traffic profile.

The key metrics to watch are:

- **SYN packets threshold**: The rate of SYN packets per second that triggers mitigation
- **TCP packets threshold**: The rate of TCP packets per second
- **UDP packets threshold**: The rate of UDP packets per second

You can view the current thresholds in Azure Monitor metrics:

```bash
# Query current DDoS policy thresholds for a public IP
az monitor metrics list \
  --resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Network/publicIPAddresses/myPublicIP" \
  --metric "DDoSTriggerSYNPackets" "DDoSTriggerTCPPackets" "DDoSTriggerUDPPackets" \
  --interval PT1H \
  --output table
```

If the automatic thresholds are too low and causing false positives, you can raise them. If they are too high and attacks are not being caught, you can lower them. This tuning is done in collaboration with the DRR team for best results.

## Step 7: Set Up Cost Protection

One benefit of DDoS Protection Standard that people often overlook is cost protection. During a DDoS attack, your Azure resources might scale out automatically (if you are using auto-scaling), which increases your bill. DDoS Protection Standard includes cost protection that provides service credits for resource costs incurred during a documented DDoS attack.

To claim cost protection credits:

1. File a DDoS attack claim within 30 days of the attack
2. Provide the attack start and end times
3. Provide the affected resource IDs
4. Show that DDoS Protection Standard was enabled at the time of the attack

The credit covers scale-out costs for VMs, Application Gateway, bandwidth, and other protected resources.

## Monitoring During an Attack

When an attack is in progress, here are the key metrics to watch in Azure Monitor:

- **IfUnderDDoSAttack**: Binary indicator showing whether mitigation is active
- **InboundPacketsDroppedDDoS**: Packets dropped by DDoS mitigation
- **InboundPacketsForwardedDDoS**: Packets forwarded to the destination after mitigation
- **BytesDroppedDDoS**: Total bytes dropped
- **BytesForwardedDDoS**: Total bytes forwarded

A healthy mitigation shows a high drop rate for malicious traffic and stable forwarded traffic matching your normal baseline.

## Best Practices

**Enable on all production VNets**: The cost of DDoS Protection Standard is per-plan, not per-VNet. Once you have a plan, protecting additional VNets is free (up to 100 public IPs; then there is a per-IP charge).

**Pre-register for Rapid Response**: Do not wait for an attack to figure out the engagement process. Have a runbook ready with the steps to create a Severity A support request.

**Baseline your traffic**: Let DDoS Protection monitor your normal traffic patterns for at least two weeks before relying on automatic tuning. The more baseline data it has, the better the automatic thresholds will be.

**Test your alerts**: Use Azure Monitor alert testing to verify that your email and webhook notifications work before you actually need them.

## Wrapping Up

Azure DDoS Protection Standard with Rapid Response support gives you a solid defense against volumetric and protocol-level DDoS attacks. The key steps are creating a protection plan, associating it with your VNets, enabling diagnostic logging, setting up alerts, and knowing how to engage the DRR team when an attack hits. The automatic mitigation handles most attacks without intervention, but having Rapid Response available for complex or persistent attacks provides the safety net that production workloads need.
