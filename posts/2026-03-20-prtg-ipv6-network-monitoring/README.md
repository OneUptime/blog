# How to Configure PRTG for IPv6 Network Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PRTG, IPv6, Network Monitoring, SNMP, Window, Enterprise Monitoring

Description: Configure PRTG Network Monitor to discover, add, and monitor IPv6-addressed devices using SNMP and ping sensors over IPv6 transport.

---

PRTG Network Monitor supports IPv6 for many sensors, including SNMP monitoring and ping-based availability checks. Configuring PRTG for IPv6 monitoring involves adding devices with IP Version set to IPv6 and using sensors that support IPv6.

## PRTG IPv6 Prerequisites

```text
Requirements:
- The probe system that monitors the device needs IPv6 connectivity
- Windows probe system with IPv6 enabled
- SNMP agents on target devices configured for IPv6
- DNS AAAA records for devices (optional but recommended)

Verify PRTG IPv6 setup:
- Device Settings > IP Version: IPv6
- If the probe has more than one IPv6 address, configure the outgoing IPv6 address in the probe settings or PRTG Administration Tool
```

## Adding IPv6 Devices to PRTG

```text
Method 1: Add by IPv6 Address
1. Devices > Add Device
2. IP Version: IPv6
3. IPv6 Address/DNS Name: 2001:db8::1
4. Set SNMP credentials if needed
5. Click OK

Method 2: Add by Hostname (AAAA record)
1. IP Version: IPv6
2. IPv6 Address/DNS Name: router1.example.com
3. Ensure DNS returns a reachable AAAA record for the hostname
```

## IPv6 Ping Sensor Configuration

```text
Add Ping Sensor to IPv6 Device:
1. Right-click device > Add Sensor
2. Search for "Ping"
3. Select "Ping" sensor
4. Sensor Name: IPv6 Ping Check
5. Timeout: 10 seconds
6. Packet Size: 32 bytes
7. Because the device IP Version is set to IPv6, the sensor uses the device's IPv6 address

For IPv6 ping:
- Use the standard "Ping" or "Ping v2" sensor on a device configured with IP Version = IPv6
```

## SNMP Sensors over IPv6

```text
SNMP Traffic Sensor for IPv6 Interface:
1. Add the device with IP Version: IPv6
2. Configure Credentials for SNMP Devices on the device (SNMP v2c or v3)
3. Right-click device > Add Sensor > SNMP Traffic
4. Select interfaces to monitor
5. Save

PRTG uses the device's IP Version setting for SNMP transport
```

## PRTG Auto-Discovery for IPv6

```text
Configure IPv6 Auto-Discovery:
1. Devices > Add Auto-Discovery Group
2. Auto-Discovery Scanning Method: List of individual IP addresses and DNS names (IPv6)
3. IPv6/DNS Name List:
   - 2001:db8::1
   - router1.example.com
4. Define SNMP credentials on the parent object if you want SNMP-based sensor discovery
5. Start Discovery

Note: PRTG auto-discovery for IPv6 uses lists of individual IPv6 addresses or DNS names, not IPv6 subnet scans
Prefer direct device addition or DNS-based discovery for IPv6
```

## PRTG Custom SNMP Sensor for IPv6 Stats

```text
<!-- PRTG Custom SNMP OID Sensor template -->
<!-- For IPv6-specific statistics via IP-MIB -->

Sensor: SNMP Custom Advanced
Channel 1 Name: IPv6 Packets Received
Channel 1 OID: 1.3.6.1.2.1.4.31.1.1.4.2
    (ipSystemStatsHCInReceives, IPv6 row where InetVersion = ipv6(2))
Channel 1 Value Type: Delta (counter)

Channel 2 Name: IPv6 Packets Transmitted
Channel 2 OID: 1.3.6.1.2.1.4.31.1.1.31.2
    (ipSystemStatsHCOutTransmits, IPv6 row where InetVersion = ipv6(2))
Channel 2 Value Type: Delta (counter)
```

## PRTG Notifications for IPv6 Devices

```text
Configure alerts for IPv6 device issues:
1. Setup > Account Settings > Notification Templates
2. Add a notification template for Email / SMS
3. Open the IPv6 device or group > Notification Triggers
4. Add State Trigger: When sensor status is Down, perform the notification template

Tag all IPv6 devices:
- Device Properties > Tags: "ipv6", "core-network"
- Use tags to group IPv6 devices and filter IPv6-specific views and reports
```

## PRTG Remote Probe on IPv6 Network

```text
For monitoring remote IPv6 network segments:
1. Install PRTG Remote Probe on IPv6 segment
2. Configure the probe system with IPv6 connectivity to the local devices
3. In the PRTG web interface, use Setup > Optional Downloads > Remote Probes to download and prepare the installer
4. Approve the new remote probe in the device tree

Remote Probe is particularly useful for:
- Monitoring IPv6-only network segments
- Adding IPv6-capable sensors to PRTG Hosted Monitor
- Reducing latency for geographically distributed IPv6 sites
```

## Troubleshooting PRTG IPv6 Issues

```text
Common issues:
1. "Unable to ping device" for IPv6 address
   - Verify the probe system has IPv6 connectivity
   - Check Windows Firewall allows outbound ICMPv6
   - Test: ping -6 2001:db8::10 from the probe system

2. SNMP over IPv6 fails
   - Verify the device is configured with IP Version: IPv6 in PRTG
   - Verify SNMP access from the probe, for example: snmpget -v2c -c public udp6:[2001:db8::10]:161 sysDescr.0
   - Check firewalls allow UDP/161 from the probe's IPv6 address

3. Sensor shows IPv4 instead of IPv6
   - Verify the device's IP Version is set to IPv6
   - If using a hostname, ensure it resolves to a reachable AAAA record
   - Or enter the IPv6 address directly instead of the hostname
```

PRTG's native IPv6 support allows monitoring IPv6-addressed devices with many of the same sensors used for IPv4, as long as the device IP Version is set to IPv6 and the sensor supports IPv6. For IPv6, auto-discovery is most practical when you supply individual addresses or DNS names instead of trying to scan large address ranges.
