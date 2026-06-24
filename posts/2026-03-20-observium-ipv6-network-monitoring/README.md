# How to Configure Observium for IPv6 Network Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Observium, IPv6, Network Monitoring, SNMP, NMS, Visualization

Description: A guide to configuring Observium to discover and monitor network devices over IPv6, including SNMP configuration and IPv6 interface graphs.

Observium is a network monitoring platform with auto-discovery capabilities. It supports IPv6 device discovery via SNMP and can monitor IPv6 interface statistics, routing tables, and BGP sessions.

## Step 1: Enable IPv6 in Observium Configuration

```php
<?php
// /opt/observium/config.php - Configure SNMP for IPv6 monitoring
// Observium's default SNMP transports already include udp6 and tcp6,
// so IPv6 monitoring works out of the box - no global toggle needed.

// SNMP community strings to try when discovering devices
$config['snmp']['community'] = ['public', 'monitoring'];

// SNMP v3 for secure IPv6 monitoring
$config['snmp']['v3'][0]['authlevel']  = 'authPriv';
$config['snmp']['v3'][0]['authname']   = 'observium';
$config['snmp']['v3'][0]['authpass']   = 'authPassword123';
$config['snmp']['v3'][0]['authalgo']   = 'SHA';
$config['snmp']['v3'][0]['cryptopass'] = 'privPassword123';
$config['snmp']['v3'][0]['cryptoalgo'] = 'AES';
```

## Step 2: Add an IPv6 Device to Observium

```bash
# Add device by IPv6 address
# Syntax: ./add_device.php <hostname> [community] [v1|v2c] [port] [udp|udp6|tcp|tcp6]
# Use udp6 transport for IPv6 devices.

cd /opt/observium
./add_device.php 2001:db8::router1 public v2c 161 udp6

# Or add via the web UI:
# Devices > Add Device
# Enter: 2001:db8::router1 as the hostname/IP
# Select SNMP version and enter community/credentials
```

## Step 3: Configure Autodiscovery for IPv6 Networks

```php
// config.php - Set IPv6 network ranges for autodiscovery
// Networks listed here will be scanned for new SNMP-capable devices
$config['autodiscovery']['ip_nets'][] = '10.0.0.0/8';
$config['autodiscovery']['ip_nets'][] = '2001:db8::/32';    // IPv6 range
$config['autodiscovery']['ip_nets'][] = 'fd00::/8';         // ULA range

// Enable xDP (CDP/LLDP) discovery which works over IPv6
$config['autodiscovery']['xdp'] = 1;
```

```bash
# Run discovery against all known devices (autodiscovery walks
# their neighbour tables and the configured ip_nets ranges)
./discovery.php -h all

# Or only newly added devices
./discovery.php -h new
```

## Step 4: Poll IPv6 Device Data

```bash
# Run the poller for a specific IPv6 device
./poller.php -h 2001:db8::router1

# Set up cron jobs for continuous polling (typical Observium setup)
# These already run from the default Observium cron; just verify:
crontab -l | grep observium
```

## Step 5: Monitor IPv6 Interfaces

Once a device is polled, navigate to the device in the Observium UI:

- **Devices → [Device Name] → Interfaces**
- IPv6 interfaces (with IPv6 addresses) appear alongside IPv4 interfaces
- Click an interface to see RX/TX graphs

Observium automatically collects:
- Interface operational status
- IPv6 address assignments from the device
- Bytes/packets in and out per IPv6 interface

## Step 6: View IPv6 Routing Table

Routing data is collected by the standard polling cycle - no extra
module flag is needed. Once the device has been polled, view the
routing tables in the Observium UI:

```text
Devices > [Device] > Routing
```

IPv6 routes appear alongside IPv4 routes when the device exposes them
via the appropriate routing MIBs.

## Step 7: Monitor IPv6 BGP Sessions

```php
// Enable BGP session collection in config.php
$config['enable_bgp'] = 1;
```

```bash
# Re-run the poller for the device after enabling BGP collection
./poller.php -h 2001:db8::router1
```

Navigate to **Routing → BGP** to see all BGP sessions including IPv6 peer addresses.

## Step 8: Set Up Email Alerts for IPv6 Device Issues

```php
// config.php - Email transport configuration
$config['email']['enable']      = 1;
$config['email']['default']     = 'admin@example.com';
$config['email']['from']        = 'observium@example.com';
$config['email']['smtp_host']   = 'smtp.example.com';
$config['email']['smtp_port']   = 587;
```

Device-down notifications are not toggled by a single config flag in
Observium. Instead, configure an alert checker in the web UI under
**Alerts → Add Alert Check**, set the entity type to *Device*, and
select a condition such as `device_status = 0`. Associate the checker
with a contact (the address configured above) to receive emails when
matching devices go down.

## Verify IPv6 Monitoring

```bash
# Check SNMP connectivity to IPv6 device
# net-snmp requires the udp6: transport prefix for IPv6 targets
snmpget -v2c -c public udp6:[2001:db8::router1]:161 sysDescr.0

# Verify Observium can reach the IPv6 device (debug mode)
./poller.php -h 2001:db8::router1 -d

# Check Observium error log
tail -f /opt/observium/logs/observium.log | grep -i "ipv6\|error"
```

Observium's SNMP-driven monitoring model works identically for IPv6 devices as for IPv4 - simply enter the IPv6 address when adding a device and Observium handles the rest, providing full interface graphs and BGP session visibility.
