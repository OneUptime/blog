# How to Configure QinQ (802.1ad) Stacked VLANs on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, QinQ, 802.1ad, Stacked VLANs, VLAN, Networking, Service Provider

Description: Configure 802.1ad QinQ double-tagging on Linux to stack an outer service VLAN (S-VLAN) over an inner customer VLAN (C-VLAN) for service provider network segmentation.

## Introduction

QinQ (IEEE 802.1ad) stacks two VLAN tags: an outer Service VLAN (S-VLAN) and an inner Customer VLAN (C-VLAN). This allows service providers to transport customer VLAN traffic over their backbone without VLAN ID conflicts. Linux supports QinQ via the `8021q` module with the `802.1ad` protocol option.

## Prerequisites

- Linux system with `iproute2`
- `8021q` kernel module or built-in VLAN support
- Root access
- Network infrastructure supporting 802.1ad (switches/routers)

## How QinQ Frames Look

```text
| Outer 802.1ad Tag (S-VLAN) | Inner 802.1Q Tag (C-VLAN) | Payload |
|      TPID: 0x88A8          |      TPID: 0x8100          |         |
```

## Create the Outer S-VLAN Interface (802.1ad)

```bash
# Load 8021q module

modprobe 8021q

# Create outer VLAN using 802.1ad protocol (S-VLAN ID 1000)
ip link add link eth0 name eth0.1000 type vlan id 1000 proto 802.1ad

# Bring up the physical and outer VLAN interfaces
ip link set eth0 up
ip link set eth0.1000 up
```

## Create the Inner C-VLAN Interface (802.1Q)

```bash
# Stack a 802.1Q C-VLAN (ID 100) on top of the 802.1ad S-VLAN
ip link add link eth0.1000 name eth0.1000.100 type vlan id 100 proto 802.1Q

# Assign IP to the double-tagged interface
ip addr add 192.168.100.1/24 dev eth0.1000.100
ip link set eth0.1000.100 up
```

## Verify the QinQ Configuration

```bash
# Show detailed VLAN info for the outer interface
ip -d link show eth0.1000
# vlan protocol 802.1ad id 1000

# Show detailed VLAN info for the inner interface
ip -d link show eth0.1000.100
# vlan protocol 802.1Q id 100

# Show all interfaces
ip addr show
```

## Full QinQ Setup Script

```bash
#!/bin/bash
# setup-qinq.sh: Configure QinQ double-tagged VLANs

modprobe 8021q

PARENT="eth0"
S_VLAN=1000    # Service/outer VLAN
C_VLAN=100     # Customer/inner VLAN

# Create outer 802.1ad interface
ip link add link $PARENT name ${PARENT}.${S_VLAN} type vlan id $S_VLAN proto 802.1ad
ip link set $PARENT up
ip link set ${PARENT}.${S_VLAN} up

# Create inner 802.1Q interface
ip link add link ${PARENT}.${S_VLAN} name ${PARENT}.${S_VLAN}.${C_VLAN} type vlan id $C_VLAN proto 802.1Q

# Assign IP
ip addr add 192.168.100.1/24 dev ${PARENT}.${S_VLAN}.${C_VLAN}
ip link set ${PARENT}.${S_VLAN}.${C_VLAN} up

echo "QinQ setup complete:"
ip -d link show ${PARENT}.${S_VLAN}.${C_VLAN}
```

## Verify QinQ Tagging with tcpdump

```bash
# Capture on the parent interface and match the stacked VLAN tags
tcpdump -i eth0 -e 'vlan 1000 && vlan 100'

# Look for frames whose outer VLAN ID is 1000 and inner VLAN ID is 100
```

## Conclusion

QinQ on Linux requires creating two stacked interfaces: an outer one with `proto 802.1ad` and an inner one with `proto 802.1Q`. The double-tagged frames carry both VLAN IDs through the network. This is primarily used in service provider edge scenarios where customer VLANs need to be transported across a service provider's VLAN-tagged backbone without ID conflicts.
