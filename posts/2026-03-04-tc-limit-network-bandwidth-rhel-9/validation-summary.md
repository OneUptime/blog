# Validation Summary: How to Use tc to Limit Network Bandwidth on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux traffic control (`tc`)
- TBF and HTB queueing disciplines
- `u32` filters
- `iperf3`
- systemd oneshot services

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Linux traffic control": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/linux-traffic-control_configuring-and-managing-networking
- Local `tc(8)` man page from iproute2 6.1.0
- Local `tc-tbf(8)` man page from iproute2 6.1.0
- Local `tc-htb(8)` man page from iproute2 6.1.0
- Local `tc-u32(8)` man page from iproute2 6.1.0
- Local `tc qdisc help`, `tc qdisc add ... tbf help`, `tc qdisc add ... htb help`, `tc class add ... htb help`, and `tc filter add u32 help` output

## Issues Found
- The TBF examples used `kbit` burst sizes that were too small for the documented rates. `burst` is a data size parameter and should be large enough for `rate/HZ`; I changed the examples to use byte-size units such as `128kb`, `64kb`, `16kb`, and `256kb` as appropriate.
- The rsync port filter matched destination port 873 without first matching TCP. The `u32` port selector assumes a suitable layer-four protocol, so I added `match ip protocol 6 0xff` before the destination port match.
- The HTB gotcha claimed that unmatched traffic gets dropped without a default class. HTB's documented default minor ID is 0 and unclassified traffic is not simply dropped for that reason, so I corrected the wording.
- The units gotcha said to use `kbit` for burst sizes. I corrected it to use rate units such as `mbit` for bandwidth and size units such as `kb` for burst sizes.

## Review Notes
The systemd persistence example is technically valid, but Red Hat's RHEL 9 documentation also describes NetworkManager `tc.qdiscs` settings for persistent qdisc configuration. The post intentionally uses a script-based approach, which can still work when the service runs after `network-online.target`.
