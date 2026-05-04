# How to Configure Smart Home Devices with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Smart Home, IoT, Home Assistant, Matter, Thread

Description: Configure smart home devices and home automation platforms with IPv6, including Home Assistant, Matter/Thread protocol, and IPv6-capable IoT devices.

## IPv6 and Smart Home Devices

Modern smart home protocols increasingly use IPv6:
- **Matter**: Uses IPv6 exclusively for device communication
- **Thread**: IPv6-based mesh protocol for low-power IoT devices
- **Zigbee IP (ZIP)**: IPv6-over-6LoWPAN profile (largely superseded by Thread)
- **mDNS/Bonjour**: Used for device discovery, works on both IPv4 and IPv6

Many older smart home devices (WiFi bulbs, older smart plugs) are IPv4-only. This is fine - they work alongside IPv6 devices on a dual-stack network.

## Home Assistant and IPv6

Home Assistant supports IPv6 for accessing the dashboard and for integrations:

```yaml
# /config/configuration.yaml

# Enable IPv6 HTTP access to Home Assistant

http:
  # Listen on all interfaces including IPv6
  server_host:
    - "0.0.0.0"    # IPv4
    - "::"         # IPv6
  server_port: 8123
```

Access Home Assistant via its IPv6 address:

```text
http://[2001:db8:home::ha]:8123
```

Note the square brackets around IPv6 addresses in URLs.

## Matter Protocol and IPv6

Matter requires IPv6 to function. When you set up a Matter device:

1. The Matter device connects via Thread (if it's a Thread-enabled device) or WiFi
2. Thread uses IPv6 exclusively - devices derive their own addresses (link-local `fe80::/64` and mesh-local `fd00::/8` from the network's mesh-local prefix); globally routable prefixes are advertised by the Border Router via SLAAC/ND
3. WiFi Matter devices use your home network's IPv6

Ensure your router provides IPv6 for Matter to work correctly with Thread devices.

## Thread Border Router Setup

Thread networks need a Border Router to connect Thread IPv6 mesh to your home WiFi IPv6:

**Apple HomePod Mini / HomePod** (2nd gen): Acts as Thread Border Router automatically.

**Home Assistant with Thread:**

```yaml
# In Home Assistant, the Thread integration acts as Border Router
# Enable in: Settings → System → Hardware → Thread
```

**Manual Thread Border Router (ot-br-posix on Raspberry Pi):**

```bash
# Build and install OpenThread Border Router from source
# (no apt/deb package — clone and run the bootstrap/setup scripts)
git clone https://github.com/openthread/ot-br-posix.git
cd ot-br-posix
./script/bootstrap
./script/setup

# The border router bridges Thread IPv6 (fd prefix) to your WiFi network
# Check Thread network info
sudo ot-ctl ipaddr
# Expected: fdxx:xxxx:: (Thread mesh-local prefix)
```

## IPv6 for Zigbee and Z-Wave Devices

Zigbee and Z-Wave devices themselves don't use IPv6 - the hub/gateway translates. When using:

- **Zigbee2MQTT**: Runs on your host; configure MQTT broker with IPv6 support
- **ZHA (Zigbee Home Automation)** in Home Assistant: Inherits IPv6 from HA

```yaml
# MQTT broker with IPv6 support (Mosquitto)
# /etc/mosquitto/mosquitto.conf
listener 1883
socket_domain ipv6   # Listen on both IPv4 and IPv6
```

## Assigning Static IPv6 to Smart Home Devices

For devices that need a consistent IPv6 address (Home Assistant, NAS, etc.), assign a static address:

```bash
# Linux server (Home Assistant host)
# /etc/netplan/01-network.yaml
network:
  ethernets:
    eth0:
      dhcp4: true
      dhcp6: false
      addresses:
        - "2001:db8:home::ha/64"
  version: 2
```

Or use DHCPv6 reservation based on DUID:

```json
{
  "Dhcp6": {
    "reservations": [
      {
        "duid": "00:03:00:01:aa:bb:cc:dd:ee:ff",
        "ip-addresses": ["2001:db8:home::ha"]
      }
    ]
  }
}
```

## Firewall Rules for Smart Home IPv6

Allow Home Assistant to be accessible from the internet (if using remote access):

```bash
# On router/firewall: allow HTTPS to Home Assistant
ip6tables -A FORWARD -d 2001:db8:home::ha -p tcp --dport 443 -j ACCEPT

# Block all inbound to IoT VLAN from internet (critical security)
ip6tables -A FORWARD -d 2001:db8:iot::/64 -i wan -j DROP
```

## Conclusion

Modern smart home platforms like Home Assistant and Matter/Thread are built on IPv6. Ensuring your home network provides reliable IPv6 is essential for these ecosystems to function correctly. Put IoT devices in a dedicated VLAN with IPv6 but block all inbound internet access to that VLAN for security.
