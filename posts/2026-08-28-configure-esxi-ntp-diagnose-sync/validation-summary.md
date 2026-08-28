# Validation Summary: How to Configure ESXi NTP and Diagnose Hosts That Refuse to Synchronize

## Status
validated

## Post Type
Technical configuration and troubleshooting guide

## Technologies Covered
- VMware ESXi 7.0 Update 3 and ESXi 8.x
- VMware vSphere Client, Host Profiles, and vSphere Configuration Profiles
- ESXi ConfigStore and ESXCLI
- NTPv3, NTPv4, `ntpd`, and `ntpq`
- ESXi `ntpClient` firewall ruleset
- VMkernel networking, routing, DNS, VLANs, and UDP port 123
- `vmkping`, `pktcap-uw`, and ESXi system logs
- Precision Time Protocol (PTP), Active Directory time integration, and hardware clock drift

## Sources Consulted
- [Broadcom KB 312204: Troubleshooting NTP on ESX and the ESXi 7.x / 8.x](https://knowledge.broadcom.com/external/article/312204)
- [Broadcom KB 313808: NTP and PTP configuration uses ConfigStore on ESXi 7.0 U3 and later](https://knowledge.broadcom.com/external/article/313808)
- [Broadcom KB 317537: Configure Network Time Protocol (NTP) on the ESXi](https://knowledge.broadcom.com/external/article/317537)
- [Broadcom KB 313810: Loading advanced NTP configuration on ESXi 7.0 U3 and later](https://knowledge.broadcom.com/external/article/313810)
- [Broadcom KB 313168: Configuring authenticated NTP using symmetric keys on ESXi](https://knowledge.broadcom.com/external/article?legacyId=95584)
- [Broadcom ESXCLI command reference: `esxcli system`](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_system.html)
- [Broadcom ESXCLI command reference: `esxcli network`](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html)
- [Broadcom KB 443386: Empty `ntpClient` allowed-IP list prevents synchronization](https://knowledge.broadcom.com/external/article/443386/warning-configuration-is-not-working-no.html)
- [Broadcom KB 384384: System-owned ESXi 8 firewall rulesets](https://knowledge.broadcom.com/external/article/384384)
- [Broadcom KB 430864: ESXi retains an old NTP address after an A-record change](https://knowledge.broadcom.com/external/article/430864/esxi-is-unable-to-synchronize-time-after.html)
- [Broadcom KB 423200: `nslookup` output can differ from host name resolution](https://knowledge.broadcom.com/external/article/423200/verify-if-the-output-of-nslookup-command.html)
- [Broadcom KB 429931: NTP failure caused by a management VLAN mismatch](https://knowledge.broadcom.com/external/article/429931/esxi-host-fails-to-synchronize-with-ntp.html)
- [Broadcom KB 411423: NTP failure caused by local clock drift on an HPE host](https://knowledge.broadcom.com/external/article/411423/esxi-fails-to-sync-time-with-ntp-server.html)
- [Broadcom KB 441692: ESXi time drift while joined to Active Directory](https://knowledge.broadcom.com/external/article/441692/esxi-host-time-drifts-or-fails-ntp-synch.html)
- [RFC 5905: Network Time Protocol Version 4](https://www.rfc-editor.org/rfc/rfc5905)
- [RFC 8633: Network Time Protocol Best Current Practices](https://www.rfc-editor.org/rfc/rfc8633)
- [NTP.org: `ntpq` query program documentation](https://www.ntp.org/documentation/4.2.8-series/ntpq/)

## Issues Found
- The audit and rollback guidance preserved only the server list reported by `esxcli system ntp get`. That summary can omit global directives or other custom configuration, so a server-only rollback could lose required settings. The post now audits the complete configuration with `esxcli system ntp config get` and uses the documented `esxcli system ntp set -f` path when full configuration must be preserved or restored.
- The log guidance treated **Clock Unsynchronized** as an unqualified troubleshooting signal. Broadcom documents that this message is normal immediately after `ntpd` starts. The post now distinguishes that expected startup state from a persistent unsynchronized state after the convergence window.
- The reachability guidance could be read as saying that reach 0 proves a peer has never exchanged valid packets. Because reach is only an eight-poll history, it can return to 0 after a previously healthy peer misses eight polls. The post now distinguishes the combined initial state from reach 0 by itself.
- The DNS diagnostic described `nslookup` as a generic name-resolution check. Because `nslookup` queries DNS and can differ from the resolver result used by the host, the post now labels it as a DNS check and retains `ntpq -pn` as the evidence of the address actually chosen by `ntpd`.
- The rollback guidance stated that disabling NTP leaves the host free-running. That is only true when no other time service is active; PTP or an Active Directory/Likewise time source can still provide or alter kernel time. The post now makes that condition explicit and directs the reader to verify the active provider.

## Review Notes
- The two-server ESXCLI example is valid and matches Broadcom's documented syntax. For deployments where maintaining accurate time is critical, RFC 8633 Section 3.2 recommends at least four independent, diverse sources; two sources provide less fault isolation when they disagree.
- ESXCLI options and firewall ownership remain build-sensitive. The post correctly tells readers to inspect local `--help` output and the ruleset configurability columns.
- ESXi command-line and log timestamps use UTC, while management interfaces and adjacent systems can display another time zone. Operators should normalize time zones when making the post's cross-system comparisons.
