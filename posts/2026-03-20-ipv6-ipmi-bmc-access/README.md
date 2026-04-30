# How to Configure IPv6 for IPMI/BMC Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPMI, BMC, IDRAC, ILO, Remote Management, Server Hardware

Description: Configure IPv6 on IPMI and BMC (Baseboard Management Controller) interfaces for Dell iDRAC, HP iLO, Supermicro IPMI, and generic IPMI 2.0 devices for remote server management over IPv6.

---

IPMI (Intelligent Platform Management Interface) and BMC provide hardware-level remote access independent of the server's operating system. Configuring IPv6 on IPMI/BMC interfaces enables out-of-band management over IPv6 networks, including power control, console access, and hardware monitoring.

## Dell iDRAC IPv6 Configuration

```bash
# Method 1: racadm command line

# Enable IPv6

racadm set iDRAC.IPv6.Enable 1

# Configure static IPv6
racadm set iDRAC.IPv6.AutoConfig 0
racadm set iDRAC.IPv6Static.Address1 2001:db8:100::201
racadm set iDRAC.IPv6Static.PrefixLength 64
racadm set iDRAC.IPv6Static.Gateway 2001:db8:100::1

# Or enable IPv6 autoconfiguration (SLAAC/DHCPv6)
racadm set iDRAC.IPv6.AutoConfig 1

# Verify configuration
racadm get iDRAC.IPv6

# Remote racadm via existing IPv4
racadm -r 192.168.1.201 -u root -p calvin set iDRAC.IPv6Static.Address1 2001:db8:100::201

# Method 2: iDRAC Web GUI
# https://idrac-ip/
# iDRAC Settings > Connectivity > Network > IPv6 Settings
# Enable IPv6: Enabled
# IP Address: 2001:db8:100::201
# Prefix Length: 64
# Gateway: 2001:db8:100::1
```

## HP iLO IPv6 Configuration

```bash
# HP iLO - Configure IPv6

# Via hponcfg XML
cat > /tmp/ilo-ipv6-config.xml << 'EOF'
<RIBCL VERSION="2.0">
  <LOGIN USER_LOGIN="admin" PASSWORD="password">
    <RIB_INFO MODE="write">
      <MOD_NETWORK_SETTINGS>
        <SPEED_AUTOSELECT VALUE="Y"/>
        <REG_WINS_SERVER VALUE="N"/>
        <DHCP_ENABLE VALUE="N"/>
        <IP_ADDRESS VALUE="192.168.1.202"/>
        <SUBNET_MASK VALUE="255.255.255.0"/>
        <GATEWAY_IP_ADDRESS VALUE="192.168.1.1"/>
        <!-- IPv6 Settings -->
        <IPV6_ADDRESS VALUE="2001:DB8:100::202"
                      PREFIXLEN="64"
                      ADDR_SOURCE="STATIC"
                      ADDR_STATUS="ACTIVE"/>
        <IPV6_DEFAULT_GATEWAY VALUE="2001:DB8:100::1"/>
        <IPV6_PREFERRED_PROTOCOL VALUE="N"/>
        <IPV6_ADDR_AUTOCFG VALUE="N"/>
        <DHCPV6_STATELESS_ENABLE VALUE="N"/>
        <DHCPV6_STATEFUL_ENABLE VALUE="N"/>
      </MOD_NETWORK_SETTINGS>
    </RIB_INFO>
  </LOGIN>
</RIBCL>
EOF

hponcfg -i < /tmp/ilo-ipv6-config.xml

# Verify via hponcfg
cat > /tmp/ilo-get-network.xml << 'EOF'
<RIBCL VERSION="2.0">
  <LOGIN USER_LOGIN="admin" PASSWORD="password">
    <RIB_INFO MODE="read">
      <GET_NETWORK_SETTINGS/>
    </RIB_INFO>
  </LOGIN>
</RIBCL>
EOF

hponcfg -i < /tmp/ilo-get-network.xml
```

## Supermicro IPMI IPv6

```bash
# Supermicro IPMI - ipmitool configuration

# Check IPv6 support
ipmitool -I lanplus -H 192.168.1.203 -U admin -P password lan6 print 1

# Enable IPv6 on the LAN channel
ipmitool -I lanplus -H 192.168.1.203 -U admin -P password \
    lan6 set 1 enables ipv6

# Set IPv6 static address
ipmitool -I lanplus -H 192.168.1.203 -U admin -P password \
    lan6 set 1 static_addr 0 enable 2001:db8:100::203 64

# Configure a static default router entry
# Replace 00:11:22:33:44:55 with the MAC address of the IPv6 gateway on this segment
ipmitool -I lanplus -H 192.168.1.203 -U admin -P password \
    lan6 set 1 rtr_cfg static
ipmitool -I lanplus -H 192.168.1.203 -U admin -P password \
    lan6 set 1 static_rtr 1 2001:db8:100::1 00:11:22:33:44:55 :: 0

# Verify
ipmitool -I lanplus -H 192.168.1.203 -U admin -P password lan6 print 1

# Test access via IPv6
ipmitool -I lanplus -H 2001:db8:100::203 -U admin -P password power status
```

## Generic IPMI 2.0 IPv6 via ipmitool

```bash
# Local ipmitool (on the server itself)

# Enable IPv6 on BMC LAN channel
ipmitool lan6 set 1 enables ipv6

# Check IPv6 SLAAC (if supported)
ipmitool lan6 print 1 | grep -i slaac

# Set static IPv6 address
ipmitool lan6 set 1 static_addr 0 enable 2001:db8:100::101 64

# Configure a static default router entry
# Replace 00:11:22:33:44:55 with the MAC address of the IPv6 gateway on this segment
ipmitool lan6 set 1 rtr_cfg static
ipmitool lan6 set 1 static_rtr 1 2001:db8:100::1 00:11:22:33:44:55 :: 0

# Verify current IPv6 configuration
ipmitool lan6 print 1

# Check BMC SDR sensors remotely via IPv6
ipmitool -I lanplus -H 2001:db8:100::101 -U admin -P password sdr list

# Remote power control
ipmitool -I lanplus -H 2001:db8:100::101 -U admin -P password power status
ipmitool -I lanplus -H 2001:db8:100::101 -U admin -P password power cycle

# Remote console via SOL
ipmitool -I lanplus -H 2001:db8:100::101 -U admin -P password \
    sol activate
```

## Redfish API over IPv6

```bash
# Modern BMC access via Redfish REST API over IPv6

# Get system info
curl -sk -u admin:password \
    https://[2001:db8:100::201]/redfish/v1/Systems/System.Embedded.1 | \
    python3 -m json.tool | grep -E "Model|MemorySize|Status|PowerState"

# Power control via Redfish IPv6
curl -sk -X POST -u admin:password \
    -H "Content-Type: application/json" \
    -d '{"ResetType": "ForceRestart"}' \
    https://[2001:db8:100::201]/redfish/v1/Systems/System.Embedded.1/Actions/ComputerSystem.Reset

# Get sensor readings
curl -sk -u admin:password \
    https://[2001:db8:100::201]/redfish/v1/Chassis/System.Embedded.1/Thermal | \
    python3 -m json.tool | grep -E "Name|ReadingCelsius"
```

## Mass BMC IPv6 Configuration Script

```bash
#!/bin/bash
# configure_bmc_ipv6.sh - Configure IPv6 on all BMC interfaces

# Array of servers: hostname|ipv4-bmc|ipv6-bmc
SERVERS=(
    "server-01|192.168.1.201|2001:db8:100::201"
    "server-02|192.168.1.202|2001:db8:100::202"
    "server-03|192.168.1.203|2001:db8:100::203"
)

GW6="2001:db8:100::1"
# Replace with the MAC address of the IPv6 gateway on this OOB segment
GW6_MAC="00:11:22:33:44:55"
ADMIN_USER="admin"
ADMIN_PASS="password"

for server in "${SERVERS[@]}"; do
    IFS='|' read -r NAME IPV4 IPV6 <<< "$server"

    echo "Configuring IPv6 on $NAME BMC ($IPV6)..."

    ipmitool -I lanplus -H "$IPV4" -U "$ADMIN_USER" -P "$ADMIN_PASS" \
        lan6 set 1 enables ipv6 && \
    ipmitool -I lanplus -H "$IPV4" -U "$ADMIN_USER" -P "$ADMIN_PASS" \
        lan6 set 1 static_addr 0 enable "$IPV6" 64 && \
    ipmitool -I lanplus -H "$IPV4" -U "$ADMIN_USER" -P "$ADMIN_PASS" \
        lan6 set 1 rtr_cfg static && \
    ipmitool -I lanplus -H "$IPV4" -U "$ADMIN_USER" -P "$ADMIN_PASS" \
        lan6 set 1 static_rtr 1 "$GW6" "$GW6_MAC" :: 0 && \
    echo "$NAME: IPv6 configured successfully" || \
    echo "$NAME: FAILED to configure IPv6"
done

echo "Verifying IPv6 BMC connectivity..."
for server in "${SERVERS[@]}"; do
    IFS='|' read -r NAME IPV4 IPV6 <<< "$server"
    ping6 -c 1 -W 2 "$IPV6" > /dev/null 2>&1 && \
        echo "$NAME ($IPV6): REACHABLE" || \
        echo "$NAME ($IPV6): UNREACHABLE"
done
```

IPMI/BMC IPv6 configuration varies by vendor but follows the same pattern: enable IPv6 on the BMC LAN channel, assign a static IPv6 address from the OOB management prefix or enable autoconfiguration, configure any required IPv6 router settings, and verify with remote ipmitool commands or Redfish API calls using bracket notation for the IPv6 address in the URL.
