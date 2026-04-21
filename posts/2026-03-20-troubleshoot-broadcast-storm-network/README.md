# How to Troubleshoot Broadcast Storm Issues on a Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Broadcast Storm, Switching, STP, Troubleshooting, Layer 2

Description: Diagnose and resolve broadcast storms caused by switching loops, misconfigured STP, or misbehaving hosts by identifying high-broadcast interfaces and containing the affected segment.

## Introduction

A broadcast storm occurs when broadcast packets circulate in an infinite loop, exponentially consuming bandwidth and CPU resources until the network becomes unusable. The primary cause is a Layer 2 loop without Spanning Tree Protocol (STP) protection, but a single misbehaving host can also generate excessive broadcasts.

## Recognizing a Broadcast Storm

Symptoms:
- All hosts on a segment lose connectivity simultaneously
- Switch CPU spikes to 100%
- Interface counters show rapidly incrementing broadcast or discard counts
- Users report network "going down" intermittently

## Step 1: Identify the Affected Interface

```bash
# On a Linux host - check which interface is receiving floods

watch -n 1 "ip -s link show"
```

Look for a counter incrementing thousands of times per second. On a Cisco switch:

```text
show interfaces counters
show interfaces counters errors
show interfaces status
```

## Step 2: Isolate the Flooding Source with tcpdump

```bash
# Capture the first 100 broadcast packets and look for the source
sudo tcpdump -i eth0 -e -n -c 100 "broadcast" | awk '{print $2}' | sort | uniq -c | sort -rn | head -20
```

A genuine storm often shows one source MAC dominating the sample, or a pattern of the same packet looping.

## Step 3: Check for Switching Loops

On a managed switch, look for STP topology changes:

```text
! Cisco: check for rapid STP topology changes
show spanning-tree detail | include [Tt]opology
show spanning-tree | include BLK|LIS|LRN|FWD

! Check for interfaces in forwarding that should be blocking
show spanning-tree vlan 1
```

A port that should be **BLK** but shows **FWD** indicates a loop.

## Step 4: Break the Loop Immediately

Physically disconnect suspect uplinks one at a time until the storm stops. On a managed switch:

```text
! Shut the suspect port
interface GigabitEthernet0/24
 shutdown
```

Do NOT shut all ports - work one at a time to identify which cable is creating the loop.

## Step 5: Enable Storm Control

Configure storm control to automatically suppress broadcast traffic and shut the port when a storm is detected:

```text
! Cisco: limit broadcast to 20% of interface bandwidth
interface GigabitEthernet0/1
 storm-control broadcast level 20.00
 storm-control action shutdown
```

On Linux with `tc`:

```bash
# Police inbound Ethernet broadcast traffic on eth0 to 1 Mbit/s
sudo tc qdisc add dev eth0 handle ffff: ingress
sudo tc filter add dev eth0 parent ffff: protocol all u32 \
  match ether dst ff:ff:ff:ff:ff:ff \
  action police rate 1mbit burst 10k conform-exceed drop
```

## Step 6: Enable PortFast and BPDU Guard on Access Ports

Prevent end hosts from accidentally creating loops:

```text
! Apply to access ports that connect to end hosts
interface range GigabitEthernet0/1-23
 spanning-tree portfast
 spanning-tree bpduguard enable
```

BPDU Guard will err-disable any port that receives an STP BPDU, immediately breaking a loop caused by a rogue STP-speaking switch.

## Step 7: Check for Misbehaving Hosts

A single host with a faulty NIC driver or application can generate broadcast floods without a loop:

```bash
# Find the top broadcast senders on the segment
sudo tcpdump -i eth0 -e -n -c 1000 "broadcast" | awk '{print $2}' | sort | uniq -c | sort -rn | head -10
```

Isolate the host port and perform a NIC diagnostic.

## Conclusion

Broadcast storms are usually caused by switching loops (missing or broken STP) or a misbehaving host. Contain immediately by shutting suspect ports, then harden with storm control thresholds and BPDU Guard on end-host access ports to prevent recurrence.
