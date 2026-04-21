# Validation Summary: How to Configure Stable Privacy Addresses (RFC 7217) on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 SLAAC
- RFC 7217 stable privacy addresses
- NetworkManager and nmcli
- Linux IPv6 kernel sysctls
- iproute2 `ip link`

## Sources Consulted
- RFC 7217: A Method for Generating Semantically Opaque Interface Identifiers with IPv6 Stateless Address Autoconfiguration (SLAAC): https://datatracker.ietf.org/doc/html/rfc7217
- NetworkManager `ipv6.addr-gen-mode` settings reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager daemon and secret key reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.html
- NetworkManager configuration file reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- Linux kernel IPv6 `stable_secret` and `addr_gen_mode` sysctl documentation: https://docs.kernel.org/6.8/networking/ip-sysctl.html
- Local `nmcli(1)`, `NetworkManager(8)`, `NetworkManager.conf(5)`, `nm-settings-nmcli(5)`, and `ip-link(8)` man pages

## Issues Found
- The RFC 7217 algorithm was described as a one-way SHA-256 hash over the prefix, interface name, MAC address, and a boot-generated secret. Updated it to describe the RFC's pseudorandom function inputs more accurately: prefix, stable interface identifier, optional network ID, DAD counter, and a secret generated once and kept stable. Also changed the diagram to avoid implying that SHA-256 or the MAC address is mandatory.
- The post stated that cross-network IID tracking is "not possible." Changed this to "much harder" because RFC 7217 mitigates fixed-IID tracking but does not make all host tracking impossible.
- The NetworkManager `nmcli connection modify eth0` example treated `eth0` as an interface name, but `nmcli connection modify` operates on a connection profile. Updated the example to resolve the active profile from `eth0` with `nmcli -g GENERAL.CONNECTION device show eth0`, then modify and reactivate that profile.
- The NetworkManager config-file section described `[connection] ipv6.addr-gen-mode=stable-privacy` as enforcing the setting for all connections. Updated it to describe this as a system-wide default for profiles that use NetworkManager defaults, matching the NetworkManager configuration semantics.
- The secret-key section implied the NetworkManager secret key is the entire address-generation input. Updated it to say the host-specific secret participates in address generation, which matches NetworkManager's use of the secret key together with profile and interface data.
- The manual kernel configuration example set only `addr_gen_mode=2`. Linux requires a persistent `stable_secret` for mode `2`; otherwise mode `3` is the option that generates a random secret if unset. Updated the examples to generate a 128-bit secret, set `stable_secret`, use `ip link set ... addrgenmode stable_secret`, and persist the secret in `/etc/sysctl.d/99-ipv6-privacy.conf`.
- The conclusion described devices as "untraceable" across networks. Changed it to "reduce IID-based tracking" to avoid overclaiming the privacy guarantee.

## Review Notes
NetworkManager's stable privacy addressing is distinct from RFC 4941 temporary privacy addresses; the post already avoids conflating those mechanisms. Active NetworkManager profiles generally need reconnection or reapplication after changing address-generation settings so addresses are regenerated.
