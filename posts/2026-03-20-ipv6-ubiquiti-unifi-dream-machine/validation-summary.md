# Validation Summary: How to Configure IPv6 on Ubiquiti UniFi Dream Machine - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ubiquiti UniFi Dream Machine (UDM / UDM Pro)
- UniFi Network application
- IPv6
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- SLAAC
- Router Advertisements (RA)
- IPv6 firewall policies
- SSH
- Linux networking commands (`ip`, `ping`, `curl`)

## Sources Consulted
- Ubiquiti Help Center: Configuring IPv6 in UniFi https://help.ui.com/hc/en-us/articles/36378535649687-Configuring-IPv6-in-UniFi
- Ubiquiti Help Center: UniFi Gateway - Static IPv6 and DHCPv6 Prefix Delegation https://help.ui.com/hc/en-us/articles/115005868927-UniFi-Gateway-Static-IPv6-and-DHCPv6-Prefix-Delegation
- Ubiquiti Help Center: Connecting to UniFi with Debug Tools & SSH https://help.ui.com/hc/en-us/articles/204909374-Connecting-to-UniFi-with-Debug-Tools-SSH
- Ubiquiti Help Center: Zone-Based Firewalls in UniFi https://help.ui.com/hc/en-us/articles/115003173168-Zone-Based-Firewalls-in-UniFi
- Ubiquiti Help Center: Traffic & Policy Management in UniFi https://help.ui.com/hc/en-us/articles/5546542486551-Traffic-Policy-Management-in-UniFi
- IETF RFC 8415: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) https://datatracker.ietf.org/doc/html/rfc8415
- Local CLI help checked for command correctness: `ip address help`, `ip route help`, `ping -6 -h`, `curl --help all`

## Issues Found
- The WAN configuration section used an outdated/inexact UniFi navigation path and included `IPv6 Prefix ID` plus duplicate DHCPv6-PD fields under WAN. I changed this to the current documented WAN path and kept only the documented DHCPv6 connection type and prefix delegation size, because Prefix ID assignment is not a WAN setting in the current docs.
- The post said a `/56` delegation allows `255` unique `/64` networks. I corrected this to `256` unique `/64` networks (`0-255`), because a `/56` leaves 8 subnet bits for `/64` assignments.
- The LAN client assignment section described DHCPv6 as `Stateless` or `Stateful` and implied a specific RA/DNS behavior not reflected in current UniFi documentation. I replaced it with UniFi's documented `Client Address Assignment` guidance: `SLAAC` is recommended, or `DHCPv6` with `Allow SLAAC` enabled for compatibility.
- The SSH verification section said `ssh root@192.168.1.1` uses the `default admin password`, and it relied on undocumented or model-specific internals such as `eth8`, `radvd`, and `dhcpc6@eth8`. I replaced those with the documented SSH enablement path for UniFi Consoles and generic `ip -6` commands that are valid and portable across Linux-based UniFi consoles.
- The firewall section used an outdated `Settings → Firewall → IPv6` path and older rule terminology like `WAN IN`/`WAN OUT`. I updated it to current UniFi 9.x zone/policy navigation and IPv6-specific policy matching (`IP Version: IPv6`), while preserving the original guidance about allowing inbound services explicitly.
- The verification block used `ping6`; I updated it to `ping -6`, which is the current documented form in `iputils`. I also corrected the comment `Test IPv6-only site` to `Test HTTPS over IPv6`, since `curl -6` forces IPv6 but `ipv6.google.com` is not being used here as proof of an IPv6-only service.

## Review Notes
UniFi's IPv6 and firewall UI varies somewhat across controller generations. The post now reflects the current UniFi 9.x documentation, with one caveat: Ubiquiti's current Help Center describes automatic `/64` assignment via Prefix Delegation in detail, but does not document every per-network field label exhaustively, so exact labels such as `Prefix ID` may vary slightly by release.
