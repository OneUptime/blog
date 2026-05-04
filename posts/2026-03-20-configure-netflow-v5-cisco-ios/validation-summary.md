# Validation Summary: How to Configure NetFlow v5 on Cisco IOS Devices

## Status
validated

## Post Type
Tutorial / Step-by-step configuration guide

## Technologies Covered
- NetFlow v5 (Cisco classic NetFlow, not Flexible NetFlow)
- Cisco IOS (classic, not IOS-XE)
- nfdump / nfcapd (Linux NetFlow collector)
- BGP AS attribution in NetFlow records

## Sources Consulted
- Cisco IOS NetFlow Command Reference: https://www.cisco.com/c/en/us/td/docs/ios/netflow/command/reference/nf_book/nf_01.html
- Cisco IOS 12.3T NetFlow Command Reference: https://www.cisco.com/en/US/docs/ios/12_3t/netflow/command/reference/nfl_a1gt_ps5207_TSD_Products_Command_Reference_Chapter.html
- nfcapd(1) Debian manpage: https://manpages.debian.org/testing/nfdump/nfcapd.1.en.html
- nfdump project repository: https://github.com/phaag/nfdump
- RFC 3954 (Cisco Systems NetFlow Services Export Version 9) — for cross-reference of v5 field semantics

## Issues Found
1. **Invalid `show` command in Step 3.** The post originally used `show ip flow-cache timeout`, which is not a valid Cisco IOS command. Cisco IOS exposes the configured timeouts via the running-config or in the header of `show ip cache flow`. Replaced with `show running-config | include flow-cache` and noted that the timeouts also appear in the cache header.

## Review Notes
- The classic NetFlow CLI (`ip flow ingress`, `ip flow-export ...`) is correct for Cisco IOS but is **deprecated on IOS-XE / modern Catalyst platforms**, where Flexible NetFlow (`flow exporter`, `flow monitor`, `flow record`) is required instead. A future revision could note this distinction.
- `ip flow-cache timeout active` is in **minutes** (range 1–60, default 30) and `ip flow-cache timeout inactive` is in **seconds** (range 10–600, default 15). The values used in the post (5 minutes / 60 seconds) are within range and reasonable.
- `origin-as` and `peer-as` in `ip flow-export version 5 …` are mutually exclusive. The post mentions both as alternatives, which is correct, but readers should not try to configure both simultaneously.
- The `nfcapd` command line shown is consistent with the version packaged in current Debian/Ubuntu, where `-w` is a boolean (sync file rotation) and `-l <dir>` provides the output directory. Newer upstream nfdump (1.6.17+) reassigns `-w` to be the output directory itself; users on a non-distro build should consult their installed `nfcapd --help`.
- Sample `show ip cache flow` output is illustrative/simplified; real output also includes packet-size distribution and a sub-flow cache section, but the simplification is reasonable for a tutorial.
- NetFlow v5 cannot carry IPv6 — readers handling dual-stack networks should know to use NetFlow v9 or IPFIX. The post correctly scopes itself to v5 but doesn't call this out.
