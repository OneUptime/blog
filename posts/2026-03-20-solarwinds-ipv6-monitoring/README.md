# How to Configure SolarWinds for IPv6 Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SolarWinds, IPv6, Network Monitoring, npm, SNMP, Enterprise

Description: Configure SolarWinds Network Performance Monitor (NPM) to discover, monitor, and alert on IPv6-addressed network devices and interfaces.

---

SolarWinds NPM provides enterprise-grade IPv6 monitoring capabilities including node discovery, interface monitoring, and topology mapping for IPv6 networks.

## SolarWinds NPM IPv6 Prerequisites

```text
Requirements:
- Supported SolarWinds NPM release on a SolarWinds Platform version that supports IPv6
- Polling engine with IPv6 connectivity
- SNMP v2c or v3 configured on IPv6 devices
- DNS AAAA records for clean hostname resolution
- Additional Polling Engine (APE) in IPv6-only segments

Verify IPv6 capability:
- Confirm the SolarWinds Platform server or polling engine has IPv6 enabled
- Test reachability from the polling engine to the device's IPv6 address
- Verify DNS AAAA resolution if you monitor by hostname
```

## Adding IPv6 Nodes to SolarWinds

```text
Method 1: Manual Add
1. Settings > Manage Nodes > Add Node
2. Enter IPv6 address: 2001:db8:100::1
   (SolarWinds accepts IPv6 addresses directly)
3. Select Polling Method: Most Devices: SNMP and ICMP
4. SNMP Version: v2c
   Community: public
   OR
   SNMP Version: v3
   Username: snmpv3user
   Auth: SHA / Password
   Priv: AES / Password
5. Click Next, select Resources to monitor
6. Add Node

Method 2: Network Discovery
1. Settings > Network Discovery > Add New Discovery
2. Use IP Addresses / Specific Nodes and add targeted IPv6 addresses or hostnames:
   2001:db8:100::1
   2001:db8:100::2
   (SolarWinds Platform documentation lists CIDR notation as unsupported for IPv6 addresses, so avoid broad IPv6 subnet scans)
3. Configure SNMP credentials for IPv6 devices
4. Run discovery
```

## IPv6 Interface Monitoring in NPM

```text
After node is added:
1. Node Details page > Interfaces tab
2. Select interfaces to monitor
3. Interface statistics collected via SNMP over IPv6:
   - ifHCInOctets/ifHCOutOctets (64-bit counters, when available)
   - InErrors/OutErrors
   - Interface utilization %
   - Operational status

For IPv6-specific interface stats:
1. Manage Nodes > Select IPv6 device
2. Add Custom SNMP Pollers:
   OID: 1.3.6.1.2.1.4.31.1.1.4.2 (ipSystemStatsHCInReceives for IPv6)
   OID: 1.3.6.1.2.1.4.31.1.1.31.2 (ipSystemStatsHCOutTransmits for IPv6)
```

## SolarWinds NCM (Network Configuration Manager) for IPv6

```text
Configure NCM for IPv6 device management:
1. Settings > NCM Settings
2. Enable SSH for device connection
3. Configure credential profiles with IPv6:
   - SSH to 2001:db8:100::10
   - Telnet over IPv6 (not recommended)

NCM can back up configs from:
- Cisco devices with IPv6 management IPs
- Juniper devices reachable via IPv6
- Any SSH-accessible device with IPv6 address
```

## Alerting on IPv6 Node Issues

```text
Create IPv6-specific alerts:
1. Alerts & Activity > Manage Alerts > Add Alert
2. Object Type: Node
3. Condition:
   - "IP Address" contains "2001:db8"  (for your IPv6 prefix)
   - "Status" is "Down"
4. Trigger Action: Email, SNMP Trap, Webhook
5. Reset Action: Send all-clear

Custom Properties for IPv6:
1. Settings > Manage Custom Properties > Add Property
2. Property: "IP_Version" (Text)
3. Assign "IPv6" to all IPv6 nodes
4. Filter dashboards/alerts by Custom Property
```

## IPv6 Topology in NetPath and NPM

```text
SolarWinds NetPath with IPv6:
1. My Dashboards > Network > NetPath Services > Create New Service
2. Target: 2001:db8:100::20
3. Port: 80
4. Protocol: TCP
5. NetPath traces path to IPv6 destination

Intelligent Maps:
1. Add IPv6 nodes to network maps
2. Color-code by IP version for visual distinction
3. Map shows real-time status of IPv6 infrastructure
```

## SolarWinds API Queries for IPv6

```powershell
# Query SolarWinds API for IPv6 nodes (PowerShell)

Import-Module SwisPowerShell

$swis = Connect-Swis -Hostname localhost -Username admin -Password pass

# Get all IPv6 nodes
$query = "SELECT NodeID, Caption, IPAddress, Status
          FROM Orion.Nodes
          WHERE IPAddressType = 'IPv6'"

$results = Get-SwisData $swis $query
$results | Format-Table

# Get IPv6 interface data
$intQuery = "SELECT n.Caption, i.Name, i.Inbps AS InBitsPerSec, i.Outbps AS OutBitsPerSec
             FROM Orion.Nodes n
             JOIN Orion.NPM.Interfaces i ON n.NodeID = i.NodeID
             WHERE n.IPAddressType = 'IPv6'"

Get-SwisData $swis $intQuery | Format-Table
```

SolarWinds NPM's IPv6 support enables enterprise monitoring of IPv6 infrastructure with the same dashboards, alerts, and reports as IPv4, with manual node addition by IPv6 address being more practical than subnet discovery due to IPv6 address space size.
