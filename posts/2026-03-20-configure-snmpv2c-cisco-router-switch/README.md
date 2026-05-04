# How to Configure SNMPv2c on a Cisco Router or Switch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SNMP, SNMPv2c, Cisco IOS, Network Monitoring, NMS

Description: Learn how to configure SNMPv2c on Cisco IOS routers and switches, including community strings, trap destinations, and access control lists for secure SNMP monitoring.

## What Is SNMPv2c?

SNMPv2c (Simple Network Management Protocol version 2 with community-based security) is the most widely used SNMP version for network monitoring. It uses community strings as a simple form of authentication. While SNMPv3 offers stronger security, SNMPv2c remains common due to broad tool support.

**Security note:** SNMPv2c community strings are transmitted in cleartext. Always use read-only communities and restrict access with ACLs.

## Step 1: Configure a Read-Only Community String

```text
! Configure a read-only community - NMS can poll but not change settings
Router(config)# snmp-server community public RO

! Use a less guessable community string in production
Router(config)# snmp-server community Net0ps_M0n!t0r RO

! Restrict community to a specific NMS using an ACL
Router(config)# access-list 10 permit 192.168.1.100    ! NMS server IP
Router(config)# snmp-server community Net0ps_M0n!t0r RO 10
```

Always pair community strings with an ACL to prevent unauthorized polling.

## Step 2: Configure Device Identity Information

These fields help identify the device in your NMS:

```text
! Set contact information
Router(config)# snmp-server contact "NetOps Team - netops@example.com"

! Set physical location for asset tracking
Router(config)# snmp-server location "DC1 - Rack 42 - Row B"

! Set the hostname (if not already set)
Router(config)# hostname Core-Router-01
```

## Step 3: Configure SNMP Trap Destination

Send SNMP traps to your NMS when events occur:

```text
! Send SNMPv2c traps to the NMS server
Router(config)# snmp-server host 192.168.1.100 version 2c public

! Enable specific trap categories
Router(config)# snmp-server enable traps snmp authentication linkdown linkup    ! Auth failures and interface up/down
Router(config)# snmp-server enable traps bgp                                    ! BGP state changes
Router(config)# snmp-server enable traps ospf                                   ! OSPF events

! Set the trap source interface (use loopback for consistency)
Router(config)# snmp-server trap-source Loopback0
```

## Step 4: Restrict SNMP Access With a Named ACL

Restrict which source IPs can poll the device via SNMP:

```text
! Restrict SNMP polling to specific NMS source IPs using a named ACL
Router(config)# ip access-list standard SNMP_ACCESS
Router(config-std-nacl)# permit 192.168.1.100
Router(config-std-nacl)# permit 192.168.1.101
Router(config-std-nacl)# deny any log
Router(config)# exit
Router(config)# snmp-server community Net0ps_M0n!t0r RO SNMP_ACCESS
```

## Step 5: Verify SNMP Configuration

```bash
! View current SNMP configuration
Router# show snmp

! Expected output:
! Chassis: FOX1234ABCD
! Contact: NetOps Team - netops@example.com
! Location: DC1 - Rack 42 - Row B
! 0 SNMP packets input
!     0 Bad SNMP version errors
! ...

! Show the configured communities
Router# show run | include snmp-server community

! Test SNMP polling from the NMS (run on the NMS server)
$ snmpget -v2c -c Net0ps_M0n!t0r 192.168.1.1 sysDescr.0
$ snmpwalk -v2c -c Net0ps_M0n!t0r 192.168.1.1 interfaces
```

## Step 6: Poll Interface Counters

Common SNMP OIDs for interface monitoring:

```bash
# Interface description

snmpwalk -v2c -c public 192.168.1.1 ifDescr

# Interface operational status (1=up, 2=down)
snmpwalk -v2c -c public 192.168.1.1 ifOperStatus

# Inbound octets (bytes)
snmpwalk -v2c -c public 192.168.1.1 ifInOctets

# Outbound octets (bytes)
snmpwalk -v2c -c public 192.168.1.1 ifOutOctets
```

## Step 7: Set SNMP Engine ID

The Engine ID uniquely identifies the SNMP agent. Set it explicitly for consistent identification:

```text
Router(config)# snmp-server engineID local 0000000001020304
```

## Conclusion

SNMPv2c configuration on Cisco IOS requires a community string, NMS host for traps, and an ACL to restrict access. Always use a non-default community string (not "public" or "private"), restrict SNMP access with an ACL, and configure `snmp-server trap-source` to use a loopback for consistent trap identification. Use SNMPv3 for environments requiring authentication and encryption.
