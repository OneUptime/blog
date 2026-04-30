# How to Configure IPv6 for Constrained IoT Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IoT, Constrained Devices, 6LoWPAN, Embedded, Networking

Description: Configure IPv6 on constrained IoT devices using lightweight stacks like Contiki-NG and RIOT OS, including address configuration and CoAP-based communication.

## Introduction

Constrained IoT devices - microcontrollers with kilobytes of RAM and limited CPU - cannot run full Linux network stacks. Lightweight IPv6 implementations like those in Contiki-NG, RIOT OS, and Zephyr RTOS bring IPv6 to these devices through optimized stacks and 6LoWPAN compression.

## What "Constrained" Means

RFC 7228 defines three device classes:
- **Class 0**: << 10KiB RAM, << 100KiB flash (typically too constrained for an IP stack and usually accessed through a gateway or proxy)
- **Class 1**: ~10KiB RAM, ~100KiB flash (can run lightweight IPv6/6LoWPAN stacks, but not all common Internet protocols)
- **Class 2**: ~50KiB RAM, ~250KiB flash (less constrained and can usually support most common Internet protocols, including TLS with careful tuning)

## Contiki-NG IPv6 Configuration

Contiki-NG is one of the most popular IoT operating systems with native 6LoWPAN and IPv6. IPv6/6LoWPAN are normally selected in the project Makefile (`MAKE_NET = MAKE_NET_IPV6`), while `project-conf.h` is used for memory-related tuning:

```c
// project-conf.h - Contiki-NG IPv6 tuning for constrained devices

// Reduce TCP/IP stack size for constrained devices
#define UIP_CONF_BUFFER_SIZE 140
#define UIP_CONF_RECEIVE_WINDOW 60
#define NBR_TABLE_CONF_MAX_NEIGHBORS 8
#define NETSTACK_MAX_ROUTE_ENTRIES 8

// Select RPL in the Makefile, e.g. MAKE_ROUTING = MAKE_ROUTING_RPL_LITE
```

## RIOT OS IPv6 Configuration

```make
# Makefile for RIOT OS application with IPv6

BOARD = samr21-xpro
USEMODULE += netdev_default
USEMODULE += auto_init_gnrc_netif
USEMODULE += gnrc_ipv6_default
USEMODULE += gnrc_udp

# For forwarding mesh nodes, switch to gnrc_ipv6_router_default and add:
# USEMODULE += gnrc_rpl
```

```c
// In application code:
#include <stdio.h>
#include "net/gnrc/netif.h"
#include "net/ipv6/addr.h"

// Get interface and one IPv6 address
gnrc_netif_t *netif = gnrc_netif_iter(NULL);
ipv6_addr_t addr;

if (gnrc_netif_ipv6_addrs_get(netif, &addr, sizeof(addr)) == sizeof(addr)) {
    char addr_str[IPV6_ADDR_MAX_STR_LEN];
    printf("IPv6: %s\n", ipv6_addr_to_str(addr_str, &addr, sizeof(addr_str)));
}
```

## Zephyr RTOS IPv6 Configuration

```ini
# prj.conf - Zephyr IPv6 configuration

CONFIG_NETWORKING=y
CONFIG_NET_IPV6=y
CONFIG_NET_IPV6_NBR_CACHE=y
CONFIG_NET_IPV6_MLD=y
CONFIG_NET_UDP=y
CONFIG_NET_TCP=y
CONFIG_NET_SOCKETS=y
CONFIG_NET_SHELL=y

# 6LoWPAN for IEEE 802.15.4
CONFIG_NET_L2_IEEE802154=y
# Optional, board-specific radio driver example
CONFIG_IEEE802154_CC1200=y
```

```c
// Zephyr application code - get IPv6 address
#include <zephyr/net/net_if.h>
#include <zephyr/net/net_ip.h>
#include <zephyr/sys/printk.h>

struct net_if *iface = net_if_get_default();
struct net_in6_addr *addr = net_if_ipv6_get_global_addr(NET_ADDR_PREFERRED, &iface);

// Print global IPv6 address
if (addr != NULL) {
    char buf[NET_IPV6_ADDR_LEN];
    net_addr_ntop(NET_AF_INET6, addr, buf, sizeof(buf));
    printk("IPv6: %s\n", buf);
}
```

## Building a CoAP Request on a Constrained Device

```c
// Example using Zephyr's CoAP library on a constrained device
#include <stdio.h>
#include <string.h>
#include <zephyr/net/coap.h>

#define COAP_SERVER_ADDR "2001:db8:1:1::100"
#define COAP_SERVER_PORT 5683

int send_sensor_data(int temperature) {
    // Create a CoAP POST request
    struct coap_packet request;
    uint8_t data[128];

    coap_packet_init(&request, data, sizeof(data),
                     COAP_VERSION_1, COAP_TYPE_CON,
                     0, NULL, COAP_METHOD_POST, coap_next_id());

    coap_packet_set_path(&request, "sensor");

    char payload[32];
    snprintf(payload, sizeof(payload), "{\"temp\":%d}", temperature);
    coap_packet_append_payload_marker(&request);
    coap_packet_append_payload(&request, (const uint8_t *)payload, strlen(payload));

    // Transmit data[0..request.offset) via a UDP socket to
    // COAP_SERVER_ADDR:COAP_SERVER_PORT
    return 0;
}
```

## Address Assignment on Constrained Devices

Constrained devices typically use one of:
1. **EUI-64 from MAC**: Interface identifier derived from the link-layer address; a prefix still comes from SLAAC or manual configuration (but this can create privacy concerns)
2. **SLAAC from RA**: Configured from a router advertisement prefix
3. **DHCPv6**: Full address assignment (heavier stack)
4. **Static**: Hard-coded for fixed-function class 1/2 devices

```c
// In RIOT OS: set a manual IPv6 address for a class 1/2 device
// (in application init code)
#include "net/gnrc/netif.h"
#include "net/gnrc/netif/ipv6.h"
#include "net/ipv6/addr.h"

gnrc_netif_t *netif = gnrc_netif_iter(NULL);
ipv6_addr_t addr;
ipv6_addr_from_str(&addr, "2001:db8:1:1::10");
gnrc_netif_ipv6_addr_add(netif, &addr, 64, GNRC_NETIF_IPV6_ADDRS_FLAGS_STATE_VALID);
```

## Conclusion

Configuring IPv6 on constrained IoT devices is handled by lightweight IPv6 stacks in embedded RTOS environments like RIOT OS, Contiki-NG, and Zephyr. The key configurations include enabling the IPv6 module, selecting 6LoWPAN as the network adaptation layer, and choosing an address assignment strategy appropriate for the device class. Higher-level protocols like CoAP then use IPv6/UDP for efficient, RESTful communication over the constrained network.
