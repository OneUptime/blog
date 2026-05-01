# Validation Summary: How to Fix 'Network Cable Unplugged' Errors Caused by Duplex Mismatch

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ethernet
- Linux `ethtool`
- Linux `iproute2` / `ip link`
- Linux `/proc/net/dev`
- Cisco IOS

## Sources Consulted
- Linux Kernel documentation, ethtool netlink interface: https://docs.kernel.org/5.15/networking/ethtool-netlink.html
- Linux Kernel documentation, interface statistics: https://docs.kernel.org/networking/statistics.html
- ethtool project page on kernel.org: https://www.kernel.org/pub/software/network/ethtool/
- Cisco, Configure and Verify Ethernet 10/100/1000Mb Half/Full Duplex Auto-Negotiation: https://www.cisco.com/c/en/us/support/docs/lan-switching/ethernet/10561-3.html
- Cisco, Troubleshoot Switch Port and Interface Problems: https://www.cisco.com/c/en/us/support/docs/switches/catalyst-6500-series-switches/12027-53.html
- Cisco ASR 901 Series Configuration Guide, Configuring Gigabit Ethernet Interfaces: https://www.cisco.com/c/en/us/td/docs/wireless/asr_901/Configuration/Guide/b_asr901-scg/b_asr901-scg_chapter_01010.html
- Local CLI help output from `ethtool --help` on `ethtool` 6.7
- Local CLI help output from `ip` for `ip link show`

## Issues Found
- The original title, description, and symptom list treated duplex mismatch as a "`network cable unplugged`" or link-down problem. Cisco documentation describes duplex mismatch as a link-up performance/error condition, with bad cabling handled as a separate fault class. I changed the title, description, opening explanation, and symptom list to remove the incorrect link-down framing.
- The `ethtool` sample output showed `Duplex: Half` together with `Auto-negotiation: off` for the classic forced/full-versus-auto mismatch scenario. In the common 10/100 mismatch case, the auto-negotiating side remains `Auto-negotiation: on` and falls back to half-duplex. I corrected the example output.
- The `ip -s link show eth0` section implied that aggregate TX/RX error patterns alone identify duplex mismatch. Kernel statistics documentation does not make that guarantee, and `ethtool -S` statistics are driver-defined. I changed the guidance so `ip -s link` is treated as supporting evidence alongside `ethtool` and switch counters.
- The best-practice section recommended forcing `1000/full` with `autoneg off`. Cisco documentation states that 1000M full-duplex Gigabit Ethernet requires auto-negotiation and otherwise behavior is unpredictable. I changed the forced example to 10/100 hard-set guidance and added the 1000BASE-T caveat.
- I normalized the Cisco verification example to the canonical `show interfaces` form and removed slash shorthand from the summary block so the IOS examples are not ambiguous.

## Review Notes
- The udev rule syntax is valid, but persistence methods vary by distribution and by network manager. The hard-coded `ethtool` path may need adjustment on some systems.
- `ethtool -S` counter availability and names vary by NIC driver, so collision-related evidence is hardware-dependent.
