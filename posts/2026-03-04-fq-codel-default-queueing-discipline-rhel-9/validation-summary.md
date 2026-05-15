# Validation Summary: How to Understand the fq_codel Default Queueing Discipline on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux traffic control (`tc`)
- `fq_codel`, CoDel, and fair queueing qdiscs
- Linux networking sysctls
- ECN and bufferbloat mitigation

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Linux traffic control": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/linux-traffic-control_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation, "Available qdiscs in RHEL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/available-qdiscs-in-rhel_linux-traffic-control
- iproute2 `tc-fq_codel(8)` manual page: https://manpages.debian.org/unstable/iproute2/tc-fq_codel.8.en.html
- RFC 8290, "The Flow Queue CoDel Packet Scheduler and Active Queue Management Algorithm": https://www.rfc-editor.org/rfc/rfc8290
- Local `tc-fq_codel(8)` and `tc` help output from the review environment

## Issues Found
- The post said each flow gets equal access and a flooding flow does not affect other flows. FQ-CoDel classifies packets into a finite number of hash buckets, and collisions can place multiple flows in the same bucket. Updated the wording to describe fair access per flow hash bucket and reduced impact on other flows.
- The fair queueing description and flow diagram implied exact per-flow queues based only on addresses and ports. Updated them to describe flow hash buckets and the default 5-tuple classifier.
- The table described `target` as a maximum sojourn time. The iproute2 manual describes it as the acceptable standing or persistent queue delay. Updated the table wording.
- The RHEL default parameter table omitted `memory_limit` and `drop_batch`, which appear in current RHEL-style `tc` output and the iproute2 manual. Added both defaults.
- The low-bandwidth tuning example lowered `target` to `2ms`. RFC 8290 notes that the target should be at least the serialization time of an MTU-sized packet, so lowering target on slow links can be counterproductive. Changed the example to keep `target` at `10ms` with `interval 100ms`.
- The system-wide default qdisc example implied that `sysctl -w net.core.default_qdisc=...` is enough for all active interfaces. Red Hat documents that applying a new default to existing interfaces may require driver reload or qdisc replacement. Added a short caveat.

## Review Notes
The `tc qdisc replace`, `tc -s`, `tc -s -d`, `sysctl`, `iperf3`, and `ping` examples are syntactically valid. The post remains RHEL 9-specific; defaults can vary on other distributions, kernel versions, and interface types such as virtual or noqueue devices.
