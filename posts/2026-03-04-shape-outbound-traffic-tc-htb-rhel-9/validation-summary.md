# Validation Summary: How to Shape Outbound Traffic with tc htb on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux traffic control (`tc`)
- HTB (`tc-htb`) classful queueing discipline
- `fq_codel` queueing discipline
- `u32` traffic classification filters
- `tcpdump`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Linux traffic control": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/linux-traffic-control_configuring-and-managing-networking
- Local `tc` utility help from iproute2 6.1.0: `tc qdisc add help`, `tc filter add help`
- Local `tc-htb(8)` man page
- Local `tc-fq_codel(8)` man page
- Local `tc-u32(8)` man page
- Linux man-pages project, `tc-fq_codel(8)`: https://man7.org/linux/man-pages/man8/tc-fq_codel.8.html
- iproute2-provided `tc-htb(8)` manual mirror: https://manpages.ubuntu.com/manpages/jammy/man8/tc-htb.8.html
- iproute2-provided `tc-u32(8)` manual mirror: https://man7.org/linux/man-pages/man8/tc-u32.8.html

## Issues Found
- The post described HTB `burst` as data sent at line rate. Updated the wording to match `tc-htb(8)`: `burst` allows bytes above the configured `rate` at up to `ceil` speed; `cburst` covers the separate interface-speed burst behavior.
- The basic examples said classes could "burst" to their `ceil` values. Updated those comments to say they can borrow up to the configured `ceil`, which is HTB's bandwidth borrowing behavior.
- The basic examples used `burst 15k` for 200 Mbit and 400 Mbit classes, which conflicted with the post's later minimum-burst calculation and can under-deliver at those rates. Updated them to `32k` for 200 Mbit and `64k` for 400 Mbit.
- The leaf qdisc section implied each HTB leaf class must manually receive its own qdisc. Updated it to note that HTB has a default FIFO qdisc and that adding `fq_codel` explicitly is the intended improvement.
- The monitoring section described `overlimits` as "borrowed or waited." Updated it to describe packets hitting configured token limits and waiting, avoiding the implication that normal borrowing itself is counted as an overlimit.

## Review Notes
- The `tc` command forms, HTB class hierarchy examples, `u32` filter selectors, monitoring commands, and `fq_codel` leaf qdisc usage were otherwise consistent with the consulted documentation.
- The examples focus on outbound shaping, which matches Linux traffic control's egress shaping model. Ingress shaping would require a different setup such as redirecting to an IFB device.
