# How to Configure Zigbee IP with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Zigbee, ZigbeeIP, IoT, 6LoWPAN, Smart Home

Description: Understand and configure Zigbee IP (ZIP), a variant of Zigbee that uses 6LoWPAN and IPv6 for smart grid and building automation applications.

## Introduction

Zigbee IP (ZIP) is a standard developed by the Zigbee Alliance (now CSA) that combines Zigbee's IEEE 802.15.4 radio technology with 6LoWPAN and IPv6, enabling end-to-end IP connectivity for smart grid, demand response, and building automation applications. This is distinct from regular Zigbee (which uses its own mesh networking layer).

## Zigbee IP vs. Classic Zigbee

| Feature | Classic Zigbee | Zigbee IP |
|---|---|---|
| Network Layer | Zigbee-specific | IPv6 + 6LoWPAN |
| Internet Access | Via gateway/bridge | Direct IPv6 |
| Addressing | Zigbee 16-bit short | Full IPv6 |
| Routing | Zigbee mesh | RPL |
| Application | ZCL (Zigbee Cluster Library) | RESTful HTTP or CoAP |
| Use Case | Smart home, lighting | Smart grid, energy management |

## Zigbee IP Network Stack

```text
Application:   ZCL (Zigbee Cluster Library) over HTTP/CoAP
Transport:     TCP/UDP
Network:       IPv6
Adaptation:    6LoWPAN (RFC 4944, RFC 6282)
MAC/PHY:       IEEE 802.15.4 (2.4 GHz)
```

## Setting Up a Zigbee IP Border Router

On a Linux system with an IEEE 802.15.4 radio:

```bash
# Configure 802.15.4 for Zigbee IP channel (typically channel 11-26 at 2.4 GHz)

sudo iwpan phy phy0 set channel 0 11

# Set PAN ID for the Zigbee IP network
sudo iwpan dev wpan0 set pan_id 0x1234

# Create 6LoWPAN interface
sudo ip link add link wpan0 name lowpan0 type lowpan
sudo ip link set wpan0 up
sudo ip link set lowpan0 up

# Assign IPv6 address to the border router's mesh interface
sudo ip -6 addr add 2001:db8:1::1/64 dev lowpan0

# Enable forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1
```

## Configure RPL for Zigbee IP Routing

Zigbee IP uses RPL (RFC 6550) for mesh routing:

```bash
# Install and configure RIOT OS or Contiki-NG on the Zigbee IP gateway
# with RPL support enabled

# For testing with a Linux-based RPL implementation:
# Install the RIOT OS native platform or use OpenThread's RPL implementation

# Alternatively, use rpl-border-router from Contiki-NG
git clone https://github.com/contiki-ng/contiki-ng.git
cd contiki-ng/examples/rpl-border-router
make TARGET=native
./border-router.native
```

## Configuring Zigbee IP Devices

Zigbee IP devices are typically configured using ZCL attributes over HTTP/CoAP:

```python
# Example: Read a smart meter reading via Zigbee IP
# Using CoAP to communicate with a Zigbee IP electricity meter

import asyncio
import aiocoap

async def read_smart_meter(device_ipv6: str):
    """Read electricity meter data from a Zigbee IP device."""
    protocol = await aiocoap.Context.create_client_context()

    # Zigbee IP devices expose ZCL clusters as CoAP resources
    # Metering cluster (0x0702) provides electricity readings
    uri = f"coap://[{device_ipv6}]/zcl/metering"

    request = aiocoap.Message(code=aiocoap.GET, uri=uri)

    try:
        response = await asyncio.wait_for(
            protocol.request(request).response,
            timeout=10.0
        )
        print(f"Meter data: {response.payload.decode()}")
        return response.payload
    except Exception as e:
        print(f"Error reading meter: {e}")
        return None

async def main():
    # Replace with actual IPv6 address of Zigbee IP smart meter
    meter_address = "2001:db8:1::100"
    await read_smart_meter(meter_address)

asyncio.run(main())
```

## IPv6 Address Configuration for Zigbee IP Devices

```bash
# Zigbee IP devices use EUI-64 derived addresses by default
# or can use SLAAC from the border router's RA

# Check what addresses a Zigbee IP device has
# (from a device running RIOT OS with Zigbee IP stack)
# In RIOT shell:
# > ifconfig
# Shows: IPv6 addresses including mesh-local and global via SLAAC

# Manually assign a fixed IPv6 address for critical devices
# (using DHCPv6 with reservations based on EUI-64)
```

## TLS Security for Zigbee IP

```bash
# Zigbee IP (via SEP 2.0 / IEEE 2030.5) mandates TLS 1.2 over TCP for secure communication
# using ECC cipher suites (ECDHE-ECDSA with prime256v1 / secp256r1)
# Generate a certificate for a Zigbee IP device

openssl ecparam -genkey -name prime256v1 -noout -out device.key
openssl req -new -x509 -key device.key \
    -out device.crt \
    -days 3650 \
    -subj "/CN=smartmeter.zigbeeip.example.com"

# The device certificate is stored in the device's flash memory
# during manufacturing or commissioning
```

## Monitoring Zigbee IP Network

```bash
# Monitor 802.15.4 traffic on the Zigbee IP channel
sudo tcpdump -i lowpan0 -v

# Check IPv6 neighbor cache for Zigbee IP devices
ip -6 neigh show dev lowpan0

# Ping a Zigbee IP device
ping6 -c 3 2001:db8:1::100
```

## Conclusion

Zigbee IP brings full IPv6 connectivity to smart grid and commercial building automation applications by combining IEEE 802.15.4's proven radio technology with 6LoWPAN, RPL, and IPv6. Unlike classic Zigbee, Zigbee IP devices are addressable directly from the internet without protocol translation gateways, enabling direct cloud integration and end-to-end encrypted communication via TLS. The RESTful interface (HTTP with CoAP as an alternative over constrained links) makes it straightforward to interact with Zigbee IP devices using standard web semantics.
