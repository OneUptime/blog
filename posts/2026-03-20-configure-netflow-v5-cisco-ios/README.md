# How to Configure NetFlow v5 on Cisco IOS Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NetFlow, Cisco IOS, Traffic Analysis, Network Monitoring, Flow Export

Description: Learn how to enable NetFlow v5 on Cisco IOS routers, configure flow export to a collector, and verify that flows are being captured and exported correctly.

## What Is NetFlow?

NetFlow is a Cisco technology that records information about IP traffic flows traversing a router or switch. A flow is a sequence of packets with the same source/destination IP, source/destination port, protocol, and IP ToS. NetFlow data is exported to a collector where it can be analyzed for capacity planning, troubleshooting, and security analysis.

## NetFlow v5 Key Fields

Each NetFlow v5 record contains:
- Source/Destination IP
- Source/Destination Port
- IP Protocol (TCP/UDP/ICMP)
- IP Type of Service (ToS)
- Input/Output interface index
- Packet and byte counts
- Start/End timestamps
- TCP flags
- BGP AS numbers (if configured)

## Step 1: Enable NetFlow on an Interface

Enable NetFlow monitoring on each interface you want to capture traffic from:

```text
! Enable NetFlow on the WAN-facing interface (captures inbound and outbound)
Router(config)# interface GigabitEthernet0/0
! Capture inbound flows
Router(config-if)# ip flow ingress

! Also capture outbound flows
Router(config-if)# ip flow egress

! Repeat for all interfaces you want to monitor
Router(config)# interface GigabitEthernet0/1
Router(config-if)# ip flow ingress
```

## Step 2: Configure NetFlow Export

Point the router to your NetFlow collector:

```bash
! Specify the collector's IP and UDP port (2055 is common)
Router(config)# ip flow-export destination 192.168.1.200 2055

! Set NetFlow export version to v5
Router(config)# ip flow-export version 5

! Set the source interface for export packets (use loopback for stability)
Router(config)# ip flow-export source Loopback0
```

## Step 3: Tune Flow Cache Parameters

Adjust how flows are cached and exported:

```bash
! Set active flow timeout (export active flows after this many minutes)
Router(config)# ip flow-cache timeout active 5

! Set inactive flow timeout (export idle flows after this many seconds)
Router(config)# ip flow-cache timeout inactive 60

! Show current flow cache settings (timeouts appear in the cache header)
Router# show running-config | include flow-cache
```

## Step 4: Verify NetFlow Is Capturing Flows

```text
! Show the flow cache (active flows)
Router# show ip cache flow

IP Flow Switching Cache, 278544 bytes
  500 active, 64036 inactive, 15500 added
  ...

Protocol         Total    Flows    Bytes   Packets  Bytes/Flow
TCP-WWW         30000       150   150000   3000000        1000
UDP-DNS          5000        25    25000    500000        1000
...

SrcIf     SrcIPaddress    DstIf     DstIPaddress    Pr  TOS   Fl  Pkts  B/Pk  Active
Gi0/0     10.0.0.1        Gi0/1     8.8.8.8         11   00   00    10  1000   0.0
```

## Step 5: Verify Flow Export

```bash
! Show export statistics
Router# show ip flow export

Flow export v5 is enabled for main cache
  Exporting flows to 192.168.1.200 (2055)
  Exporting using source interface Loopback0
  Version 5 flow records
  2500 flows exported in 150 udp datagrams
  0 flows failed due to lack of export packet
  5 export packets were sent up to process level
```

A growing `flows exported` count confirms data is being sent.

## Step 6: Set Up a Collector (nfdump on Linux)

```bash
# Install nfdump NetFlow collector

sudo apt-get install -y nfdump

# Start the collector listening on UDP 2055
nfcapd -w -D -l /var/log/netflow/ -p 2055 -b 0.0.0.0

# View captured flows
nfdump -R /var/log/netflow/ -s srcip/bytes -n 10

# Show top talkers by byte volume
nfdump -R /var/log/netflow/ \
  -s srcip/bytes -n 10 \
  -o "fmt:%ts %td %pr %sa %da %sp %dp %pkt %byt"
```

## Step 7: Enable BGP AS Information in Flows

For full visibility into AS-level traffic:

```bash
! Enable BGP peer AS information in NetFlow records
Router(config)# ip flow-export version 5 origin-as

! Or use peer-as for transit traffic
Router(config)# ip flow-export version 5 peer-as
```

## Conclusion

NetFlow v5 on Cisco IOS is straightforward: enable `ip flow ingress` (and optionally `egress`) on each monitored interface, configure the collector destination and version, then verify with `show ip cache flow` and `show ip flow export`. Use a collector like nfdump or ntopng to analyze the exported data for traffic patterns, capacity planning, and security investigation.
