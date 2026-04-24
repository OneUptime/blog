# How to Configure PRTG Network Monitor with SNMP Sensors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PRTG, SNMP, Monitoring, IPv4, Network, OID, Sensor

Description: Learn how to configure PRTG Network Monitor to collect metrics from network devices using SNMP sensors for bandwidth, CPU, and interface monitoring.

---

PRTG Network Monitor uses SNMP to poll network devices for metrics. Configuring SNMP sensors in PRTG gives you visibility into bandwidth, CPU, memory, and interface statistics from switches, routers, and servers.

## Prerequisites

- SNMP v2c or v3 enabled on the target device.
- PRTG installed and running.
- The device's IPv4 address reachable from the PRTG probe server.

## Enabling SNMP on a Linux Server (Target)

```bash
apt install snmpd -y   # Debian/Ubuntu

# /etc/snmp/snmpd.conf

# Allow SNMP v2c access from the PRTG probe
rocommunity public 192.168.1.50   # PRTG probe's IPv4
# Or allow the whole monitoring subnet
rocommunity public 192.168.1.0/24

# Bind to the server's IPv4 address
agentaddress udp:192.168.1.10:161

systemctl enable --now snmpd
```

## Adding a Device in PRTG

1. Log in to PRTG web interface.
2. **Devices → Add Device**.
3. Set **IPv4 Address/DNS Name**: `192.168.1.10`.
4. Under **SNMP Version**, select **v2c**.
5. Set **Community String**: `public` (match `snmpd.conf`).
6. Click **Continue**.

## Adding SNMP Sensors

### SNMP Traffic Sensor (Bandwidth Monitoring)

1. Click on the device → **Add Sensor**.
2. Search for **SNMP Traffic**.
3. PRTG will auto-discover network interfaces via SNMP.
4. Select the interfaces to monitor (e.g., `eth0`, `bond0`).
5. Click **Create Sensor**.

By default, this creates channels for traffic in, traffic out, and traffic total. You can also enable additional error and discard channels when you add the sensor.

### SNMP CPU Load Sensor

1. **Add Sensor** → Search **SNMP CPU Load**.
2. PRTG reads the `HOST-RESOURCES-MIB::hrProcessorLoad` table and reports per-processor and total CPU load.
3. Set alert thresholds (e.g., alert at 90% for 5 minutes).

### Custom SNMP OID Sensor

For monitoring a specific metric (e.g., a vendor-specific OID from a custom MIB, or context switches on a Net-SNMP host):

1. **Add Sensor** → **SNMP Custom**.
2. Enter the OID: e.g., `.1.3.6.1.4.1.2021.11.60.0` (`UCD-SNMP-MIB::ssRawContexts`).
3. Set the **Value Type** (for example, **Delta (counter)** for a monotonically increasing counter).
4. Add unit label and alert thresholds.

## SNMP v3 Configuration (Secure)

SNMP v3 adds authentication and encryption.

```bash
# Persistent Net-SNMP snmpd.conf (createUser belongs here)
createUser prtguser SHA "AuthPass123!" AES "PrivPass456!"

# /etc/snmp/snmpd.conf
rouser prtguser priv

systemctl restart snmpd
```

In PRTG:
1. Device settings → **SNMP Version**: **v3**.
2. Set **Authentication Method**: **SHA**.
3. Set **User Name**: `prtguser`, **Password**: `AuthPass123!`.
4. Set **Encryption Type**: **AES**, **Encryption Key**: `PrivPass456!`.

## Testing SNMP Connectivity

```bash
# Test from the PRTG probe server to the device (SNMP v2c)
snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.2.1.1

# Test SNMP v3
snmpwalk -v3 -u prtguser -l authPriv -a SHA -A "AuthPass123!" -x AES -X "PrivPass456!" \
  192.168.1.10 1.3.6.1.2.1.1
```

## Key Takeaways

- Configure `snmpd.conf` to allow access from the PRTG probe's IPv4 address.
- Use SNMP v3 with authentication (SHA) and encryption (AES) in production.
- PRTG auto-discovers interfaces with the SNMP Traffic sensor - select only the interfaces you need.
- Use the **SNMP Custom** sensor for any specific OID not covered by PRTG's built-in sensor library.
