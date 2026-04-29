# How to Configure IPv6 for Smart Home Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Smart Home, IoT, Matter, Thread, Zigbee IP

Description: Configure IPv6 for smart home devices using Matter/Thread, Zigbee IP, and traditional Wi-Fi IoT devices, including network segmentation and security considerations.

## Smart Home IPv6 Technologies

```text
Technology     Transport        IPv6 Usage
---------------------------------------------
Matter/Thread  Thread mesh      IPv6 native; mesh-local plus routable prefixes via a border router
Matter/Wi-Fi   Wi-Fi/Ethernet   Matter requires IPv6; link-local is enough on a single LAN
Zigbee IP      802.15.4         IPv6 over 6LoWPAN
HomeKit IP     Wi-Fi/Ethernet   IP accessories should support IPv6 or IPv4 link-local on IPv6-only networks
Z-Wave         proprietary      No native IPv6 on end devices (controller bridges)
Classic Zigbee  proprietary      No native IPv6 on end devices (coordinator bridges)
```

## Matter/Thread IPv6 Configuration

Matter over Thread uses IPv6 as its native transport layer, and the Thread border router provides IPv6 reachability between the Thread mesh and the adjacent Wi-Fi/Ethernet network.

```bash
# Thread network uses:

# - Mesh-local IPv6 addresses from the ULA space (fd00::/8)
# - Additional routable prefixes advertised by the border router

# Check Thread border router status and Thread-side IPv6
# addresses:

# On a Linux Thread border router (otbr-agent):
sudo ot-ctl ipaddr
# Shows the IPv6 addresses assigned to the Thread interface

# View Thread network info
sudo ot-ctl dataset active
# Shows the active dataset, including the Mesh Local Prefix

# Check the border router's infrastructure-side IPv6 addresses
sudo ot-ctl br ifaddrs

# Check the prefixes the border router is publishing
sudo ot-ctl br omrprefix
sudo ot-ctl br onlinkprefix

# View Thread Network Data learned from the Leader
sudo ot-ctl netdata show
# Internet reachability also requires working upstream IPv6
# on the infrastructure network.

# Verify Matter device has Thread IPv6
# (Check via Matter SDK or vendor app)
```

## IoT VLAN with IPv6 Segmentation

Isolate smart home devices on a separate IPv6 VLAN for security.

```bash
# Router (OpenWrt) - create IoT VLAN with own /64
# Assign prefix ID 1 from delegated /56

# /etc/config/network
config device
    option name 'br-iot'
    option type 'bridge'
    list ports 'eth0.20'

config interface 'iot'
    option device 'br-iot'
    option proto 'static'
    option ip6assign '64'
    option ip6hint '1'         # Uses delegated ...:1::/64 when available

# /etc/config/dhcp
config dhcp 'iot'
    option interface 'iot'
    option ra 'server'
    option dhcpv6 'server'
    option ra_slaac '1'

# Apply
/etc/init.d/network restart
/etc/init.d/dnsmasq restart

# Result: IoT devices get different /64 from home PCs
# Firewall can block IoT VLAN → Main LAN
# But IoT VLAN → Internet IPv6 works
```

## ip6tables Rules for IoT Segmentation

On a generic Linux router, allow IoT → Internet but block IoT → Main LAN. On current OpenWrt releases, firewall4 uses nftables underneath, but the policy is the same.

```bash
# Allow IoT → Internet but block IoT → Main LAN
# Replace br-iot, br-lan, and wan0 with your actual interface names

# Create chain for IoT
ip6tables -N IOT_FORWARD

# Allow return traffic
ip6tables -A IOT_FORWARD -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Block IoT to main LAN
ip6tables -A IOT_FORWARD -o br-lan -j DROP

# Allow IoT to internet (WAN)
ip6tables -A IOT_FORWARD -o wan0 -j ACCEPT

# Drop anything else from IoT
ip6tables -A IOT_FORWARD -j DROP

# Apply to FORWARD chain for IoT interface
ip6tables -A FORWARD -i br-iot -j IOT_FORWARD

# Verify
ip6tables -L IOT_FORWARD -n -v
```

## Wi-Fi Smart Home Device IPv6 Setup

Most Wi-Fi smart home devices (bulbs, plugs, thermostats) use SLAAC automatically.

```bash
# On the smart home device (if it has Linux SSH access)

# Check if device has IPv6
ip -6 addr show | grep "scope global"

# If not, verify the router is sending Router Advertisements
# and that the device firmware actually supports IPv6.

# Philips Hue Bridge - check the bridge IP first, then query its local API
curl -sk https://192.168.x.x/api/$HUE_USER/config | python3 -m json.tool

# Many consumer devices do not expose manual IPv6 settings.
# If IPv6 is enabled on the LAN and the device supports it,
# it will typically autoconfigure from Router Advertisements.

# For devices that support both IPv4 and IPv6:
# Connection behavior varies by implementation; dual-stack clients
# may try IPv6 first or race IPv4 and IPv6.
```

## Monitoring Smart Home IPv6 Traffic

```bash
# On router - monitor IoT VLAN IPv6 traffic
tcpdump -i br-iot -n -q 'ip6' | head -50

# Check IPv6 neighbor table for IoT devices
ip -6 neigh show dev br-iot | grep -v "fe80"

# Count global IPv6 neighbor entries on the IoT VLAN
ip -6 neigh show dev br-iot | grep -E '^[23][0-9a-f:]* ' | wc -l
echo "global IPv6 neighbor entries on br-iot"

# Check which IoT devices are talking to which external IPv6
# (requires conntrack or flow logging)
ip6tables -A FORWARD -i br-iot -o wan0 -j LOG --log-prefix "IOT-OUT: "
journalctl -k | grep "IOT-OUT" | grep -o 'DST=[^ ]*' | cut -d= -f2 | sort | uniq -c | sort -rn | head -20
```

## Conclusion

Smart home devices increasingly use IPv6 as a native transport. Matter over Thread requires a Thread border router that provides IPv6 reachability between the Thread mesh and the adjacent Wi-Fi/Ethernet network; internet access also requires working upstream IPv6. Wi-Fi smart home devices typically receive IPv6 addresses via SLAAC when the router sends Router Advertisements. For security, isolate IoT devices on a dedicated VLAN with its own /64 prefix from the delegated range, and use nftables or ip6tables policy to prevent IoT devices from accessing the main LAN while still allowing internet access. Monitor smart home IPv6 traffic with tcpdump and firewall logging to detect unusual communication patterns.
