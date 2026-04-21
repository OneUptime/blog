# Validation Summary: How to Configure Stochastic Fairness Queueing (SFQ) for IPv4 on Linux

## Status
validated

## Post Type
Tutorial / Linux traffic control guide

## Technologies Covered
- Linux traffic control (`tc`)
- iproute2
- Stochastic Fairness Queueing (SFQ)
- Hierarchy Token Bucket (HTB)
- `u32` traffic filters
- IPv4 QoS and flow classification

## Sources Consulted
- iproute2 `tc-sfq(8)` manual page: https://man7.org/linux/man-pages/man8/tc-sfq.8.html
- iproute2 `tc-htb(8)` manual page: https://man7.org/linux/man-pages/man8/tc-htb.8.html
- iproute2 `tc-u32(8)` manual page: https://man7.org/linux/man-pages/man8/tc-u32.8.html
- iproute2 `tc(8)` manual page: https://man7.org/linux/man-pages/man8/tc.8.html
- Local `tc` parser/help output from iproute2 6.1.0 (`tc -V`, `tc qdisc ... sfq help`, `tc qdisc ... htb help`, and `tc filter ... u32 help`)

## Issues Found
- The SFQ flow-classification explanation described SFQ as always hashing the IPv4 5-tuple. The `tc-sfq(8)` manual describes an internal classifier based on source/destination addresses and source/destination ports when available, or an external classifier if configured. Updated the wording to avoid overstating the 5-tuple behavior.
- The HTB rate-limiter example used `default 1` but only created class `1:10`, so unclassified traffic would not be directed to the intended class. Changed the HTB default to `10`.
- The HTB class examples attached classes to parent `1:1` without creating class `1:1`. Changed direct HTB child classes to use parent `1:`, which matches the documented HTB class syntax for classes attached directly to the qdisc.
- The traffic-prioritization example called the classes high, normal, and low priority but did not set HTB priorities. Added `prio 0`, `prio 1`, and `prio 2` to align the commands with the described priority intent.
- The SSH `u32` filter matched destination port 22 without explicitly matching TCP. Added `match ip protocol 6 0xff` so the rule specifically targets IPv4 TCP SSH traffic.

## Review Notes
The local host does not permit creating an isolated unprivileged network namespace, so the commands were not applied to a live qdisc. Syntax was checked with local `tc` help/parser output; the corrected commands reached the expected kernel permission boundary as an unprivileged user rather than failing on syntax. Current `tc-sfq(8)` documentation advises not setting `perturb` too low and lists 60 seconds as an advised value, while the post's `perturb 10` examples remain syntactically valid and historically common.
