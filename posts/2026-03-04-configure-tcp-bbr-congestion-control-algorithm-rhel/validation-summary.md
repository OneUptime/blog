# Validation Summary: How to Configure TCP BBR Congestion Control Algorithm on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux TCP congestion control
- TCP BBR
- CUBIC
- Linux `sysctl`
- Linux traffic control (`tc`, `fq`, `netem`)
- `iperf3`
- `ss`
- systemd `modules-load.d` and `sysctl.d`

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "TCP BBR support in RHEL 8": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/htmlsingle/considerations_in_adopting_rhel_8/networking_considerations-in-adopting-rhel-8
- Red Hat Customer Portal, "How to configure TCP BBR congestion control algorithm?": https://access.redhat.com/solutions/3713681
- Red Hat Customer Portal, "Backport of BBR TCP congestion control to RHEL 7": https://access.redhat.com/solutions/2919591
- Linux `sysctl(8)` manual page
- systemd `sysctl.d(5)` manual page
- systemd `modules-load.d(5)` manual page
- iproute2 `tc(8)` manual page
- iproute2 `tc-fq(8)` manual page
- iproute2 `tc-netem(8)` manual page
- iproute2 `ss(8)` manual page
- Neal Cardwell et al., "BBR: Congestion-Based Congestion Control": https://queue.acm.org/detail.cfm?id=3022184

## Issues Found
- The packet-loss test applied `tc qdisc add dev ens192 root netem loss 1%` on the server while the shown `iperf3 -c server.example.com -t 30` test sends data from client to server. Because Linux qdiscs affect egress traffic, this would primarily affect server egress/ACK traffic rather than the main data direction. Changed the instruction to apply `netem` on a test host/interface in the direction carrying the iperf3 data.
- The `tc qdisc add ... root netem` command can fail when a root qdisc already exists, especially after the earlier `fq` example. Changed it to `tc qdisc replace ... root netem loss 1%`.
- The testing section claimed BBR "stays near full speed" under 1% packet loss. This is too absolute and depends on path, RTT, pacing, bottlenecks, and workload. Softened the wording to say BBR can handle loss better and may maintain higher throughput.
- The final paragraph said BBR is safe for production use and included in "the RHEL kernel" without qualification. Red Hat documents BBR support for RHEL 8, while RHEL 7 does not include BBR. Changed the wording to mention RHEL 8 and later RHEL releases with kernels that include `tcp_bbr`, and to recommend workload validation before broad production rollout.

## Review Notes
- Red Hat specifically recommends `fq`, not `fq_codel`, for TCP BBR on involved interfaces.
- The commands assume the administrator substitutes the correct network interface name for `ens192`.
- `tc qdisc replace dev ens192 root fq` restores the example interface to `fq` after the `netem` test, matching the earlier BBR queueing-discipline recommendation.
