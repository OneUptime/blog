# How to Configure LibreNMS for IPv6 Device Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LibreNMS, IPv6, Network Monitoring, SNMP, Device Discovery, NMS

Description: A guide to configuring LibreNMS to discover and monitor IPv6-addressed network devices via SNMP, including autodiscovery and custom SNMP credentials.

LibreNMS is a full-featured network monitoring system with native IPv6 support. It can discover devices by IPv6 address, monitor them via SNMPv2c or SNMPv3, and collect IPv6-related data such as interface IP addresses, BGP sessions, and routing tables when the relevant modules are enabled.

## Step 1: Ensure LibreNMS Has IPv6 Connectivity

LibreNMS must be able to reach its monitored devices over IPv6:

```bash
# Test IPv6 connectivity from the LibreNMS host

ping -6 2001:db8::1

# Test SNMP over IPv6
snmpwalk -v2c -c public 'udp6:[2001:db8::1]:161' sysDescr
```

## Step 2: Add an IPv6 Device Manually

```bash
# Add a device by IPv6 address using the current lnms CLI
cd /opt/librenms
./lnms device:add --v2c -c public --transport udp6 2001:db8::1

# Or add using the web UI: Devices > Add Device
# Enter the IPv6 address directly in the "Hostname or IP" field
```

## Step 3: Configure SNMP Credentials for IPv6 Devices

```bash
# Create a custom SNMP community for IPv6 devices
# In LibreNMS UI: Settings > Global Settings > SNMP > Community

# Or add via config.php
sudo nano /opt/librenms/config.php
```

```php
<?php
// config.php - LibreNMS SNMP settings for IPv6
// SNMP v2c community string(s) to try when discovering devices
$config['snmp']['community'] = ['public', 'private', 'monitoring'];

// SNMP v3 credentials for secure IPv6 device monitoring
$config['snmp']['v3'][0]['authlevel'] = 'authPriv';
$config['snmp']['v3'][0]['authname']  = 'librenms';
$config['snmp']['v3'][0]['authpass']  = 'authpassword123';
$config['snmp']['v3'][0]['authalgo']  = 'SHA';
$config['snmp']['v3'][0]['cryptopass']= 'privpassword123';
$config['snmp']['v3'][0]['cryptoalgo']= 'AES';

// Allow both IPv4 and IPv6 SNMP transports
$config['snmp']['transports'] = ['udp', 'udp6', 'tcp', 'tcp6'];
```

## Step 4: Configure IPv6 Network Autodiscovery

```php
// config.php - Configure autodiscovery ranges including IPv6
// Use small IPv6 ranges for SNMP scan examples
$config['nets'][] = '10.0.0.0/8';                // IPv4 range
$config['nets'][] = '2001:db8:100::/126';        // IPv6 range

// Add devices by IP when reverse DNS is unavailable
$config['discovery_by_ip'] = true;

// Enable autodiscovery methods for IPv6-capable networks
$config['autodiscovery']['xdp'] = true;          // FDP/CDP/LLDP discovery
$config['autodiscovery']['ospfv3'] = true;       // OSPFv3 discovery
$config['autodiscovery']['bgp'] = true;          // BGP discovery

// Optional: collect routing tables for discovered devices
$config['discovery_modules']['route'] = true;
```

```bash
# Scan the IPv6 network for SNMP-enabled devices
./snmp-scan.py 2001:db8:100::/126

# Discover a specific IPv6 host already added to LibreNMS
./lnms device:discover 2001:db8::1
```

## Step 5: Monitor IPv6 Interface Statistics

Once a device is added, LibreNMS automatically polls its interfaces. If the `ipv6-addresses` discovery module is enabled, it also discovers IPv6 addresses assigned to those interfaces. To verify:

```bash
# Check collected interface data
./lnms device:poll 2001:db8::1

# View in UI: Devices > [Device Name] > Interfaces
# Interface counters appear there; IPv6 addresses are discovered separately
```

## Step 6: Set Up IPv6 BGP Monitoring

LibreNMS can monitor BGP sessions for discovered devices when the `bgp-peers` discovery and poller modules are enabled:

```bash
# Verify BGP module is enabled
./lnms config:get discovery_modules.bgp-peers
./lnms config:get poller_modules.bgp-peers

# Manually poll BGP data
./lnms device:poll 2001:db8::1 -m bgp-peers

# View: Routing > BGP Sessions
# IPv6 BGP peers appear with their IPv6 neighbor addresses
```

## Step 7: Create IPv6-Specific Alerts

```php
// In LibreNMS UI: Alerts > Alert Rules > Create

// Alert when a port on an IPv6-monitored device goes down
// Rule: macros.port_down = 1

// Alert when the IPv6 device is unreachable
// Rule: devices.status != 1 AND devices.type = "network"
```

## Step 8: API Query for IPv6 Devices

```bash
# Look up a device by IPv6 address
curl -s -H "X-Auth-Token: $LIBRENMS_API_TOKEN" \
  "https://librenms.example.com/api/v0/devices?type=ipv6&query=2001:db8::1" | \
  jq '.devices[] | {device_id, hostname}'
```

LibreNMS's SNMP-based discovery and polling works with IPv6 addresses, providing the same interface monitoring as IPv4. Features such as BGP sessions and routing tables depend on the relevant discovery and poller modules and the SNMP data exposed by the device.
