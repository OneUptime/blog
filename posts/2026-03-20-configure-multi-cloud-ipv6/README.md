# How to Configure Multi-Cloud IPv6 Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Multi-Cloud, AWS, Azure, GCP, BGP, Connectivity

Description: Configure IPv6 connectivity between multiple cloud providers using BGP, site-to-site VPN with IPv6, and Terraform to manage cross-cloud IPv6 routing.

## Introduction

Multi-cloud architectures require IPv6 connectivity between cloud providers. Options include BGP-based direct peering (expensive), site-to-site VPN with IPv6, and overlay networks. This guide covers practical approaches using VPN tunnels and BGP for IPv6 multi-cloud connectivity.

## Architecture Options

```text
Option 1: Cloud VPNs with IPv6 (Most Common)
  AWS ← VPN Tunnel (IPv6) → Azure
  AWS ← VPN Tunnel (IPv6) → GCP

Option 2: BGP Peering via Co-location
  AWS Direct Connect ─── IX ─── Azure ExpressRoute
                    \       /
                     GCP Cloud Interconnect
  IPv6 advertised via BGP between all three

Option 3: Overlay Network (WireGuard/IPsec)
  IPv6 overlay across cloud providers
  Each cloud node gets a ULA address for internal routing
```

## Site-to-Site VPN: AWS to Azure with IPv6

AWS Site-to-Site VPN supports IPv6 inside the tunnel only when the VPN attaches
to an EC2 Transit Gateway, not to a Virtual Private Gateway. The outer tunnel
endpoints remain IPv4.

```hcl
# AWS side

resource "aws_customer_gateway" "azure_gw" {
  bgp_asn    = 65515  # Azure BGP ASN
  ip_address = azurerm_public_ip.vpn_gw.ip_address
  type       = "ipsec.1"
  tags       = { Name = "azure-gateway" }
}

resource "aws_ec2_transit_gateway" "main" {
  amazon_side_asn = 64512
  tags            = { Name = "aws-tgw" }
}

resource "aws_vpn_connection" "to_azure" {
  transit_gateway_id       = aws_ec2_transit_gateway.main.id
  customer_gateway_id      = aws_customer_gateway.azure_gw.id
  type                     = "ipsec.1"
  static_routes_only       = false
  tunnel_inside_ip_version = "ipv6"
  local_ipv6_network_cidr  = "2001:db8:a::/48"
  remote_ipv6_network_cidr = "2001:db8:b::/48"
}

# Azure side
resource "azurerm_virtual_network_gateway" "main" {
  name                = "vpn-gateway"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  type                = "Vpn"
  vpn_type            = "RouteBased"
  sku                 = "VpnGw2"
  generation          = "Generation2"

  ip_configuration {
    public_ip_address_id          = azurerm_public_ip.vpn_gw.id
    private_ip_address_allocation = "Dynamic"
    subnet_id                     = azurerm_subnet.gateway.id
  }
}
```

## WireGuard Overlay for IPv6 Multi-Cloud

```bash
# On AWS instance
wg genkey | tee aws_private | wg pubkey > aws_public

# On Azure instance
wg genkey | tee azure_private | wg pubkey > azure_public

# AWS WireGuard config
cat > /etc/wireguard/wg0.conf << 'EOF'
[Interface]
Address = fd00:dead::1/64
ListenPort = 51820
PrivateKey = <aws_private>

[Peer]
# Azure
PublicKey = <azure_public>
Endpoint = <azure-public-ipv4>:51820
AllowedIPs = fd00:dead::2/128, 10.2.0.0/16, fd00:b::/48
PersistentKeepalive = 25
EOF

wg-quick up wg0
```

## Python: Multi-Cloud IPv6 Health Check

```python
import subprocess
import json
from concurrent.futures import ThreadPoolExecutor

CLOUD_ENDPOINTS = {
    "aws_us_east": "2001:db8:a::1",
    "azure_east": "2001:db8:b::1",
    "gcp_us_central": "2001:db8:c::1",
}

def check_ipv6_reachability(name: str, addr: str) -> dict:
    result = subprocess.run(
        ["ping", "-6", "-c", "3", "-W", "2", addr],
        capture_output=True, text=True
    )
    return {
        "cloud": name,
        "address": addr,
        "reachable": result.returncode == 0,
    }

def check_all() -> list:
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(check_ipv6_reachability, name, addr): name
            for name, addr in CLOUD_ENDPOINTS.items()
        }
        return [f.result() for f in futures]

results = check_all()
for r in results:
    status = "UP" if r["reachable"] else "DOWN"
    print(f"{r['cloud']:20s} → {status}")
```

## Conclusion

Multi-cloud IPv6 connectivity is achievable via cloud VPN tunnels, BGP at co-location facilities, or WireGuard overlays. Use separate IPv6 prefixes per cloud provider for easy identification and routing. Automate cross-cloud health checks with the Python script above. Monitor inter-cloud connectivity continuously with OneUptime to detect failures in VPN tunnels or BGP sessions before they impact applications.
