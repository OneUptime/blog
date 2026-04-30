# Validation Summary: How to Configure IPv6 on DD-WRT Routers

## Status
validated

## Post Type
Guide

## Technologies Covered
- DD-WRT
- IPv6
- DHCPv6
- DHCPv6 Prefix Delegation
- radvd
- ip6tables
- NVRAM
- SLAAC

## Sources Consulted
- DD-WRT official Subversion mirror on GitHub: https://github.com/mirror/dd-wrt
- DD-WRT IPv6 UI/menu implementation: https://github.com/mirror/dd-wrt/blob/master/src/router/httpd/visuals/menu.c
- DD-WRT IPv6 option labels and menu page: https://github.com/mirror/dd-wrt/blob/master/src/router/httpd/visuals/ejs.c
- DD-WRT IPv6 page template and NVRAM definitions: https://github.com/mirror/dd-wrt/tree/master/src/router/ipv6
- DD-WRT DHCPv6 and radvd service code: https://github.com/mirror/dd-wrt/tree/master/src/router/services/services
- DD-WRT IPv6 firewall and WAN handling code: https://github.com/mirror/dd-wrt/tree/master/src/router/services/networking/generic
- Official radvd configuration reference: https://github.com/radvd-project/radvd/blob/master/radvd.conf.5.man
- Verified generic command syntax against local `ip`, `ip6tables`, and `ping` help output

## Issues Found
- The introduction pointed to `Administration > Management > IPv6`, but current DD-WRT exposes IPv6 under `Setup > IPv6`. I corrected the menu path to match DD-WRT's UI code and menu definitions.
- The post listed the wrong IPv6 type options and implied separate `DHCPv6` and `Prefix Delegation` toggles. Current DD-WRT exposes `Native IPv6 from ISP`, `DHCPv6 with Prefix Delegation`, and `6in4 Static Tunnel`; I updated the setup steps to reflect the actual UI and to enable `Radvd` for SLAAC.
- The SSH example used the wrong generated `radvd.conf` path (`/tmp/radvd.conf`). DD-WRT writes the managed file to `/tmp/radvd/radvd.conf`, so I corrected the command.
- The custom `radvd` section relied on a startup script that killed `radvd` and launched an unmanaged instance. Current DD-WRT has built-in custom `radvd` support (`radvd_custom` and `radvd_conf`), so I updated the section to use the supported custom-configuration workflow instead.
- The NVRAM example used incorrect keys (`ipv6_proto`, `ipv6_prefix_delegation`, `ipv6_dns`) and an unsupported `service network restart` command. I replaced them with current DD-WRT variables (`ipv6_typ`, `ipv6_pf_len`, `ipv6_dns1`, `ipv6_dns2`, `radvd_enable`) and DD-WRT service-manager commands (`stopservice` and `startservice`).
- The firewall section suggested manually inserting broad IPv6 accept rules that do not match DD-WRT's default IPv6 firewall behavior. DD-WRT already installs essential ICMPv6 and stateful rules when IPv6 is enabled, so I changed the section to inspection plus guidance for adding only explicit custom exceptions.

## Review Notes
- The `radvd` example uses `prefix ::/64`, which is valid in `radvd` and uses interface-based prefix advertisement. For DHCPv6-PD environments where prefixes change, the auto-generated DD-WRT configuration is usually the safer default unless a custom layout is required.
- `tcpdump` may not be present in every DD-WRT image, so the RA capture check in Step 6 depends on build contents.
