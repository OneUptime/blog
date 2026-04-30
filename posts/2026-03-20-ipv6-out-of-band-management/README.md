# How to Configure IPv6 for Out-of-Band Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Out-of-Band Management, OOB, Console Server, KVM, Network Management

Description: Configure IPv6 for out-of-band management networks including dedicated OOB switches, console servers with IPv6, KVM-over-IP access, and secure remote management plane access.

---

Out-of-band (OOB) management provides network access independent of the production network, essential for device recovery when the in-band network fails. IPv6 on OOB networks provides persistent access through separate physical infrastructure and dedicated management addresses.

## OOB Network Design with IPv6

```text
Out-of-Band Management Architecture:

Internet/Corporate WAN
         |
    [OOB Router/Firewall]
         |  2001:db8:200::/48
    [OOB Switch]
    /    |    \      \
[Console] [IPMI] [KVM] [Power]
 Servers  Switches  PDU  Console
 BMC/iDRAC         Servers

OOB Addressing:
  OOB Router:      2001:db8:200::1/64
  OOB Jump Server: 2001:db8:200::10/64
  Console Server 1: 2001:db8:200::100/64
  Server BMC/iDRAC: 2001:db8:200::200-299/64
  Switch Mgmt:     2001:db8:200::300-399/64
```

## Console Server IPv6 Configuration

```bash
# Opengear console server (Linux-based) IPv6

# /etc/network/interfaces on console server

auto eth0
iface eth0 inet static
    address 192.168.200.100
    netmask 255.255.255.0

iface eth0 inet6 static
    address 2001:db8:200::100
    netmask 64
    gateway 2001:db8:200::1

# Cyclades/Lantronix console server:
# Configure via Web UI or CLI:
# Network > IPv6
# IPv6 Address: 2001:db8:200::100/64
# IPv6 Gateway: 2001:db8:200::1
# Apply

# Verify console access via IPv6
ssh admin@2001:db8:200::100
# Connect to serial console port 1
ssh admin+port01@2001:db8:200::100
```

## Switch OOB Management IPv6

```bash
# Cisco IOS / IOS XE switch - OOB management VLAN IPv6
ipv6 unicast-routing

interface Vlan200
 ip address 192.168.200.10 255.255.255.0
 ipv6 address 2001:db8:200::310/64
 ipv6 enable

ipv6 route ::/0 2001:db8:200::1

# Restrict management access to OOB network only
ipv6 access-list OOB-MGMT-ONLY
 permit ipv6 2001:db8:200::/64 any
 deny ipv6 any any log

line vty 0 15
 ipv6 access-class OOB-MGMT-ONLY in
 transport input ssh

# Verify
show ipv6 interface Vlan200
show ipv6 route
```

## IPMI/BMC IPv6 for Remote Server Access

```bash
# Configure IPMI BMC over IPv6 using ipmitool

# Check current BMC IPv6 state
ipmitool lan6 print 1

# Enable IPv6 on BMC channel 1
ipmitool lan6 set 1 enables both

# Set a static IPv6 address and accept router information dynamically
ipmitool lan6 set 1 static_addr 0 enable 2001:db8:200::201 64
ipmitool lan6 set 1 rtr_cfg dynamic

# Verify BMC IPv6
ipmitool lan6 print 1

# Test BMC access via IPv6
ipmitool -I lanplus -H 2001:db8:200::201 -U admin -P password lan print 1
ipmitool -I lanplus -H 2001:db8:200::201 -U admin -P password power status

# Remote console via IPv6 (SOL)
ipmitool -I lanplus -H 2001:db8:200::201 -U admin -P password sol activate
```

## KVM-over-IP IPv6 (IPMI/Redfish)

```bash
# Configure Redfish/iDRAC over IPv6

# Dell iDRAC - racadm command
racadm set iDRAC.IPv6.Enable 1
racadm set iDRAC.IPv6.AutoConfig 0
racadm setniccfg -s6 2001:db8:200::201 64 2001:db8:200::1

# HP iLO - hponcfg
cat > /tmp/ilo-ipv6.xml << 'EOF'
<RIBCL VERSION="2.0">
  <LOGIN USER_LOGIN="admin" PASSWORD="password">
    <RIB_INFO MODE="write">
      <MOD_NETWORK_SETTINGS>
        <IPV6_ADDRESS VALUE="2001:db8:200::202" PREFIXLEN="64"/>
        <IPV6_DEFAULT_GATEWAY VALUE="2001:db8:200::1"/>
        <IPV6_ADDR_AUTOCFG VALUE="N"/>
        <DHCPV6_STATELESS_ENABLE VALUE="N"/>
        <DHCPV6_STATEFUL_ENABLE VALUE="N"/>
      </MOD_NETWORK_SETTINGS>
    </RIB_INFO>
  </LOGIN>
</RIBCL>
EOF

hponcfg -i < /tmp/ilo-ipv6.xml

# Verify via Redfish API over IPv6
curl -sk -u admin:password \
    https://[2001:db8:200::202]/redfish/v1/Systems/1/ | \
    python3 -m json.tool | grep -E "Model|Status|PowerState"
```

## OOB Network Monitoring

```bash
# Monitor OOB network availability for all devices

# Ping all BMC/IPMI addresses via IPv6
OOB_PREFIX="2001:db8:200::"
for i in $(seq 200 299); do
    IP="${OOB_PREFIX}${i}"
    if ping6 -c 1 -W 1 $IP > /dev/null 2>&1; then
        echo "UP: $IP"
    else
        echo "DOWN: $IP" >&2
    fi
done

# SNMP poll for device availability
snmpwalk -v3 -u MONITOR -a SHA -A authpass -x AES -X privpass \
    -l authPriv 'udp6:[2001:db8:200::310]:161' SNMPv2-MIB::sysDescr

# Check console server raw-TCP port availability (if enabled)
for PORT in $(seq 4001 4048); do
    nc -6 -w 2 2001:db8:200::100 $PORT < /dev/null > /dev/null 2>&1 && \
        echo "Console port $PORT: open" || echo "Console port $PORT: closed"
done
```

OOB IPv6 management provides persistent remote access for server BMC/IPMI interfaces, console servers, and network device management ports on a physically separate network segment with a dedicated IPv6 prefix, helping administrators reach and recover devices even when the production network is unavailable, provided the OOB network itself remains reachable.
