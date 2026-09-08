# Validation Summary: How to Size CPU from Throttling and Run-Queue Delay

## Status
validated

## Post Type
Technical capacity-planning guide with sizing formulas, Linux telemetry details, and an illustrative YAML planning record.

## Technologies Covered
- Linux CPU scheduling, run queues, load average, CPU affinity, and steal time
- cgroup v2 CPU bandwidth controls and throttling statistics
- Linux Pressure Stall Information (PSI)
- Kubernetes CPU requests and limits
- Prometheus counter rates and Node Exporter
- Open-arrival-rate load testing
- Cloud CPU credits, simultaneous multithreading, and NUMA placement
- YAML

## Sources Consulted
- Linux cgroup v2 CPU interface: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html#cpu
- Linux CFS bandwidth control: https://www.kernel.org/doc/html/latest/scheduler/sched-bwc.html
- Linux PSI: https://www.kernel.org/doc/html/latest/accounting/psi.html
- Linux proc filesystem: https://www.kernel.org/doc/html/latest/filesystems/proc.html
- Linux proc_loadavg manual: https://man7.org/linux/man-pages/man5/proc_loadavg.5.html
- Linux scheduler statistics: https://www.kernel.org/doc/html/latest/scheduler/sched-stats.html
- Linux mutex design: https://www.kernel.org/doc/html/latest/locking/mutex-design.html
- Kubernetes resource management: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Prometheus rate(): https://prometheus.io/docs/prometheus/latest/querying/functions/#rate
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Grafana k6 open and closed workload models: https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/
- Amazon EC2 CPU credit concepts: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-credits-baseline-concepts.html
- Amazon EC2 CPU options and SMT: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-optimize-cpu.html
- YAML 1.2.2 specification: https://yaml.org/spec/1.2.2/
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
- The lock-wait bullet described blocked application demand as runnable. A task sleeping on a lock is blocked, not waiting on the CPU run queue. Changed the bullet to “sleeping on a lock can leave CPU idle while application work is blocked rather than runnable.” This also distinguishes sleeping from spinning, which can consume CPU.

## Review Notes
- Verified the sizing dimensions and arithmetic: 4,000 requests/second multiplied by 0.0018 CPU seconds/request is 7.2 busy CPU equivalents; dividing by 0.65 gives approximately 11.08, rounded upward to 12. This remains conditional on the measured workload mix, hardware, and tested utilization target.
- Confirmed the distinction between the cgroup's own bandwidth counters and inherited throttling reported by cpu.stat.local. Availability is kernel-dependent, as the post states; bandwidth enforcement applies to fair-class tasks. Time fields in the cgroup v2 CPU interface use microseconds.
- PSI some describes elapsed time with at least some stalled work; it is not a count of waiting tasks or a direct estimate of additional cores. The example's 2-percent threshold is a proposed operational target, not a kernel default.
- Confirmed load average includes runnable and uninterruptible tasks, scheduler statistics distinguish execution time from run-queue delay, and aggregate CPU measurements can hide uneven per-CPU demand.
- Kubernetes requests support placement and relative CPU allocation under contention; limits constrain CPU consumption. No Kubernetes manifest or executable CLI command is supplied.
- The text blocks are mathematical pseudocode and a list of test signals, not executable PromQL. Actual queries need exporter metric names and range selectors. Apply rate before aggregation to preserve reset detection, and avoid evaluating the throttled-period ratio when its denominator is zero.
- The YAML is an illustrative planning record with custom keys, not a Kubernetes or Prometheus configuration schema. The values 2-percent and tested-baseline are valid plain strings; consumers would need to interpret or replace them.
- Open-arrival testing avoids coupling offered load to response duration. Hardware threads and CPU credits require workload-specific measurement; the post appropriately avoids a universal physical-core conversion or utilization target.
- All post reference URLs resolved to the intended resources, including the author profile redirect. No deprecated executable API or command was present. Review consisted of documentation checks and arithmetic validation; no production benchmark or Linux runtime experiment was performed.
