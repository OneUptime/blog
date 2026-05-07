# How to Configure Akamai CDN for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Akamai, IPv6, CDN, Edge, Enterprise, Content Delivery

Description: A guide to configuring Akamai CDN for IPv6 delivery, including edge server IPv6 support, origin connectivity, and IPv6 client handling in Akamai properties.

Akamai has supported production IPv6 since 2012 and operates one of the world's largest edge platforms. Configuring IPv6 in Akamai typically involves enabling dual-stack delivery on the property hostname or edge hostname and ensuring your origin is set up correctly if Akamai should connect to it over IPv6.

## Akamai IPv6 Architecture

```text
IPv6 Client → Akamai Edge (dual-stack) → Origin (IPv4 or IPv6)
              ↑ Property hostname typically CNAMEs to an Akamai edge hostname
              ↑ Dual-stack edge hostnames resolve to both A and AAAA records
```

## Enabling IPv6 in Akamai Property Manager

Configuration is done in Akamai Control Center under Property Manager:

### Via Akamai APIs (PAPI)

For client-to-edge IPv6, configure the edge hostname or property hostname association rather than adding a rule behavior:

```json
{
  "productId": "prd_XXXX",
  "domainPrefix": "www.example.com",
  "domainSuffix": "edgesuite.net",
  "ipVersionBehavior": "IPV6_COMPLIANCE"
}
```

### Property Manager Behavior

In the Property Manager UI:
1. Navigate to your property and click **Edit New Version**
2. In **Property Hostnames**, add or edit the hostname
3. Select IP version: **IPv4 + IPv6 (Dual Stack)**
4. If you want Akamai to connect to the origin over IPv6 as well, use the **Origin Server** behavior and set **Origin IP Version** to **Dual Stack** or **IPv6-Only**

## Akamai Origin Connectivity

Configure how Akamai connects to your origin. When you use **Dual Stack** or **IPv6-Only** here, add the **Origin IP Access Control List** behavior to the same rule or a parent rule:

```json
{
  "name": "Origin Connectivity",
  "behaviors": [
    {
      "name": "origin",
      "options": {
        "originType": "CUSTOMER",
        "hostname": "origin.example.com",
        "ipVersion": "DUALSTACK",
        "enableTrueClientIp": true,
        "trueClientIpHeader": "True-Client-IP",
        "trueClientIpClientSetting": false
      }
    }
  ]
}
```

## Akamai CLI Configuration

```bash
# Install Akamai CLI and the Property Manager package

brew install akamai   # macOS
akamai install property-manager

# Configure ~/.edgerc with EdgeGrid API credentials, then verify access
akamai property-manager list-contracts

# List available edge hostnames
akamai property-manager list-edgehostnames -c <contractId> -g <groupId>

# Import or sync a property's local configuration
akamai property-manager import
akamai property-manager update-local -p example.com

# Activate the updated property after changing hostname or origin settings
akamai property-manager activate
```

## IPv6 Client IP in Akamai

Akamai automatically adds `X-Forwarded-For` if not present. If you enable the True Client IP option in the Origin Server behavior, Akamai also sends `True-Client-IP` (or your custom header name):

```bash
# Headers your origin receives:
# X-Forwarded-For: 2001:db8::1
# True-Client-IP: 2001:db8::1   (only if enabled in Origin Server)

# Configure nginx to trust the current Akamai Origin IP ACL ranges
# https://techdocs.akamai.com/origin-ip-acl/docs/update-your-origin-server
```

## Testing Akamai IPv6 Delivery

```bash
# Verify AAAA records for Akamai-hosted domain
dig AAAA example.com

# Test IPv6 delivery
curl -6 -v https://example.com/ 2>&1 | head -20

# Check Akamai edge debug headers
curl -6 -D - -o /dev/null \
  -H "Pragma: akamai-x-cache-on, akamai-x-check-cacheable" \
  https://example.com/

# Edge server information headers:
# X-Cache: TCP_HIT from a2-xxx-xxx-xxx.deploy.akamaitechnologies.com
# X-Check-Cacheable: YES
```

## Akamai Origin IP ACL (IPv6 Origin Protection)

Origin IP ACL restricts origin access to a stable set of Akamai-owned IP ranges and is the feature Akamai documents for Dual Stack and IPv6-Only origin connectivity:

```bash
# Verify the current IPv6 Origin IP ACL ranges before changing your firewall:
# https://techdocs.akamai.com/origin-ip-acl/docs/update-your-origin-server

# Example IPv6 allowlist entries from the current Origin IP ACL documentation
sudo ip6tables -A INPUT -p tcp --dport 443 \
  -s 2a02:26f0::/32 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 443 \
  -s 2600:1400::/24 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 443 \
  -s 2405:9600::/32 -j ACCEPT
```

## Monitoring IPv6 Delivery in Akamai

```bash
# Using Akamai Reporting API v2
curl -X POST \
  "https://{hostname}/reporting-api/v2/reports/delivery/traffic/current/data?timeRange=LAST_1_WEEK" \
  -H "Content-Type: application/json" \
  --data '{
    "dimensions": ["ipVersion"],
    "metrics": ["edgeHitsSum", "originHitsSum"],
    "filters": [
      {
        "dimensionName": "cpcode",
        "operator": "IN_LIST",
        "expressions": [12345]
      }
    ]
  }'
```

Akamai's built-in dual-stack edge delivery means that enabling IPv6 is mostly a hostname and origin-configuration task in Property Manager, with the edge network handling the client-facing delivery path.
