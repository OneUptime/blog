# Validation Summary: How to Limit Container Bandwidth Using Docker and tc on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine
- Linux traffic control (`tc`)
- Linux virtual Ethernet (`veth`)
- IFB (`ifb`) devices
- `iproute2`
- `iperf3`
- `curl`

## Sources Consulted
- Docker Engine networking overview: https://docs.docker.com/engine/network/
- Docker `run` documentation: https://docs.docker.com/engine/containers/run/
- Docker resource constraints documentation: https://docs.docker.com/engine/containers/resource_constraints/
- Docker Desktop networking overview: https://docs.docker.com/desktop/features/networking/
- Linux `tc(8)` man page: https://man7.org/linux/man-pages/man8/tc.8.html
- Linux `tc-tbf(8)` man page: https://man7.org/linux/man-pages/man8/tbf.8.html
- Linux `tc-mirred(8)` man page: https://man7.org/linux/man-pages/man8/tc-mirred.8.html
- Linux `veth(4)` man page: https://man7.org/linux/man-pages/man4/veth.4.html
- Linux kernel networking API docs for `iflink`: https://www.kernel.org/doc/html/latest/networking/kapi.html
- Linux kernel ABI docs for `/sys/class/net/<iface>/ifindex` and `/sys/class/net/<iface>/iflink`: https://www.kernel.org/doc/html/next/admin-guide/abi-testing-files.html

## Issues Found
- The post originally reversed the traffic directions. A root qdisc on the host-side `veth` shapes packets leaving that host interface, which is traffic going into the container, not traffic coming out of it. I corrected the outbound section to use IFB redirection and the inbound section to use the root `tbf` qdisc.
- The shell snippets used inline comments after line-continuation backslashes. In POSIX shells, that formatting breaks the command. I removed the inline trailing comments and kept the commands in valid multiline form.
- The IFB example included `flowid 1:1` even though no classful qdisc or class `1:1` was defined. I removed it and aligned the filter with the documented `mirred ... redirect dev ifb0` pattern.
- The `tbf` examples used `burst 32kbit`. `tc` accepts size units, but `tbf` documents `burst` as a buffer size in bytes. I normalized the examples to `32kb` to match the documented parameter semantics more closely.
- The testing commands used reserved example hostnames without saying they were placeholders. I clarified that those endpoints must be replaced with real test hosts.
- The Docker Compose script and removal section were updated so their descriptions match the corrected traffic direction, and the cleanup now removes the IFB qdisc as well.

## Review Notes
- The commands were validated against official documentation and local Linux man pages, but they were not executed end-to-end in this workspace because Docker is not installed in the review environment.
- The examples are Linux-host specific. On Docker Desktop, Linux containers run behind a VM, so the host-side `veth` workflow described here is not directly exposed on the desktop host.
- The IFB redirect example matches IPv4 traffic only because it uses `protocol ip`. Equivalent IPv6 shaping would need a separate IPv6 filter or a classifier that matches both protocol families.
