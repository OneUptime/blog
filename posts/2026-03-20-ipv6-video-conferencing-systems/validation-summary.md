# Validation Summary: How to Handle IPv6 in Video Conferencing Systems

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 networking
- WebRTC and ICE
- Jitsi Meet
- Jitsi Videobridge and ice4j
- coturn, TURN, and STUN
- Prosody XMPP
- SIP
- H.323 and GnuGk
- Cisco Webex and RoomOS
- Cisco Meeting Server
- Cisco Expressway
- Zoom
- tcpdump

## Sources Consulted
- Jitsi Meet Self-Hosting Guide - Debian/Ubuntu server: https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-quickstart/
- Jitsi Videobridge network configuration: https://github.com/jitsi/jitsi-videobridge/blob/master/doc/network-configuration.md
- Jitsi Videobridge configuration reference: https://github.com/jitsi/jitsi-videobridge/blob/master/CONFIG.md
- ice4j configuration reference: https://github.com/jitsi/ice4j/blob/master/doc/configuration.md
- coturn example `turnserver.conf`: https://github.com/coturn/coturn/blob/master/examples/etc/turnserver.conf
- Prosody configuration guide: https://prosody.im/doc/configure
- Prosody port and network configuration: https://prosody.im/doc/ports
- RFC 3261: SIP: Session Initiation Protocol: https://www.rfc-editor.org/rfc/rfc3261
- RFC 6156: Traversal Using Relays around NAT (TURN) Extension for IPv6: https://www.rfc-editor.org/rfc/rfc6156
- RFC 8445: Interactive Connectivity Establishment (ICE): https://www.rfc-editor.org/rfc/rfc8445
- Cisco Webex Help Center, IPv6 support for Webex Suite Meetings using DNS64 and NAT64: https://help.webex.com/article/040des/Administration-guide-for-Webex-Suite-Meetings-Platform%3A-IPv6-support-usingcustomer-provided-DNS64-and-NAT64
- Cisco IPv6 Deployment Guide - Applications: https://www.cisco.com/c/en/us/td/docs/voice_ip_comm/uc_system/IPv6/vtgs_b_ipv6-deployment-guide-for-cisco/vtgs_b_ipv6-deployment-guide-for-cisco_chapter_01010.html
- Cisco Expressway Administrator Guide (X15.4): https://www.cisco.com/c/en/us/td/docs/voice_ip_comm/expressway/admin_guide/X15-4/exwy_b_cisco-expressway-administrator-guide-x154.pdf
- Zoom network firewall or proxy server settings: https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0060548
- Zoom meeting and phone statistics: https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0070504
- Zoom Rooms firewall configuration: https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0065712
- GNU Gatekeeper Manual Chapter 3: https://www.gnugk.org/gnugk-manual-3.html
- GNU Gatekeeper Manual Chapter 4: https://www.gnugk.org/gnugk-manual-4.html

## Issues Found
- Replaced invalid example IPv6 literals such as `2001:db8::meet`, `2001:db8::sip-server`, and `2001:db8::gk` with valid documentation-prefix addresses. The original values were not syntactically valid IPv6 addresses.
- Clarified that `sudo apt install jitsi-meet` assumes the official Jitsi package repository has already been added, matching Jitsi's current installation guide.
- Corrected the coturn example so `external-ip` is shown only as an optional public-to-local mapping when the TURN server is behind NAT. The original line used an invalid address and implied `external-ip` should always be set.
- Moved the Prosody IPv6 listener example to the global `/etc/prosody/prosody.cfg.lua` scope and updated the example to `interfaces = { "*", "::" }`. Prosody's network listen settings are global, so the original per-virtualhost example was incorrect.
- Replaced the outdated Jitsi Videobridge section. The post previously used `/etc/jitsi/videobridge/config`, an unrelated `VIDEOBRIDGE_OPTIONS` line, and one non-existent property (`org.ice4j.IPV6_DISABLED`). It now uses the current `jvb.conf` and `ice4j.harvest.use-ipv6` style documented upstream.
- Changed the Jitsi Videobridge section heading from MCU to SFU. Jitsi Videobridge is an SFU, not an MCU.
- Corrected the TURN test command from `turnutils_uclient -6` to `turnutils_uclient -x -u user -w pass -v turn.example.com`. In coturn, `-x` is the documented flag for requesting an IPv6 relay address.
- Rewrote the Webex section to match current Cisco documentation. The original claims about default dual-stack behavior, Happy Eyeballs, and no special configuration were not supported by the official docs reviewed. Current Cisco documentation describes IPv6 support for Webex Suite Meetings via customer-provided DNS64 and NAT64.
- Rewrote the Cisco infrastructure notes to match current Cisco guidance. Cisco Meeting Server conferencing remains in a traditional IPv4 stack while supporting IPv4 and IPv6 endpoints in a cluster, and Cisco Expressway supports IPv4, IPv6, or dual-stack operation with IPv4/IPv6 interworking.
- Rewrote the Zoom section to rely on current Zoom documentation. The original Happy Eyeballs claim, Zoom Rooms guidance, and keyboard shortcut were not supported by the official docs reviewed. The post now points to Zoom's published IPv6 ranges, separate Zoom Rooms firewall guidance, and the official Statistics view.
- Corrected the H.323 section by removing the incorrect "H.245 signaling in IPv6 SDP" line. H.245 is not SDP, so the original example mixed different protocol layers.
- Tightened the introduction so SIP and H.323 are not described as media transport protocols.

## Review Notes
- This post is now technically sound at a high level, but several sections remain vendor-version-sensitive. Future refreshes should re-check current Jitsi, Cisco, and Zoom documentation before republishing major revisions.
- SIP endpoint IPv6 behavior still varies by vendor model and firmware train, so production deployment guidance should always be confirmed against the specific endpoint vendor's latest docs.
