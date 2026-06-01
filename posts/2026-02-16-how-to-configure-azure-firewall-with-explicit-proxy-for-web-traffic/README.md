# How to Configure Azure Firewall with Explicit Proxy for Web Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Firewall, Explicit Proxy, Web Traffic, HTTP Proxy, Network Security

Description: Configure Azure Firewall as an explicit HTTP/HTTPS proxy to centralize web traffic filtering without requiring UDR-based traffic redirection.

---

Azure Firewall traditionally operates in transparent mode, where traffic is redirected to the firewall through User Defined Routes (UDRs) without the client knowing the firewall exists. The explicit proxy feature changes this model by allowing clients to configure Azure Firewall as their HTTP/HTTPS proxy directly. Clients send their web requests to the firewall's proxy endpoint, and the firewall filters and forwards the traffic. This is useful in environments where UDR-based routing is not practical or where you need proxy-aware traffic handling.

This guide walks through enabling and configuring the explicit proxy feature on Azure Firewall, including PAC file distribution and client configuration.

## When to Use Explicit Proxy

Explicit proxy mode is useful in several scenarios:

- **Guest networks or BYOD**: Devices that are not domain-joined and cannot have UDRs applied to their subnet
- **Multiple tenants**: When different subnets need different proxy configurations
- **Legacy applications**: Apps that are proxy-aware but do not work well with transparent interception
- **Compliance requirements**: Some regulatory frameworks require explicit proxy configurations for audit trail purposes
- **VDI environments**: Virtual desktop environments where configuring individual proxy settings is easier than managing complex UDR chains

The explicit proxy feature is available in preview on Azure Firewall Premium and Standard tiers.

## Prerequisites

- Azure Firewall (Standard or Premium) deployed in your VNet
- A Firewall Policy associated with the firewall
- Client machines or VMs that can be configured to use a proxy
- Azure CLI installed with the `azure-firewall` extension

## Step 1: Enable Explicit Proxy on the Firewall Policy

Enable the explicit proxy feature on your Firewall Policy:

```bash
# Enable explicit proxy on the Firewall Policy

# Port 8080 is the default proxy listening port
az network firewall policy update \
  --name myFirewallPolicy \
  --resource-group myResourceGroup \
  --explicit-proxy enableExplicitProxy=true \
                   httpPort=8080 \
                   httpsPort=8443 \
                   enablePacFile=true \
                   pacFilePort=8081 \
                   pacFile="https://mystorageaccount.blob.core.windows.net/proxy/proxy.pac?<sas-token>"
```

Parameters explained:

- **httpPort**: The port the firewall listens on for HTTP proxy requests (default 8080)
- **httpsPort**: The port for HTTPS proxy requests (default 8443)
- **enablePacFile**: Enable serving a PAC (Proxy Auto-Configuration) file
- **pacFilePort**: The port for serving the PAC file
- **pacFile**: SAS URL to the PAC file that the firewall downloads and serves to clients

## Step 2: Create a PAC File

A PAC (Proxy Auto-Configuration) file tells clients which requests should go through the proxy and which should go direct. Create a PAC file that routes web traffic through the firewall proxy while allowing internal traffic to go direct:

```javascript
// proxy.pac - Proxy Auto-Configuration file
// Defines which traffic goes through the Azure Firewall proxy
// and which traffic bypasses it

function FindProxyForURL(url, host) {
    // Direct access for internal/private addresses
    if (isInNet(host, "10.0.0.0", "255.0.0.0") ||
        isInNet(host, "172.16.0.0", "255.240.0.0") ||
        isInNet(host, "192.168.0.0", "255.255.0.0")) {
        return "DIRECT";
    }

    // Direct access for localhost
    if (host === "localhost" || host === "127.0.0.1") {
        return "DIRECT";
    }

    // Direct access for Azure management endpoints
    if (dnsDomainIs(host, ".azure.com") ||
        dnsDomainIs(host, ".microsoft.com") ||
        dnsDomainIs(host, ".microsoftonline.com")) {
        return "DIRECT";
    }

    // Send all other HTTP traffic through the firewall proxy
    // The IP 10.0.0.4 is the Azure Firewall's private IP
    return "PROXY 10.0.0.4:8080; DIRECT";
}
```

Upload the PAC file to a storage container and generate a read-only SAS URL that the firewall can use to download it. Azure Blob Storage works well:

```bash
# Upload the PAC file to blob storage
az storage blob upload \
  --account-name mystorageaccount \
  --container-name proxy \
  --name proxy.pac \
  --file proxy.pac \
  --content-type "application/x-ns-proxy-autoconfig"

# Generate a read-only SAS URL for the firewall policy pacFile setting
az storage blob generate-sas \
  --account-name mystorageaccount \
  --container-name proxy \
  --name proxy.pac \
  --permissions r \
  --expiry 2026-12-31T23:59:59Z \
  --full-uri
```

## Step 3: Configure Application Rules for Proxy Traffic

When using explicit proxy mode, you still need application rules to define what traffic is allowed. The difference is that the source is the proxy client's IP, and the firewall evaluates the request based on the FQDN in the HTTP CONNECT method (for HTTPS) or the Host header (for HTTP).

```bash
# Create a rule collection group for proxy rules
az network firewall policy rule-collection-group create \
  --name ProxyRules \
  --policy-name myFirewallPolicy \
  --resource-group myResourceGroup \
  --priority 400

# Allow general web browsing
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "AllowWebBrowsing" \
  --policy-name myFirewallPolicy \
  --resource-group myResourceGroup \
  --rule-collection-group-name ProxyRules \
  --collection-priority 100 \
  --action Allow \
  --rule-name "AllowHTTPS" \
  --rule-type ApplicationRule \
  --source-addresses "10.0.0.0/16" \
  --protocols Https=443 Http=80 \
  --target-fqdns "*"

# Block a specific web category
az network firewall policy rule-collection-group collection add-filter-collection \
  --name "BlockRiskySites" \
  --policy-name myFirewallPolicy \
  --resource-group myResourceGroup \
  --rule-collection-group-name ProxyRules \
  --collection-priority 200 \
  --action Deny \
  --rule-name "DenyGambling" \
  --rule-type ApplicationRule \
  --source-addresses "10.0.0.0/16" \
  --protocols Https=443 Http=80 \
  --web-categories Gambling
```

## Step 4: Configure Clients to Use the Proxy

Clients need to be configured to send their web traffic to the Azure Firewall's proxy endpoint. There are several ways to do this:

**Using a PAC file URL (recommended)**:

On Windows, you can configure this via Group Policy:

1. Open Group Policy Editor
2. Navigate to User Configuration > Preferences > Windows Settings > Registry
3. Create an `AutoConfigURL` string value under `HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings` with the value `http://10.0.0.4:8081/proxy.pac`

Or configure it via PowerShell:

```powershell
# Set the proxy auto-configuration URL via registry
# This configures the system to use the PAC file served by Azure Firewall

Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" `
  -Name AutoConfigURL -Value "http://10.0.0.4:8081/proxy.pac"

# Or set an explicit proxy
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" `
  -Name ProxyEnable -Value 1
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings" `
  -Name ProxyServer -Value "10.0.0.4:8080"
```

**On Linux VMs**:

```bash
# Set environment variables for proxy configuration
# Add these to /etc/environment for system-wide settings
export http_proxy="http://10.0.0.4:8080"
export https_proxy="http://10.0.0.4:8443"
export no_proxy="localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
```

**For Docker containers**:

```bash
# Configure Docker daemon to use the proxy
# Add to /etc/docker/daemon.json
{
  "proxies": {
    "http-proxy": "http://10.0.0.4:8080",
    "https-proxy": "http://10.0.0.4:8443",
    "no-proxy": "localhost,127.0.0.1,10.0.0.0/8"
  }
}
```

## Step 5: Configure TLS Inspection with Explicit Proxy

If you are using Azure Firewall Premium, you can combine explicit proxy with TLS inspection for deep packet inspection of HTTPS traffic:

```bash
# Enable TLS inspection on the proxy application rules
# This requires the TLS inspection certificate to be configured
az network firewall policy rule-collection-group collection rule add \
  --name "InspectHTTPS" \
  --policy-name myFirewallPolicy \
  --resource-group myResourceGroup \
  --rule-collection-group-name ProxyRules \
  --collection-name "AllowWebBrowsing" \
  --rule-type ApplicationRule \
  --source-addresses "10.0.0.0/16" \
  --protocols Https=443 \
  --target-fqdns "*" \
  --enable-tls-inspection true
```

With explicit proxy and TLS inspection, the firewall can inspect the full HTTP request and response, including URLs, headers, and body content for HTTPS traffic.

## Step 6: Monitor Proxy Activity

Enable diagnostic logging to track proxy usage:

```bash
# Enable diagnostic logging for the firewall
az monitor diagnostic-settings create \
  --name "firewall-proxy-logs" \
  --resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Network/azureFirewalls/myFirewall" \
  --workspace "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.OperationalInsights/workspaces/myWorkspace" \
  --logs '[
    {"category": "AzureFirewallApplicationRule", "enabled": true},
    {"category": "AzureFirewallNetworkRule", "enabled": true}
  ]'
```

Query proxy activity in Log Analytics:

```text
// KQL query to see proxy traffic through Azure Firewall
AzureDiagnostics
| where Category == "AzureFirewallApplicationRule"
| where msg_s contains "Http" or msg_s contains "Https"
| parse msg_s with * "from " sourceIP ":" sourcePort " to " destinationFQDN ":" destinationPort ". Action: " action "." *
| project TimeGenerated, sourceIP, destinationFQDN, destinationPort, action
| order by TimeGenerated desc
| take 100
```

## Explicit Proxy vs Transparent Proxy

Here is a comparison to help you decide which mode to use:

| Feature | Explicit Proxy | Transparent (UDR) |
|---------|---------------|-------------------|
| Client configuration | Required (proxy settings) | None (UDR handles routing) |
| Protocol support | HTTP/HTTPS only | All protocols |
| FQDN visibility | Always available | Requires SNI for HTTPS |
| Client IP tracking | Source IP is visible to the firewall; forwarded traffic is proxied | Source IP preserved through routing |
| Non-web traffic | Not intercepted | Intercepted by firewall |
| Setup difficulty | Client config needed | UDR setup needed |
| PAC file support | Yes | N/A |

For most environments, a combination works best: use UDR-based transparent mode for general traffic and explicit proxy for web traffic that needs special handling.

## Troubleshooting

**Clients cannot reach the proxy**: Verify that the NSG on the client's subnet allows outbound traffic to the firewall's private IP on the proxy ports (8080, 8443, 8081).

**PAC file not loading**: Check that the firewall can download the PAC file from the configured read-only SAS URL and that clients can reach the firewall's PAC file port. Also verify the content type is set to `application/x-ns-proxy-autoconfig`.

**HTTPS connections failing**: If TLS inspection is not enabled, HTTPS proxy connections use the CONNECT method. Make sure your application rules allow the CONNECT method for the destination FQDNs.

**Authentication issues**: Azure Firewall explicit proxy does not support proxy authentication (no 407 responses). If you need authenticated proxy access, consider using a third-party proxy in front of or alongside the firewall.

## Wrapping Up

Azure Firewall's explicit proxy feature gives you an alternative to UDR-based transparent interception for web traffic. It is particularly useful for environments where you cannot control routing, need PAC file distribution, or want to handle HTTP/HTTPS traffic differently from other protocols. The setup involves enabling explicit proxy on the firewall policy, creating a PAC file for client auto-configuration, defining application rules for allowed traffic, and configuring clients to point at the firewall's proxy endpoint. Combine it with TLS inspection on Premium tier for full visibility into encrypted web traffic.
