# Validation Summary: How to Prioritize VoIP IPv4 Traffic Using QoS Rules

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux Traffic Control (`tc`)
- `iptables` packet marking and DSCP tagging
- HTB queuing, `pfifo`, and `fq_codel`
- DiffServ / DSCP for VoIP traffic
- OpenWrt SQM

## Sources Consulted
- `iptables-extensions(8)` man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `tc-htb(8)` man page: https://www.man7.org/linux/man-pages/man8/HTB.8.html
- `tc-fw(8)` man page: https://man7.org/linux/man-pages/man8/tc-fw.8.html
- `tc-u32(8)` man page: https://www.man7.org/linux/man-pages/man8/tc-u32.8.html
- RFC 3246, Expedited Forwarding PHB: https://www.rfc-editor.org/rfc/rfc3246
- RFC 4594, DiffServ service classes and DSCP recommendations: https://www.rfc-editor.org/rfc/inline-errata/rfc4594.html
- Microsoft Teams QoS guidance: https://learn.microsoft.com/en-us/microsoftteams/qos-in-teams
- Microsoft Teams call flows and required media ports: https://learn.microsoft.com/en-us/microsoftteams/microsoft-teams-online-call-flows
- Zoom network firewall or proxy server settings: https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0060548
- OpenWrt SQM guide: https://openwrt.org/docs/guide-user/network/traffic-shaping/sqm
- OpenWrt `luci-app-sqm` package page: https://openwrt.org/packages/pkgdata/luci-app-sqm

## Issues Found
- The post described the HTB configuration as "strict priority" even though HTB's `prio` setting controls which classes are tried first within HTB, not a separate strict-priority qdisc. I changed the wording to "higher priority" to match the `tc-htb(8)` documentation.
- The HTB examples hard-coded `burst` values that were too small for the configured rates on some systems. I removed the manual `burst` settings so `tc` can compute appropriate defaults instead of leaving rate-shaping parameters that may underperform or misbehave.
- The post marked both SIP signaling and RTP/SRTP media as DSCP EF. I corrected this so SIP signaling is marked `CS5` and RTP/SRTP media stays `EF`, which matches RFC 4594 service-class guidance and current Teams QoS guidance.
- The platform port examples were misleading. I updated the Zoom and Teams examples to reflect vendor documentation and clarified that RTP/SRTP media port ranges vary by application.
- The original wording implied generic VoIP prioritization, but the rules only mark locally generated `OUTPUT` traffic and the `tc` qdisc shapes egress. I updated the description and explanatory text to make that scope explicit.
- The verification example used a bulk download even though the shown `tc` configuration only shapes outbound traffic. I changed it to a bulk upload example from the same host so the test matches the configuration.
- The final router section was labeled `OpenWrt/dd-wrt`, but the commands and LuCI path were OpenWrt-specific. I corrected that section heading to `OpenWrt`.

## Review Notes
- The `iptables` commands are syntactically valid with current `iptables` 1.8.x; on many modern Linux distributions they run through the nftables compatibility backend, but the command syntax used here remains supported.
- This example still covers host-generated outbound traffic only. Prioritizing forwarded router traffic or shaping downloads requires additional configuration such as `FORWARD`-chain classification plus ingress shaping/IFB, or using OpenWrt SQM on the WAN interface.
- The `iperf3` verification example assumes access to an `iperf3` server.
- OpenWrt's current SQM guidance favors CAKE or `fq_codel`; the short OpenWrt section in the post is acceptable as a high-level pointer rather than a full SQM tuning guide.
