# Validation Summary: How to use tc (traffic control) for network QoS in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods and CNI networking
- Linux traffic control (`tc`)
- iproute2 qdiscs, classes, and filters
- HTB, TBF, PRIO, SFQ, mqprio, and netem qdiscs
- CNI bandwidth plugin
- Kubernetes pod bandwidth annotations
- Go socket options for DSCP marking
- Prometheus node-exporter textfile collector pattern

## Sources Consulted
- Linux `tc(8)` manual page: https://man7.org/linux/man-pages/man8/tc.8.html
- Linux `tc-tbf(8)` manual page: https://man7.org/linux/man-pages/man8/tc-tbf.8.html
- Linux `tc-htb(8)` manual page: https://man7.org/linux/man-pages/man8/tc-htb.8.html
- Linux `tc-u32(8)` manual page: https://man7.org/linux/man-pages/man8/tc-u32.8.html
- Linux `tc-prio(8)` manual page: https://man7.org/linux/man-pages/man8/tc-prio.8.html
- Linux `tc-netem(8)` manual page: https://man7.org/linux/man-pages/man8/tc-netem.8.html
- Linux `tc-mqprio(8)` manual page: https://man7.org/linux/man-pages/man8/tc-mqprio.8.html
- Kubernetes Network Plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes Well-Known Labels, Annotations and Taints documentation: https://kubernetes.io/docs/reference/labels-annotations-taints/
- CNI bandwidth plugin documentation: https://www.cni.dev/plugins/current/meta/bandwidth/
- Local `tc` / iproute2 help output for option syntax (`tc -Version`, `tc qdisc help`, `tc qdisc add tbf help`, `tc qdisc add htb help`, `tc qdisc add netem help`, `tc qdisc add mqprio help`, `tc filter add u32 help`)

## Issues Found
- The post stated that the default qdisc is usually `pfifo_fast`. This is outdated for many modern Linux systems, where defaults often include `fq_codel`, `noqueue`, or `mq`. Updated the text and example output to say the default varies by system.
- The post grouped HTB and TBF as qdiscs that set limits and guarantee minimum rates. TBF enforces a maximum rate; HTB is the appropriate example for guaranteed and ceiling rates. Updated the explanation accordingly.
- The post said applying tc rules to the host-side veth controls traffic to and from the pod, then labeled a root TBF on the host-side veth as pod egress limiting. Root qdiscs shape packets transmitted out of that interface, which on the host-side veth means traffic going into the pod. Updated the direction wording and test expectation.
- The TBF `burst` examples used bit units (`kbit`) even though TBF burst is a byte-sized bucket parameter. Changed examples to `32kb` and `128kb`.
- The CNI bandwidth plugin section said the plugin should create HTB qdiscs and classes. The official plugin configures TBF, using IFB for ingress shaping. Updated the expected output note.
- The DSCP `u32` filters used `match ip dscp`, which is not the documented selector. Changed them to `match ip dsfield` with the correct EF DS field value (`0xb8`) and DSCP mask (`0xfc`).
- The Go DSCP example omitted the `net` import and set the socket option after dialing via `TCPConn.File()`. Replaced it with a `net.Dialer.Control` example that sets `IP_TOS` on the socket before connect.
- Scripts that discover veth interfaces from `ip -o link show` did not strip peer suffixes such as `@if123`, which can make invalid device names for `tc`. Updated the metric script and DaemonSet loop to strip the suffix.
- The DaemonSet checked for an existing `htb` qdisc but installed a `tbf` qdisc. Updated the check to look for `tbf`.

## Review Notes
Privileged `tc qdisc add` commands could not be executed in the local container because it lacks the needed network administration capability, returning `RTNETLINK answers: Operation not permitted`. Command syntax was checked against local `tc` help output and upstream iproute2 man pages. The DaemonSet remains a minimal example; production use should coordinate with the cluster CNI and avoid overwriting qdiscs created by the CNI plugin or other node networking components.
