# How to Configure IPv6 for Fiber (GPON) Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, GPON, Fiber, OLT, ONT, ISP, Broadband

Description: Configure IPv6 for GPON and XGS-PON fiber networks including OLT configuration, subscriber provisioning with DHCPv6-PD, and ONT management.

## GPON IPv6 Architecture

```text
OLT (Optical Line Terminal) - head-end at CO/hub
  ↓ (fiber splitter 1:32 or 1:64)
ONT/ONU (Optical Network Terminal) - at subscriber premises
  ↓
CPE Router (Home Router)
  ↓
Home Devices (SLAAC)
```

IPv6 flows through:
1. OLT bridges Ethernet frames per service (management, internet, IPTV)
2. ONT terminates optical signal, bridges Ethernet to CPE
3. CPE gets a WAN IPv6 address and a /56 prefix delegation from the DHCPv6 server through the OLT's relay
4. Home devices get /64s via SLAAC from the CPE

## OLT IPv6 Configuration (Huawei MA5800)

```text
# Huawei OLT MA5800 - IPv6 for GPON

dhcp enable
ipv6

# Management IPv6

interface MEth0/0/0
  ipv6 enable
  ipv6 address 2001:db8:0:10::1/64

# Configure VLAN for internet service
vlan 100 smart
  description Internet_Service

# DHCPv6 relay and RA on the subscriber VLAN interface
interface Vlanif 100
  ipv6 enable
  ipv6 address 2001:db8:0:100::1/64
  dhcpv6 relay destination 2001:db8:0:20::10
  ipv6 nd autoconfig managed-address-flag

# RA configuration for subscriber subnets
interface Vlanif 100
  ipv6 nd ra max-interval 60
  ipv6 nd ra prefix 2001:db8:0:100::/64 14400 7200 no-autoconfig
```

## Nokia SR OS DHCPv6 Relay Example

```text
# Nokia SR OS - DHCPv6 relay on a subscriber-facing interface

configure service ies 100 interface "subscriber"
  ipv6
    address 2001:db8:0:100::1/64
    dhcp6-relay
      server 2001:db8:0:20::10
      source-address 2001:db8:0:100::1
      exit
  exit
```

## DHCPv6 Server for GPON Subscribers

```bash
# Wide DHCPv6 server configuration
# /etc/wide-dhcpv6/dhcp6s.conf

interface pon0 {
    preference 255;
    allow rapid-commit;
    address-pool MGMT_POOL 3600 7200;
};

# Address pool for ONT management
pool MGMT_POOL {
    range 2001:db8:0:1000::10 to 2001:db8:0:1000::ffff;
};

# Static delegated prefix for a specific subscriber CPE (by DUID)
host CPE_STATIC {
    duid 00:03:00:01:aa:bb:cc:dd:ee:ff;
    prefix 2001:db8:300:100::/56 infinity;
};
```

## ONT Provisioning Script

```bash
#!/bin/bash
# provision-ipv6.sh - Provision IPv6 for new GPON subscriber

set -euo pipefail

ONT_ID=${1:-}
SUBSCRIBER_ID=${2:-}
CPE_DUID=${3:-}

if [ -z "${ONT_ID}" ] || [ -z "${SUBSCRIBER_ID}" ] || [ -z "${CPE_DUID}" ]; then
    echo "Usage: $0 <ont_id> <subscriber_id> <cpe_duid>" >&2
    exit 1
fi

# Assign IPv6 /56 from pool
# (In production, this comes from IPAM)
PREFIX=$(python3 -c "
import ipaddress
base = ipaddress.ip_network('2001:db8:300::/40')
subs = list(base.subnets(new_prefix=56))
# Assign based on subscriber ID (simplified)
idx = int('${SUBSCRIBER_ID}') % len(subs)
print(subs[idx])
")

echo "Assigning ${PREFIX} to ONT ${ONT_ID}"

# Update DHCPv6 server with a static delegated prefix for the subscriber CPE
cat >> /etc/wide-dhcpv6/dhcp6s.conf << EOF
host CPE_${ONT_ID} {
    duid ${CPE_DUID};
    prefix ${PREFIX} infinity;
};
EOF

# Reload DHCPv6 server
dhcp6ctl -S reload

echo "Provisioned: ONT ${ONT_ID} → ${PREFIX}"
```

## Monitoring GPON IPv6

```bash
# Confirm that the DHCPv6 server is running and listening on UDP/547
pgrep -af dhcp6s
ss -lunp | grep ':547'

# CPE neighbor statistics on the subscriber-facing interface
ip -6 neigh show dev pon0 | wc -l
echo "Active IPv6 neighbors on pon0"

# Recent DHCPv6 server log messages
journalctl -t dhcp6s -n 50 --no-pager
```

## Conclusion

GPON IPv6 provisioning uses DHCPv6-PD to assign /56 prefixes to each CPE router behind the ONT. The OLT acts as a DHCPv6 relay, forwarding subscriber DHCPv6 requests to the central provisioning server. Configure OLT VLAN interfaces with `dhcpv6 relay destination` pointing to the DHCPv6 server. Each subscriber's CPE router receives a /56 and sub-delegates /64s to home devices via SLAAC. Use DUID-based static prefix assignments in the DHCPv6 server to ensure consistent prefix assignment across reboots and power outages.
