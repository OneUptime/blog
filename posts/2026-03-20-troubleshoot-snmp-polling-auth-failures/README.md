# How to Troubleshoot SNMP Polling Timeouts and Authentication Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SNMP, Troubleshooting, Authentication, Timeout, Network Management

Description: Learn how to systematically diagnose and fix SNMP polling timeouts, authentication failures, and community string mismatches that prevent NMS tools from collecting device data.

## Common SNMP Failure Symptoms

| Symptom | Likely Cause |
|---|---|
| Timeout or no response | UDP 161 blocked, wrong IP, device unreachable |
| Authentication failure | Wrong community string or SNMPv3 credentials |
| No data / empty response | Wrong OID, SNMP not enabled, wrong version |
| Intermittent timeouts | CPU overload on device, UDP packet loss |

## Step 1: Verify Basic SNMP Connectivity

Start with the most basic test-a simple `snmpget` from your NMS:

```bash
# Test SNMPv2c - get system description

snmpget -v2c -c public 192.168.1.1 sysDescr.0

# If this fails, check:
# 1. Is the device IP correct?
# 2. Is port 161 reachable?
# 3. Is the community string correct?

# Test UDP port 161 reachability
nc -uzv 192.168.1.1 161
# or
nmap -sU -p 161 192.168.1.1
```

## Step 2: Check for Firewall Blocking UDP 161

The most common cause of timeouts is a firewall blocking UDP 161:

```bash
# Use tcpdump on the network device to see if queries arrive
# (from another host on the same segment as the router)
sudo tcpdump -i eth0 udp port 161 -n

# If you see SNMP queries arriving but getting no response:
# - Check ACL on the SNMP community string
# - Check for iptables rules on Linux hosts running SNMP

# On the Cisco device, check for SNMP access restrictions
Router# show run | include snmp-server community
# snmp-server community public RO 10   <- ACL 10 applies
Router# show access-list 10
# Standard IP access list 10
#  10 permit 192.168.1.100
# If your NMS IP isn't in the ACL, it's blocked
```

## Step 3: Verify Community String

Authentication failures from wrong community strings appear as timeouts in SNMPv2c (no error is returned-the packet is silently dropped):

```bash
# Enable SNMP authentication failure traps on the device
Router(config)# snmp-server enable traps snmp authentication

# Then test with wrong community (you should see a trap in the log)
snmpget -v2c -c wrongcommunity 192.168.1.1 sysDescr.0
# Should timeout

# Check router logs for auth failure
Router# show log | include SNMP
# %SNMP-3-AUTHFAIL: Authentication failure for SNMP req from host 192.168.1.100
```

## Step 4: Debug SNMP on Cisco IOS

Enable SNMP debugging for real-time diagnosis:

```text
! Enable SNMP debug (use carefully - can be verbose)
Router# debug snmp packets
Router# debug snmp requests

! Watch for:
! SNMP: Packet received via UDP from 192.168.1.100 on interface
! SNMP: Verify community string for request
! SNMP: Sending response to 192.168.1.100

! Stop debugging
Router# no debug all
```

## Step 5: Fix SNMPv3 Authentication Failures

SNMPv3 auth failures are more explicit. Common issues:

```bash
# Test SNMPv3 with full debug output
snmpget -v3 -l authPriv -u nmsuser -a SHA -A "AuthPass@2026!" \
  -x AES -X "PrivPass@2026!" 192.168.1.1 sysDescr.0 -d

# Common errors:
# "Unknown user name" -> user doesn't exist on the device
# "Authentication failure" -> wrong auth password
# "Decryption error" -> wrong priv password or algorithm mismatch
# "noSuchName" -> OID doesn't exist
# "No response" -> network or ACL issue
```

Fix SNMPv3 credentials on Cisco IOS:

```text
! Re-create the SNMPv3 user with correct settings
Router(config)# no snmp-server user nmsuser NetOpsGroup v3
Router(config)# snmp-server user nmsuser NetOpsGroup v3 \
  auth sha AuthPass@2026! \
  priv aes 128 PrivPass@2026!
```

## Step 6: Fix SNMP Timeout Due to CPU Overload

If the device is CPU-loaded, SNMP responses may be delayed or dropped:

```text
! Check CPU utilization on Cisco
Router# show processes cpu sorted

! If CPU > 80%, SNMP queries may time out
! Reduce SNMP polling frequency in your NMS
! Or increase the timeout/retry settings in the NMS

! Check SNMP agent queue on Cisco
Router# show snmp
! "X SNMP packets output" - verify this counter increments when you query
```

## Step 7: Check MIB Support

Some OIDs aren't supported on all devices:

```bash
# Test if a specific OID is supported
snmpget -v2c -c public 192.168.1.1 CISCO-PROCESS-MIB::cpmCPUTotal5minRev.7

# If you get "No Such Object" or "No Such Instance":
# - The OID doesn't exist on this device/version
# - Try an alternative OID
snmpget -v2c -c public 192.168.1.1 1.3.6.1.4.1.9.9.109.1.1.1.1.8.1
```

## Troubleshooting Checklist

```text
□ Ping the device IP from the NMS server
□ Test UDP port 161: nc -uzv device-ip 161
□ Try snmpget with correct version and community
□ Check device ACL for NMS IP restriction
□ Enable auth failure traps and test with wrong community
□ For SNMPv3: verify user, auth protocol, auth password, priv protocol, priv password
□ Check device CPU load - high CPU causes timeout
□ Verify OID exists on the device with snmpget
□ Increase NMS timeout/retry count for slow devices
```

## Conclusion

SNMP troubleshooting starts with basic connectivity (UDP 161 reachability), then moves to community string or SNMPv3 credential verification. Use `debug snmp packets` on the device for real-time diagnosis, enable authentication failure traps to catch wrong community strings, and check device CPU load if timeouts are intermittent. Always test with `snmpget` manually before debugging NMS-level issues.
