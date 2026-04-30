# Validation Summary: How to Configure IPv6 Firewall Policies on Fortinet FortiGate

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fortinet FortiGate / FortiOS
- IPv6
- FortiOS firewall policies
- ICMPv6
- FortiOS CLI diagnostics

## Sources Consulted
- FortiGate / FortiOS 7.6.3 Administration Guide, IPv6 quick start: https://docs.fortinet.com/document/fortigate/7.6.3/administration-guide/87102/ipv6-quick-start
- FortiGate / FortiOS 7.6.6 CLI Reference, `config system interface`: https://docs.fortinet.com/document/fortigate/7.6.6/cli-reference/317104469/config-system-interface
- FortiGate / FortiOS 7.6.4 CLI Reference, `config firewall address6`: https://docs.fortinet.com/document/fortigate/7.6.4/cli-reference/137851815/config-firewall-address6
- FortiGate / FortiOS 7.6.6 CLI Reference, `config firewall policy`: https://docs.fortinet.com/document/fortigate/7.6.6/cli-reference/333889629/config-firewall-policy
- FortiGate / FortiOS 7.6.6 CLI Reference, `config firewall service custom`: https://docs.fortinet.com/document/fortigate/7.6.6/cli-reference/198499981/config-firewall-service-custom
- FortiGate / FortiOS 7.6.6 CLI Reference, `diagnose sys`: https://docs.fortinet.com/document/fortigate/7.6.6/cli-reference/235530229/diagnose-sys
- FortiGate / FortiOS 7.6.1 Administration Guide, Debugging the packet flow: https://docs.fortinet.com/document/fortigate/7.6.1/administration-guide/54688/debugging-the-packet-flow
- FortiGate / FortiOS 7.6.3 Administration Guide, Seven-day rolling counter for policy hit counters: https://docs.fortinet.com/document/fortigate/7.6.3/administration-guide/290923/seven-day-rolling-counter-for-policy-hit-counters
- RFC 4443, Internet Control Message Protocol (ICMPv6) for IPv6: https://www.rfc-editor.org/rfc/rfc4443.html
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html

## Issues Found
- The interface example used invalid and outdated CLI syntax (`set ip6` and `ipv6-allow-any-host`). I changed it to the current FortiOS `config ipv6` block with `set ip6-address`, `set ip6-allowaccess`, and valid example values.
- Several IPv6 literals were not syntactically valid examples, including addresses with words embedded in hextets such as `2001:db8:wan::1`, `2001:db8:lan::/48`, `fd00:mgmt::/48`, `2001:db8:lan::web/128`, `2001:db8:ext::1`, and `2001:db8:server::1`. I replaced them with valid documentation-prefix IPv6 addresses.
- The post used older separate-IPv6-policy syntax (`config firewall policy6`, `srcaddr`, `dstaddr`, and a GUI path ending in `IPv6 Policy`). Current FortiOS documentation uses `config firewall policy` with `srcaddr6` and `dstaddr6` in the main Firewall Policy workflow, so I updated the GUI and CLI examples accordingly.
- The SSH example policy was too broad and semantically confusing (`dstaddr "ALL_IPv6"` for a management rule). I narrowed it to a specific destination host so the rule reflects a realistic administrative-access policy.
- The verification section incorrectly implied that `show firewall policy6 100` displays hit counters. I replaced that with `diagnose firewall iprope6 show 100004 100`, which is the documented CLI method for IPv6 firewall policy counters, and I added the required `diagnose debug flow trace start` step for packet-flow debugging.
- Two policy examples were incomplete because they were missing required policy fields. I added `schedule "always"` where needed and added `service "ALL"` to the bogon-filtering rule.

## Review Notes
- Current FortiOS 7.6 documentation consolidates IPv4 and IPv6 firewall policy configuration under `config firewall policy`; older FortiOS 6.x material still shows `config firewall policy6`.
- The `2001:db8::/32` documentation prefix is appropriate for examples, but the bogon list shown is illustrative rather than exhaustive for production edge filtering.
