# Validation Summary: How to Set Up Flow-Based Monitoring on a MikroTik Router

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MikroTik RouterOS Traffic Flow
- NetFlow (v5, v9) and IPFIX
- nfdump / nfcapd
- ntopng
- nProbe (added during fix)
- WinBox (RouterOS GUI)

## Sources Consulted
- MikroTik Traffic Flow documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/21102653/Traffic+Flow
- nfcapd man page (nfdump 1.6.x, Debian): https://manpages.debian.org/bullseye/nfdump/nfcapd.1.en.html
- nfdump man page: https://manpages.debian.org/bullseye/nfdump/nfdump.1.en.html
- ntop blog on NetFlow architecture: https://www.ntop.org/why-nprobejsonzmq-instead-of-native-sflownetflow-support-in-ntopng/
- ntopng + nProbe integration guide: https://www.ntop.org/guides/ntopng/using_with_other_tools/nprobe.html

## Issues Found

1. **Incorrect ntopng NetFlow configuration (fixed).** The original "Using ntopng as the Collector" section instructed readers to install ntopng alone and use `-i=netflow:2055` to receive NetFlow directly. This syntax does not exist in modern ntopng (4.x/5.x/6.x). ntopng explicitly does not natively collect NetFlow — flows must be received by **nProbe** and forwarded to ntopng over **ZMQ**. The section was rewritten to install both `nprobe` and `ntopng`, run nProbe as a NetFlow collector on UDP 2055 with a ZMQ publisher endpoint, and configure ntopng with `-i=tcp://127.0.0.1:5556` to subscribe to that endpoint. A short clarifying sentence was added explaining the architecture.

## Review Notes

- **MikroTik CLI commands** (`/ip traffic-flow ...`) are syntactically correct for current RouterOS, including `cache-entries=64k`, `active-flow-timeout=1m`, `inactive-flow-timeout=15s`, comma-separated interface lists, and `version=9` on the target.
- **NetFlow versions claim:** RouterOS technically supports versions 1, 5, 9, and IPFIX. The post lists v5/v9/IPFIX. Version 1 is legacy and effectively unused in practice, so the omission is not a correctness issue.
- **nfcapd command** (`nfcapd -w -D -l /var/cache/nfcapd -p 2055 -b 10.0.0.50`) is correct for nfdump 1.6.x as shipped in Ubuntu 22.04 / Debian 11 (`-w` is a no-arg sync flag, `-l` is the basedir). On nfdump 1.7+, `-w` was redefined to take a directory argument, so users on newer distros may need `-w /var/cache/nfcapd` and to drop `-l`. A version note could be added in a future revision but is not strictly required.
- **nfdump command** (`nfdump -R /var/cache/nfcapd -s record/bytes -n 20`) is correct; `record` is a valid stat type in nfdump.
- **nProbe licensing caveat:** nProbe is a commercial ntop product with a free demo mode but production use generally requires a license. Readers deploying this in production should be aware. Free alternatives that bridge NetFlow → ntopng exist (e.g., `netflow2ng`) but are out of scope for this post.
