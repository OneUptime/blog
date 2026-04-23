# Validation Summary: How to Reduce IPv4 Packet Loss with Queue Discipline (qdisc) Tuning

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux traffic control (`tc`)
- Linux queue disciplines (`qdisc`)
- `fq_codel`
- `cake`
- `fq`
- `pfifo_fast`
- `ip link`
- Linux sysctl networking settings
- BBR congestion control

## Sources Consulted
- Linux kernel sysctl networking documentation: https://www.kernel.org/doc/html/latest/admin-guide/sysctl/net.html
- `tc(8)` man page: https://man7.org/linux/man-pages/man8/tc.8.html
- `tc-fq_codel(8)` man page: https://man7.org/linux/man-pages/man8/tc-fq_codel.8.html
- `tc-cake(8)` man page: https://man7.org/linux/man-pages/man8/tc-cake.8.html
- `tc-fq(8)` man page: https://man7.org/linux/man-pages/man8/tc-fq.8.html
- `tc-pfifo_fast(8)` man page: https://www.man7.org/linux/man-pages/man8/tc-pfifo_fast.8.html
- `ip-link(8)` man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux kernel mainline `tcp_bbr.c` source note on `fq` and pacing fallback: https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/tree/net/ipv4/tcp_bbr.c

## Issues Found
- The post stated `pfifo_fast` as the default qdisc for every interface and showed `lo` using `pfifo_fast`. I corrected this to reflect current kernel documentation: the kernel default for new devices is `pfifo_fast`, but distros can override it, multiqueue NICs commonly use `mq` as the root qdisc, and virtual devices such as `lo` typically use `noqueue`.
- The Step 1 sample output was too specific and could be wrong on many systems. I replaced it with a note that real output varies and may include `fq_codel`, `pfifo_fast`, `mq`, or `noqueue`.
- The CAKE example used invalid shell line continuations by placing comments after backslashes. I rewrote the multiline command so it is valid `bash`, and corrected the `nat` explanation to match CAKE documentation: it improves fairness for hosts behind NAT rather than helping RTT estimation.
- The CAKE module-loading example used `modprobe` without `sudo`. I changed it to `sudo modprobe sch_cake`, which matches the privileges normally required.
- The `txqueuelen` persistence example redirected into `/etc/udev/rules.d/...` without elevated shell redirection. I changed it to `sudo tee` so it works as written.
- The BBR section said `fq` is required. I updated that to current-kernel-accurate wording: `fq` is commonly paired with BBR because it provides efficient pacing, but current kernels can fall back to internal pacing instead of making `fq` an unconditional requirement.
- The manual `fq` example used undocumented tuning values (`maxrate 0 quantum 1500`) without justification. I simplified it to `sudo tc qdisc replace dev eth0 root fq`, which is directly aligned with the documented defaults.
- The sysctl persistence example appended to `/etc/sysctl.d/99-qdisc.conf` without privileged redirection. I changed it to `sudo tee`, and I updated the load command to `sysctl --load`.
- The loop that applied `fq_codel` to existing interfaces parsed interface names unsafely and omitted `sudo`. I updated it to use `ip -o link show`, strip `@...` suffixes, avoid over-broad `grep -v lo`, quote the interface variable, and run `tc` with `sudo`.
- The queue-length section implied this was a simple fix without trade-offs. I added the necessary latency caveat because increasing `txqueuelen` can reduce drops at the cost of more queueing delay and bufferbloat risk.

## Review Notes
- The post is now technically sound for a contemporary Linux/iproute2 audience, but qdisc defaults still vary by kernel, distro, and interface type. Readers should expect `tc qdisc show` output to differ across environments.
- The `fq` plus BBR guidance is version-sensitive. Older BBR guidance treated `fq` as mandatory; current kernel source documents a fallback to internal pacing, though `fq` remains a sensible pairing.
