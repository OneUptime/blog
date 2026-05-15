# Validation Summary: How to Implement a Deny-All Firewall Policy on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- firewalld
- firewall-cmd
- firewalld zones, zone targets, rich rules, and policies
- Linux host firewalling

## Sources Consulted
- firewalld.zone(5): https://firewalld.org/documentation/man-pages/firewalld.zone.html
- firewalld predefined zones documentation: https://firewalld.org/documentation/zone/predefined-zones.html
- firewall-cmd(1): https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld.policies(5): https://firewalld.org/documentation/man-pages/firewalld.policies.html
- firewalld.policy(5): https://firewalld.org/documentation/man-pages/firewalld.policy.html
- firewalld.direct(5): https://firewalld.org/documentation/man-pages/firewalld.direct.html

## Issues Found
- The zone target table described `default` as a simple reject target. firewalld documentation states that an unspecified/default zone target accepts ICMP and rejects other unmatched packets. Updated the table and explanatory text to reflect that distinction.
- The public zone explanation said the `default` target rejects all unmatched traffic. Updated it to clarify that ICMP is accepted while other unmatched traffic is rejected.
- The `drop` zone section said the zone drops everything with no exceptions, then showed adding services to it. Updated the wording to say it starts with no allowed incoming services and drops unmatched traffic with no reply.
- The outbound filtering example used firewalld direct rules. The direct interface is deprecated, and the example placed a catch-all DROP at the same priority as later ACCEPT rules, where same-priority direct rule order is not fixed. Replaced the example with a firewalld policy using `HOST` as ingress, `ANY` as egress, a `DROP` target, and explicit allowed outbound services/rules.

## Review Notes
The remaining commands and rich rule examples align with current firewalld CLI and documentation. The examples are operationally sensitive because changing zone targets can lock out remote access; the post already includes appropriate runtime testing and out-of-band access precautions.
