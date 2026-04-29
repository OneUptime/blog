# How to Configure Mangle Rules for IPv4 Traffic Marking on MikroTik

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MikroTik, RouterOS, Mangle, Traffic Marking, QoS, IPv4, Policy Routing

Description: Configure MikroTik firewall mangle rules to mark IPv4 connections and packets for QoS queue assignment, policy-based routing, and DSCP remarking.

## Introduction

The MikroTik mangle table pre-processes packets before routing and queuing decisions. Mangle marks are used to route traffic through specific gateways (policy routing) or to assign packets to QoS queues.

## Mark Connection and Packet (Two-Step Method)

```mikrotik
# Step 1: Mark the connection (first packet only)

/ip firewall mangle add \
  chain=prerouting \
  connection-state=new \
  protocol=tcp \
  dst-port=80,443 \
  action=mark-connection \
  new-connection-mark=HTTP-CONN \
  passthrough=yes \
  comment="Mark HTTP connections"

# Step 2: Mark subsequent packets in that connection
/ip firewall mangle add \
  chain=prerouting \
  connection-mark=HTTP-CONN \
  action=mark-packet \
  new-packet-mark=HTTP-PACKET \
  passthrough=no \
  comment="Mark HTTP packets"
```

## Mark VoIP Traffic (UDP, RTP Ports)

```mikrotik
/ip firewall mangle add \
  chain=prerouting \
  protocol=udp \
  dst-port=10000-20000 \
  action=mark-connection \
  new-connection-mark=VOIP-CONN \
  passthrough=yes

/ip firewall mangle add \
  chain=prerouting \
  connection-mark=VOIP-CONN \
  action=mark-packet \
  new-packet-mark=VOIP-PACKET \
  passthrough=no
```

## DSCP Remarking

```mikrotik
# Mark VoIP with DSCP EF (46 = Expedited Forwarding)
/ip firewall mangle add \
  chain=forward \
  connection-mark=VOIP-CONN \
  action=change-dscp \
  new-dscp=46 \
  passthrough=yes

# Strip DSCP on incoming traffic (normalize untrusted DSCP)
/ip firewall mangle add \
  chain=prerouting \
  in-interface=ether1 \
  action=change-dscp \
  new-dscp=0 \
  passthrough=yes \
  comment="Reset DSCP from untrusted WAN"
```

## Policy Routing Mark

```mikrotik
# Route gaming traffic through low-latency ISP2
/ip firewall mangle add \
  chain=prerouting \
  dst-port=27015-27020 \
  protocol=udp \
  action=mark-routing \
  new-routing-mark=ISP2-ROUTE \
  passthrough=no \
  comment="Gaming traffic via ISP2"

# Create routing table first, then add route to it
/routing table add name=ISP2-ROUTE fib
/ip route add \
  dst-address=0.0.0.0/0 \
  gateway=198.51.100.1 \
  routing-table=ISP2-ROUTE
```

## Per-Host Download Marking

```mikrotik
# Mark download traffic for a specific host
/ip firewall mangle add \
  chain=forward \
  dst-address=192.168.1.100 \
  in-interface=ether1 \
  action=mark-packet \
  new-packet-mark=HOST-100-DOWN \
  passthrough=no

# Assign to queue
/queue tree add \
  name=HOST-100-LIMIT \
  parent=global \
  packet-mark=HOST-100-DOWN \
  max-limit=5M
```

## Verify Mangle Rules

```mikrotik
# Show all mangle rules with stats
/ip firewall mangle print stats

# Show specific chain
/ip firewall mangle print where chain=prerouting
```

## Conclusion

MikroTik mangle works in two steps: mark the connection on the first packet, then mark all subsequent packets using the connection mark. This avoids re-evaluating expensive pattern matching for every packet. Use packet marks for queue assignment, routing marks for policy routing, and DSCP changes for QoS remarking toward downstream devices.
