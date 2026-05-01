# Validation Summary: How to Set Up Fair Queuing for IPv4 Traffic with tc fq on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux traffic control (`tc`)
- `fq`
- `fq_codel`
- `cake`
- HTB
- `iperf3`
- `iftop`

## Sources Consulted
- `tc-fq(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-fq.8.html
- `tc-fq_codel(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-fq_codel.8.html
- `tc-cake(8)` Linux manual page: https://man7.org/linux/man-pages/man8/tc-cake.8.html
- Linux kernel `default_qdisc` documentation: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/net.html
- Linux kernel `net/sched/Kconfig` for qdisc/kernel-module names and default-qdisc options: https://kernel.googlesource.com/pub/scm/linux/kernel/git/torvalds/linux.git/+/master/net/sched/Kconfig

## Issues Found
- The multiline `tc` examples used inline comments after trailing `\` characters. In `bash`, that causes later lines like `quantum 3028` or `target 5ms` to run as separate commands instead of remaining part of the `tc` command. I moved the parameter explanations above each command and kept the command lines shell-safe.
- The post hardcoded `pfifo_fast` as the qdisc being replaced and described `fq` without its main usage caveat. I updated the wording to refer to the current root qdisc and clarified that `fq` is primarily for mostly locally generated traffic, matching the upstream `tc-fq(8)` documentation.
- The CAKE section incorrectly implied that `apt install iproute2` was the way to "install CAKE". I replaced that with `modprobe sch_cake` and updated the example options to documented CAKE behavior for a common uplink/NAT-router case (`nat` plus `dual-srchost`), because CAKE requires kernel support and `iproute2` alone is not sufficient.
- The verification section described `iftop` as monitoring per-flow bandwidth. I changed that to generic traffic monitoring because `iftop` is not a precise transport-flow verifier by default.
- The bufferbloat test URL `http://speedtest.net/largefile` was invalid. A direct HTTP check on 2026-05-01 returned `404`, so I replaced it with a working IPv4 test file URL.
- The closing paragraph overstated CAKE as a simple drop-in latency fix. I corrected it to note that `fq_codel` is a direct qdisc swap, while CAKE is typically most effective when configured with a bandwidth limit at the actual bottleneck.

## Review Notes
- On many systems, the effective root qdisc can differ from a plain `pfifo_fast` setup because distributions may override `net.core.default_qdisc`, and multiqueue NICs commonly use `mq` as the root with the selected default qdisc on leaf queues.
- CAKE is shaping-capable and generally needs an accurate `bandwidth` setting on the true bottleneck link to deliver its best latency improvements.
