# Validation Summary: How to Configure IPv6 for Constrained IoT Devices

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- 6LoWPAN
- Constrained-node device classes
- Contiki-NG
- RIOT OS GNRC
- Zephyr RTOS
- CoAP
- RPL

## Sources Consulted
- RFC 7228: Terminology for Constrained-Node Networks - https://www.rfc-editor.org/rfc/rfc7228.html
- RFC 4291: IP Version 6 Addressing Architecture - https://www.rfc-editor.org/rfc/rfc4291
- RFC 4862: IPv6 Stateless Address Autoconfiguration - https://www.rfc-editor.org/rfc/rfc4862
- Contiki-NG configuration system - https://docs.contiki-ng.org/en/master/doc/getting-started/The-Contiki-NG-configuration-system.html
- Contiki-NG `contiki-default-conf.h` reference - https://docs.contiki-ng.org/en/master/_api/contiki-default-conf_8h_source.html
- Contiki-NG RAM and ROM usage guide - https://docs.contiki-ng.org/en/master/doc/tutorials/RAM-and-ROM-usage.html
- RIOT GNRC overview - https://doc.riot-os.org/group__net__gnrc.html
- RIOT GNRC network interface API - https://api.riot-os.org/group__net__gnrc__netif.html
- RIOT netopt reference - https://api.riot-os.org/group__net__netopt.html
- RIOT IPv6 address API - https://api.riot-os.org/group__net__ipv6__addr.html
- Zephyr network interface API - https://docs.zephyrproject.org/latest/connectivity/networking/api/net_if.html
- Zephyr CoAP library API - https://docs.zephyrproject.org/apidoc/latest/group__coap.html
- Zephyr networking API overview - https://docs.zephyrproject.org/latest/connectivity/networking/api/index.html
- Zephyr IEEE 802.15.4 documentation - https://docs.zephyrproject.org/latest/services/connectivity/networking/api/ieee802154.html

## Issues Found
- The RFC 7228 device-class descriptions were overstated. I corrected the class summaries to match the RFC more closely, especially for Class 0 and Class 2 capabilities.
- The Contiki-NG section used outdated or misleading configuration guidance by implying `project-conf.h` directly enables IPv6 and RPL. I changed it to the current Contiki-NG model: `MAKE_NET = MAKE_NET_IPV6` and `MAKE_ROUTING` are selected in the Makefile, while `project-conf.h` tunes memory-related parameters such as `UIP_CONF_BUFFER_SIZE`, `NBR_TABLE_CONF_MAX_NEIGHBORS`, and `NETSTACK_MAX_ROUTE_ENTRIES`.
- The Contiki-NG snippet used `UIP_CONF_MAX_ROUTES`, while current Contiki-NG documentation exposes `NETSTACK_MAX_ROUTE_ENTRIES` as the primary route-table tuning knob. I replaced it accordingly.
- The RIOT section mixed Makefile syntax and C syntax in a single invalid code block. I split it into a real Makefile snippet and a C snippet.
- The RIOT Makefile example omitted `netdev_default`, which the official GNRC documentation includes when using default network devices. I added it.
- The RIOT example used `gnrc_netapi_get(... NETOPT_IPV6_ADDR ...)` directly for interface addresses. The current RIOT network interface API provides `gnrc_netif_ipv6_addrs_get()` for this purpose, so I updated the code to use the documented wrapper.
- The Zephyr code used old include paths such as `<net/net_if.h>` and `<net/coap.h>`. I updated them to current `<zephyr/...>` include paths from the official API documentation.
- The Zephyr IPv6-address example walked interface internals directly. I replaced it with the documented helper `net_if_ipv6_get_global_addr()` and used `net_addr_ntop()` with the current API.
- The Zephyr config example enabled `CONFIG_NET_L2_IEEE802154_SECURITY=y` without noting that the official Kconfig marks it as experimental and incomplete. I removed it from the generic example.
- The CoAP section claimed to use libcoap, but the API shown is Zephyr’s own CoAP library. I corrected the description.
- The CoAP snippet passed string pointers to functions expecting `const uint8_t *` and used the manual Uri-Path option form unnecessarily. I updated it to `coap_packet_set_path()` and cast the payload correctly for `coap_packet_append_payload()`.
- The address-assignment section incorrectly said EUI-64-derived addressing needs no SLAAC. I corrected it to explain that the interface identifier may come from the link-layer address, but the prefix still comes from SLAAC or manual configuration.
- The static-address example incorrectly referred to Class 0 devices and used an invalid IPv6 literal (`::sensor1`). I corrected the device-class note and replaced the address with a valid IPv6 example.

## Review Notes
- The Zephyr `CONFIG_IEEE802154_CC1200=y` line is technically valid but board-specific; it is not a generic requirement for IPv6 itself.
- The CoAP example still only builds the request packet and leaves UDP socket transmission as a comment, so it should be read as a request-construction example rather than a complete client implementation.
