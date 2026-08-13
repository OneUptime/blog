# Read InfiniBand Counters That Actually Implicate a Bad Cable

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: InfiniBand, Cable Diagnostics, Network Counters, BER, perfquery, mlxlink

Description: Diagnose suspect InfiniBand media with counter deltas, peer correlation, BER and recovery evidence while separating physical errors from congestion and policy discards.

---

No single InfiniBand counter means “replace this cable.” A bad cable can produce symbol errors, failed correction, link recovery, link-down events, reduced width, or link-level retransmissions. The same counters can also implicate an optical module, connector, receiver cage, or SerDes. Meanwhile, counters with alarming names such as `PortXmitDiscards` often describe congestion or a down port rather than damaged media.

The reliable method is correlation: collect both ends at the same time, measure deltas during known traffic, inspect modern PHY diagnostics, and make one controlled substitution. A cable becomes the leading cause when physical errors grow on the link, the peer observations agree, and the symptom follows that cable to known-good ports.

## Start with a Timestamped Baseline

Linux exports standard counters for each local RDMA port. Capture state, rate, and the relevant counters together:

~~~console
$ date --iso-8601=seconds
$ ibstat mlx5_0 1
$ grep -H . /sys/class/infiniband/mlx5_0/ports/1/counters/{symbol_error,link_error_recovery,link_downed,port_rcv_errors,port_xmit_discards,port_xmit_wait}
$ perfquery -C mlx5_0 -P 1
~~~

Repeat after a fixed interval or a controlled workload. Do the same on the adjacent switch port and, where possible, the remote HCA. A total of 500 errors accumulated over years is different from 500 new errors during a 30-second test.

Do not start by resetting everything. `perfquery -r` resets after reading, `perfquery -R` performs a reset, and `ibqueryerrors --clear-errors` clears fabric counters. Those operations can erase evidence used by monitoring and another operator. Save a complete baseline and obtain approval before resetting shared fabric counters.

## Know What Each Counter Can Prove

The following interpretation follows the Linux sysfs names and NVIDIA's documented telemetry definitions:

| Counter | What growth means | Cable specificity |
| --- | --- | --- |
| `symbol_error` / `SymbolErrorCounter` | minor physical-link errors or, in extended telemetry, error bits not corrected by PHY correction | strong physical-path evidence, but not cable-only |
| `link_error_recovery` | the port training state machine successfully completed link error recovery | strong instability evidence when unplanned and increasing |
| `link_downed` | training failed link error recovery and downed the link | strong disruption evidence, but administrative events must be excluded |
| `port_rcv_errors` | packets containing an error arrived at the port | supports a receive-path problem; broader than cable faults |
| `port_rcv_remote_physical_errors` | packets marked with the error-at-bad-packet delimiter arrived | says the upstream path marked an error, not necessarily this local cable |
| `port_xmit_discards` | outbound packets were discarded because the port was down or congested | weak cable evidence; separate down time from congestion |
| `port_xmit_wait` | the egress had data but could not transmit for lack of credits or arbitration | congestion/flow-control evidence, not a cable diagnosis |
| constraint errors | packets were rejected by partition or other constraints | policy/configuration evidence, not signal integrity |

`link_downed` also counts link-down transitions that may have an intentional explanation. Correlate its timestamps with maintenance, port resets, firmware activation, host reboots, and cable reseats. A monotonically increasing counter without event context is not a root cause.

## Query the Fabric with Endpoint Context

`ibqueryerrors` scans the fabric and, by default, reports counters above thresholds. Add link identity and optional detail counters:

~~~console
$ ibqueryerrors --report-port --details
$ iblinkinfo -l
~~~

The report-port output associates a failing port with its remote GUID, remote port, node description, and link settings when available. That is essential: the receive counter on one side reflects traffic sent across the link from the other side, and a remote-physical-error mark can originate upstream.

Use an explicit threshold file appropriate for the environment when zero is too noisy. The official `ibqueryerrors` format accepts names such as `SymbolErrorCounter`, `LinkErrorRecoveryCounter`, and `VL15Dropped`. Thresholds should reflect rates and operational policy; they should not be copied as universal hardware limits.

## Add Modern PHY, FEC, and Retry Evidence

At high link generations, the traditional symbol counter is not the whole story. NVIDIA documents that link-level retry can retransmit corrupted packet portions and that bandwidth may fall when cable performance degrades. PHY correction or FEC can also correct errors before they appear as ordinary packet failures.

For supported NVIDIA devices, collect the read-only physical view:

~~~console
$ sudo mlxlink -d /dev/mst/<adapter-device> --show_counters
$ sudo mlxlink -d /dev/mst/<adapter-device> --show_module
~~~

Depending on device and firmware, this can expose BER, physical counters, FEC capabilities, module alarms, per-lane optical information, and link recovery/downed counts. NVIDIA's `ibdiagnet` cable-diagnostic plugin and BER tests provide a fabric-wide option on supported platforms.

Interpret these signals together:

- rising uncorrectable or effective errors are more serious than a static historical total;
- a high corrected-error or retransmission rate can explain lost bandwidth even without packet loss;
- one anomalous lane points toward lane-specific media, connector, or receiver trouble;
- low receive optical power or loss-of-signal strengthens an optical-path hypothesis;
- clean PHY diagnostics with high `PortXmitWait` point toward congestion instead.

Do not run PRBS, eye scans, error injection, port toggles, or counter clears as if they were queries. Those advanced `mlxlink` operations can disrupt production and require the documented offline procedure.

## Correlate the Two Ends Correctly

For a direct link from A to B, errors detected by B's receiver describe the signal arriving from A's transmitter across the media. That path contains at least the transmitter, connector, cable/module, far connector, and receiver. It does not isolate the cable by itself.

Build a short evidence table:

| Interval | A transmit / B receive PHY delta | B transmit / A receive PHY delta | Link recovery/down | Traffic and events |
| --- | ---: | ---: | ---: | --- |
| idle baseline | 0 | 0 | 0 | no maintenance |
| A to B load | increasing | 0 | 2 | no port changes |
| B to A load | 0 | 0 | 0 | no port changes |

That example would localize the problem to the A-transmit-to-B-receive direction, not conclusively to the cable. If errors occur in both directions, a common cable/module or connector becomes more plausible. If several different cables fail only into B's receiver, B's port becomes more plausible.

Normalize deltas by observation time and traffic volume where possible. A raw count is not comparable between a saturated backbone and an idle host link.

## Prove the Cable with a Controlled Swap

After collecting evidence, use a known-good, vendor-validated replacement of the same intended technology, reach, and breakout. Change only the media and repeat the identical test.

The strongest outcomes are:

- **Fault follows the suspect cable:** physical/BER/recovery deltas reappear when that cable is moved between known-good ports. Replace or RMA the cable/module.
- **Fault stays on one receiver:** known-good cables show the same directional error on that cage. Investigate the adapter/switch port, connector, firmware, or SerDes.
- **Fault disappears after reseating both ends:** contamination, incomplete insertion, or connector seating is plausible, but continue monitoring because the intervention changed more than the cable electronics.
- **Only wait/discard counters grow:** inspect credit starvation, oversubscription, routing, MTU, port-down time, and policy before blaming media.

Active optical and active copper assemblies include electronics and may have firmware. Preserve serial numbers, part numbers, diagnostic output, endpoint firmware, and error deltas for a vendor case.

## Make Monitoring Actionable

Alert on rates and correlated events rather than nonzero lifetime totals. Useful conditions include new uncorrectable errors, repeated unplanned link recovery, a new link-down event outside maintenance, sustained retry-related bandwidth loss, or a width/rate downgrade accompanied by lane errors.

Keep congestion signals separate. `PortXmitWait` and many transmit discards can be operationally urgent, but assigning them to a “bad cable” alert sends the wrong team to the rack and delays the actual capacity or flow-control fix.

## Official Documentation

- [Linux kernel: stable InfiniBand counter sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/stable/sysfs-class-infiniband)
- [rdma-core: `perfquery(8)` counter query and reset semantics](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/perfquery.8.in.rst)
- [rdma-core: `ibqueryerrors(8)` thresholds, details, and clear operations](https://github.com/linux-rdma/rdma-core/blob/master/infiniband-diags/man/ibqueryerrors.8.in.rst)
- [NVIDIA UFM Enterprise 6.24.2: telemetry counter definitions](https://docs.nvidia.com/networking/display/nvidia-ufm-enterprise-user-manual-v6-24-2.pdf)
- [NVIDIA MFT: `mlxlink` counters, module data, and BER diagnostics](https://networking-docs.nvidia.com/mftswum/426135lts/mlxlink-utility)
- [NVIDIA: InfiniBand fabric utilities and link-level retry behavior](https://docs.nvidia.com/networking/display/mlnxofedv23102131201lts/infiniband-fabric-utilities.pdf)
- [NVIDIA: `ibdiagnet` cable diagnostic and BER manual](https://docs.nvidia.com/networking/display/ibdiagnet-infiniband-fabric-diagnostic-tool-user-manual-v2-21.21.pdf)

## Conclusion

Symbol, BER, uncorrectable-error, recovery, and link-down deltas can strongly implicate the physical path, but none isolates a cable alone. Collect synchronized evidence from both ends, include modern FEC and link-level retry diagnostics, exclude maintenance and congestion, and then move one known-good component. A cable diagnosis is defensible when the directional physical symptom follows the cable; `PortXmitWait` or generic discards without that evidence are reasons to investigate the fabric, not reasons to order media.
