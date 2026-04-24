# Validation Summary: How to Configure PPTP with IPv6 (and Why You Shouldn't)

## Status
validated

## Post Type
Guide

## Technologies Covered
- PPTP
- PPP / IPv6CP
- MS-CHAPv2
- MPPE / RC4
- `pptpd` / `pppd`
- `iptables` / `ip6tables`
- WireGuard
- IKEv2/IPsec
- OpenVPN

## Sources Consulted
- RFC 2637, Point-to-Point Tunneling Protocol (PPTP): https://datatracker.ietf.org/doc/html/rfc2637
- RFC 5072, IP Version 6 over PPP: https://datatracker.ietf.org/doc/html/rfc5072
- RFC 3078, Microsoft Point-To-Point Encryption (MPPE) Protocol: https://www.rfc-editor.org/rfc/rfc3078
- Debian `pppd(8)` man page: https://manpages.debian.org/bookworm/ppp/pppd.8.en.html
- Poptop documentation and sample `pptpd.conf` / `options.pptpd`: https://poptop.sourceforge.net/dox/
- Microsoft Security Advisory 2743314: https://learn.microsoft.com/en-us/security-updates/securityadvisories/2012/2743314
- Microsoft Learn, Configure VPN protocols: https://learn.microsoft.com/en-us/windows-server/remote/remote-access/configure-vpn-protocols
- Microsoft Learn, Credential Guard considerations and known issues: https://learn.microsoft.com/lb-lu/windows/security/identity-protection/credential-guard/considerations-known-issues
- Ubuntu package search for `pptpd`: https://packages.ubuntu.com/pptpd
- Ubuntu package details for `wireguard` in noble: https://packages.ubuntu.com/noble/wireguard
- Debian package details for `pptpd`: https://packages.debian.org/bookworm/amd64/pptpd
- Local Ubuntu 24.04 package metadata checked with `apt-cache` in the workspace

## Issues Found
- The IPv6 section said PPP's `+ipv6` option "assigns IPv6 link-local addresses" and that there was "no standardized IPv6 address assignment." I corrected this to match RFC 5072: `+ipv6` enables IPv6CP, which negotiates interface identifiers used for link-local addressing, while global IPv6 addresses come from normal IPv6 autoconfiguration/routing.
- The security table used imprecise phrasing for MS-CHAPv2, RC4, and MPPE. I replaced it with source-backed wording that reflects the public cryptanalysis and protocol docs: MS-CHAPv2 can be reduced to a single DES key, MPPE is RC4-based, its negotiation is not integrity-protected, and session keys are derived from credentials.
- The comment block cited an unsupported "zero effective security" claim and an unattributed quote. I replaced it with a narrower, source-backed summary of the 2012 ChapCrack/CloudCracker result.
- The "NSA Capability" section made a speculative claim that is not something the primary public documentation can verify. I rewrote it to focus on the publicly documented weaknesses that already justify avoiding PPTP.
- The install command labeled `pptpd` as a Debian/Ubuntu package. I corrected that to Debian-only legacy wording because current Ubuntu package indexes no longer ship the `pptpd` server package in noble, while Debian still does.
- The WireGuard migration snippet assumed a root shell and would commonly fail when writing keys into `/etc/wireguard`. I updated it to use `sudo` and create the keys under a root shell with restrictive permissions.

## Review Notes
- The post is technically relevant and salvageable as a legacy/migration guide, but it describes a deprecated protocol that should not be used for new deployments.
- Current Microsoft guidance explicitly recommends moving away from PPTP/L2TP for security reasons, and beginning with Windows Server 2025, new RRAS setups do not accept PPTP/L2TP connections unless those protocols are re-enabled.
- The firewall snippet is intentionally minimal. It is syntactically valid, but a real deployment would also need full routing/forwarding policy and related network configuration beyond the three example rules shown here.
