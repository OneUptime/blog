# Validation Summary: How to Simulate Packet Corruption on IPv4 with tc netem

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux traffic control (`tc`)
- NetEm qdisc
- PRIO qdisc
- `u32` traffic filters
- IPv4 traffic classification
- TCP retransmission behavior
- Bash shell commands

## Sources Consulted
- iproute2 `tc-netem(8)` manual: https://man7.org/linux/man-pages/man8/tc-netem.8.html
- iproute2 `tc(8)` manual: https://man7.org/linux/man-pages/man8/tc.8.html
- iproute2 `tc-prio(8)` manual: https://man7.org/linux/man-pages/man8/tc-prio.8.html
- iproute2 `tc-u32(8)` manual: https://man7.org/linux/man-pages/man8/tc-u32.8.html
- RFC 9293, Transmission Control Protocol: https://datatracker.ietf.org/doc/html/rfc9293
- GNU Bash Reference Manual, escape character and line continuation behavior: https://www.gnu.org/software/bash/manual/bash.html#Escape-Character
- Local iproute2 help output from `tc qdisc help`, `tc qdisc add dev lo root netem help`, `tc qdisc add dev lo root prio help`, and `tc filter add dev lo protocol ip parent 1:0 prio 1 u32 help` (`iproute2-6.1.0`)

## Issues Found
- The packet corruption explanation said netem flips random bits in the packet payload and implied that receiving checksum validation always causes TCP retransmission. The netem manual describes corruption as modifying packet contents at a random position, and TCP retransmission only applies to TCP data that is lost or rejected. Updated the explanation to cover TCP accurately and to note that UDP and other protocols may see drops or application-level errors.
- The `corrupt 0.1%` explanation said each selected packet has a single bit flipped. Updated it to the documented behavior: selected packets are corrupted at a random position.
- The combined impairment Bash example placed inline comments after line-continuation backslashes. In Bash, the backslash must escape the newline directly; the original example would run only the first fragment and then attempt to execute `loss`, `corrupt`, and `duplicate` as separate commands. Moved the explanatory comments out of the continued command and left the command syntactically valid.
- The removal command comment said it removed all `tc` rules from the interface. `tc qdisc del dev eth0 root` removes the root qdisc, not every possible ingress or `clsact` rule. Updated the comment to say it removes the root qdisc.
- Clarified that the root netem qdisc applies to outbound traffic on the selected interface.

## Review Notes
The `tc qdisc add dev eth0 root ...` examples assume there is no existing root qdisc on `eth0`; if a reader follows the examples sequentially on the same interface, they should use `tc qdisc change` or `tc qdisc replace` after the first add. `netstat` may not be installed on minimal modern systems, but the post also provides `ss`, which is the current iproute2 tool.
