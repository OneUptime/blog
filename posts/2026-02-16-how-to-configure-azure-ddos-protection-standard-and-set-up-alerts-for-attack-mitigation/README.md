# How to Configure Azure DDoS Protection Standard and Set Up Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, DDoS Protection, Network Security, Azure Monitor, Alert, Mitigation, Public IP

Description: Learn how to enable Azure DDoS Protection Standard, configure it for your virtual networks, and set up alerting to monitor attack mitigation in real time.

---

Distributed Denial of Service (DDoS) attacks are one of the most disruptive threats to any internet-facing application. Azure provides infrastructure-level DDoS protection at no additional cost, and paid Azure DDoS Protection tiers for enhanced protection: Network Protection for virtual networks and IP Protection for individual public IP resources. While infrastructure protection handles common network-layer attacks, DDoS Network Protection provides adaptive tuning based on your specific traffic patterns, real-time attack metrics, detailed diagnostics, and cost protection guarantees.

This guide walks through enabling DDoS Network Protection, associating it with your resources, and setting up alerts so you know immediately when an attack is being mitigated.

## Infrastructure Protection vs. Network Protection

Understanding the difference helps justify the cost of Network Protection:

| Feature | Infrastructure protection (Free) | Network Protection (Paid) |
|---|---|---|
| Protection level | Platform-level, always on | Adaptive, application-specific |
| Traffic monitoring | No per-resource monitoring | Per-resource monitoring and metrics |
| Attack alerts | No | Yes, real-time |
| Diagnostics & logging | No | Full mitigation reports |
| Cost protection | No | Yes, DDoS cost credit during attacks |
| Rapid response support | No | DDoS Rapid Response (DRR) team access |
| Policy tuning | No | Automatic application-specific tuning |

```mermaid
graph TD
    A[Internet Traffic] --> B{Azure Edge}
    B --> C[DDoS Infrastructure Protection]
    C --> D{DDoS Network Protection Enabled?}
    D -->|No| E[Traffic passes to VNet as-is]
    D -->|Yes| F[Adaptive Mitigation]
    F --> G[Attack traffic scrubbed]
    F --> H[Legitimate traffic passes]
    G --> I[Attack metrics and logs generated]
    H --> J[Application receives clean traffic]
```

## Prerequisites

Before enabling DDoS Network Protection:

- Azure subscription with Contributor or Network Contributor role
- At least one virtual network with public IP addresses to protect
- Budget approval - DDoS Network Protection has a fixed monthly charge for each DDoS protection plan
- Understanding that the plan includes up to 100 protected public IP resources across the tenant (additional IPs cost extra)

## Step 1: Create a DDoS Protection Plan

### Via the Azure Portal

1. Navigate to the Azure portal.
2. Search for "DDoS protection plans" and click on it.
3. Click Create.
4. Configure:
   - **Subscription**: Select your subscription
   - **Resource group**: Choose or create a resource group
   - **Name**: Give it a descriptive name like "ddos-protection-plan"
   - **Region**: Select the region closest to your resources
5. Click Review + create, then Create.

### Via PowerShell

```powershell
# Create a DDoS Protection Plan

$ddosPlan = New-AzDdosProtectionPlan `
    -ResourceGroupName "networking-rg" `
    -Name "ddos-protection-plan" `
    -Location "eastus"

Write-Host "DDoS Protection Plan created:"
Write-Host "  Name: $($ddosPlan.Name)"
Write-Host "  Resource ID: $($ddosPlan.Id)"
```

### Via Azure CLI

```bash
# Create a DDoS protection plan
az network ddos-protection create \
    --resource-group networking-rg \
    --name ddos-protection-plan \
    --location eastus
```

## Step 2: Associate the Plan with Virtual Networks

The DDoS protection plan needs to be associated with your virtual networks. All public IP resources within an associated VNet are automatically protected.

```powershell
# Associate the DDoS Protection Plan with a virtual network
$ddosPlan = Get-AzDdosProtectionPlan `
    -ResourceGroupName "networking-rg" `
    -Name "ddos-protection-plan"

$vnet = Get-AzVirtualNetwork `
    -ResourceGroupName "production-rg" `
    -Name "production-vnet"

# Enable DDoS protection on the VNet
$vnet.DdosProtectionPlan = New-Object Microsoft.Azure.Commands.Network.Models.PSResourceId
$vnet.DdosProtectionPlan.Id = $ddosPlan.Id
$vnet.EnableDdosProtection = $true

# Apply the changes
$vnet | Set-AzVirtualNetwork

Write-Host "DDoS Protection enabled on $($vnet.Name)"
```

To protect multiple VNets:

```powershell
# Associate DDoS protection with all production VNets
$ddosPlan = Get-AzDdosProtectionPlan -ResourceGroupName "networking-rg" -Name "ddos-protection-plan"

$vnets = Get-AzVirtualNetwork | Where-Object {
    $_.Name -like "prod-*" -or $_.ResourceGroupName -like "production-*"
}

foreach ($vnet in $vnets) {
    $vnet.DdosProtectionPlan = New-Object Microsoft.Azure.Commands.Network.Models.PSResourceId
    $vnet.DdosProtectionPlan.Id = $ddosPlan.Id
    $vnet.EnableDdosProtection = $true
    $vnet | Set-AzVirtualNetwork
    Write-Host "Protected: $($vnet.Name) in $($vnet.ResourceGroupName)"
}
```

## Step 3: Verify Protection on Public IPs

For public IP addresses attached directly to VM network interfaces, you can check the parent VNet protection setting:

```powershell
# List VM public IPs and their DDoS Network Protection status
$publicIPs = Get-AzPublicIpAddress

foreach ($pip in $publicIPs) {
    # Get the VNet associated with this public IP through a NIC
    $protected = $false

    if ($pip.IpConfiguration) {
        # The public IP is attached to something - check the VNet for NIC-attached IPs
        $nicId = $pip.IpConfiguration.Id
        if ($nicId -match "networkInterfaces") {
            $nicName = ($nicId -split '/')[-3]
            $nicRg = ($nicId -split '/')[4]
            $nic = Get-AzNetworkInterface -Name $nicName -ResourceGroupName $nicRg
            $subnetId = $nic.IpConfigurations[0].Subnet.Id
            $vnetName = ($subnetId -split '/')[8]
            $vnetRg = ($subnetId -split '/')[4]
            $vnet = Get-AzVirtualNetwork -Name $vnetName -ResourceGroupName $vnetRg
            $protected = $vnet.EnableDdosProtection
        }
    }

    $status = if ($protected) { "PROTECTED" } else { "NOT PROTECTED" }
    Write-Host "$($pip.Name) ($($pip.IpAddress)) - $status"
}
```

## Step 4: Configure DDoS Protection Metrics and Diagnostics

Enable diagnostic logging on your public IP addresses to capture DDoS mitigation data:

```powershell
# Enable diagnostic settings on a public IP for DDoS metrics
$publicIP = Get-AzPublicIpAddress -Name "web-app-pip" -ResourceGroupName "production-rg"
$workspace = Get-AzOperationalInsightsWorkspace -ResourceGroupName "monitoring-rg" -Name "central-log-analytics"

$logs = @(
    New-AzDiagnosticSettingLogSettingsObject -Enabled $true -Category "DDoSProtectionNotifications"
    New-AzDiagnosticSettingLogSettingsObject -Enabled $true -Category "DDoSMitigationFlowLogs"
    New-AzDiagnosticSettingLogSettingsObject -Enabled $true -Category "DDoSMitigationReports"
)

$metrics = @(
    New-AzDiagnosticSettingMetricSettingsObject -Enabled $true -Category "AllMetrics"
)

# Create diagnostic setting to capture DDoS-specific logs and metrics
New-AzDiagnosticSetting `
    -ResourceId $publicIP.Id `
    -Name "ddos-diagnostics" `
    -WorkspaceId $workspace.ResourceId `
    -Log $logs `
    -Metric $metrics

Write-Host "DDoS diagnostics enabled for $($publicIP.Name)"
```

The three log categories provide different levels of detail:

- **DDoSProtectionNotifications**: Alerts when mitigation starts and stops
- **DDoSMitigationFlowLogs**: Detailed per-flow information during an attack (very detailed)
- **DDoSMitigationReports**: Summary reports after mitigation completes

## Step 5: Set Up DDoS Attack Alerts

Configure alerts that fire when a DDoS attack is detected:

### Alert on Mitigation Triggered

```powershell
# Create an alert that fires when DDoS mitigation is triggered on a public IP
$publicIP = Get-AzPublicIpAddress -Name "web-app-pip" -ResourceGroupName "production-rg"

# Create the metric alert condition
# The "IfUnderDDoSAttack" metric equals 1 when an attack is active
$condition = New-AzMetricAlertRuleV2Criteria `
    -MetricName "IfUnderDDoSAttack" `
    -MetricNameSpace "Microsoft.Network/publicIPAddresses" `
    -TimeAggregation Maximum `
    -Operator GreaterThanOrEqual `
    -Threshold 1

# Create an action group for notifications
$emailReceiver = New-AzActionGroupEmailReceiverObject `
    -Name "SecurityTeam" `
    -EmailAddress "security-team@contoso.com"

$actionGroup = New-AzActionGroup `
    -ResourceGroupName "monitoring-rg" `
    -Name "ddos-alert-group" `
    -Location "global" `
    -GroupShortName "DDoSAlert" `
    -EmailReceiver $emailReceiver `
    -Enabled

# Create the alert rule
Add-AzMetricAlertRuleV2 `
    -Name "DDoS Attack Detected" `
    -ResourceGroupName "monitoring-rg" `
    -WindowSize (New-TimeSpan -Minutes 5) `
    -Frequency (New-TimeSpan -Minutes 1) `
    -TargetResourceId $publicIP.Id `
    -Condition $condition `
    -ActionGroupId $actionGroup.Id `
    -Severity 0 `
    -Description "A DDoS attack has been detected and mitigation is active."

Write-Host "DDoS attack alert configured."
```

### Alert on High TCP Mitigation Trigger Rate

```powershell
# Alert when the inbound TCP packets-to-trigger-mitigation metric exceeds a threshold
# This indicates traffic is approaching or exceeding the automatically tuned TCP mitigation policy
$condition = New-AzMetricAlertRuleV2Criteria `
    -MetricName "DDoSTriggerTCPPackets" `
    -MetricNameSpace "Microsoft.Network/publicIPAddresses" `
    -TimeAggregation Maximum `
    -Operator GreaterThan `
    -Threshold 100000  # Adjust based on your normal traffic volume

Add-AzMetricAlertRuleV2 `
    -Name "High DDoS Packet Rate" `
    -ResourceGroupName "monitoring-rg" `
    -WindowSize (New-TimeSpan -Minutes 5) `
    -Frequency (New-TimeSpan -Minutes 1) `
    -TargetResourceId $publicIP.Id `
    -Condition $condition `
    -ActionGroupId $actionGroup.Id `
    -Severity 1 `
    -Description "High TCP packet rate detected - possible DDoS attack ramping up."

Write-Host "Packet rate alert configured."
```

## Step 6: Monitor During an Attack

When a DDoS attack is active, you can monitor the mitigation in real time:

1. Go to the public IP resource in the Azure portal.
2. Click on Metrics.
3. Add the following metrics:
   - **Under DDoS attack or not** (1 = under attack)
   - **Inbound packets dropped DDoS** (packets being scrubbed)
   - **Inbound packets forwarded DDoS** (clean traffic reaching your app)
   - **Inbound TCP packets DDoS** (total TCP packets arriving)

You can also query mitigation details in Log Analytics:

```kusto
// Query DDoS mitigation flow logs during an active attack
// Shows what traffic is being dropped vs forwarded
AzureDiagnostics
| where Category == "DDoSMitigationFlowLogs"
| where TimeGenerated > ago(1h)
| summarize FlowCount = count()
    by Message, Protocol, SourcePublicIpAddress, DestPublicIpAddress, bin(TimeGenerated, 5m)
| render timechart
```

## Step 7: Review Post-Attack Reports

After an attack ends, review the mitigation report:

```kusto
// Get DDoS mitigation reports for post-attack analysis
AzureDiagnostics
| where Category == "DDoSMitigationReports"
| where TimeGenerated > ago(7d)
| project
    TimeGenerated,
    AttackVectors,
    TrafficOverview,
    DropReasons,
    TopSourceCountries,
    MitigationPeriodStart,
    MitigationPeriodEnd
```

## DDoS Cost Protection

One often-overlooked benefit of DDoS Network Protection is cost protection. During a DDoS attack, your resources may scale out or incur extra data-transfer costs. Microsoft provides service credits for documented DDoS-related data-transfer and application scale-out costs.

To claim credits, file a support request with the mitigation report as evidence.

## Conclusion

Azure DDoS Network Protection provides enterprise-grade DDoS protection that goes well beyond the basic platform protection. The setup involves creating a DDoS protection plan, associating it with your virtual networks, enabling diagnostics on public IP addresses, and configuring alerts for real-time notification during attacks. While the monthly cost is significant, the protection it provides against Layer 3 and Layer 4 volumetric and protocol attacks, combined with the cost protection guarantee and access to the DDoS Rapid Response team, makes it essential for organizations running internet-facing workloads in Azure. For Layer 7 application attacks, combine Azure DDoS Protection with a web application firewall. Set up your alerts and diagnostics before an attack happens, not during one.
