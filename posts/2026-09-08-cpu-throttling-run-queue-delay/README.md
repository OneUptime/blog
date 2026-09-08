# How to Size CPU from Throttling and Run-Queue Delay

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CPU, Linux, Capacity Planning, Performance, Prometheus

Description: Size compute from CPU time per useful operation, cgroup throttling, and scheduler pressure instead of relying on host-average utilization.

---

Average CPU utilization answers how much processor time was consumed over a window. It does not show how long runnable work waited, whether a container exhausted its CPU quota for part of each period, or whether one core was saturated while others were idle.

Capacity planning needs both demand and delay.

## Measure the execution boundary

At the host, container, and application layers collect:

- CPU seconds by user and system mode;
- successful operations and their class;
- cgroup CPU quota and period;
- `cpu.stat` usage and throttling counters;
- CPU Pressure Stall Information;
- runnable-task or scheduler-delay telemetry;
- per-core utilization and affinity;
- latency, queue depth, and useful throughput.

On cgroup v2, `cpu.max` defines quota and period, and `cpu.stat` exposes `nr_periods`, `nr_throttled`, and `throttled_usec` when the CPU controller is enabled. Those bandwidth fields are non-hierarchical: they describe throttling caused by that cgroup's own limit, not an ancestor's. Inspect ancestor limits and counters as well. On kernels that expose it, `cpu.stat.local` reports local run-queue throttling time including throttling inherited from ancestors.

Linux PSI reports the share of time tasks are stalled because CPU, memory, or I/O is unavailable. CPU `some` pressure indicates at least some runnable work is waiting for processor time. It connects contention to lost time more directly than utilization alone.

Traditional load average includes runnable tasks and tasks in uninterruptible sleep, so it is not a pure CPU run-queue measurement. Use it as context, not as the sole sizing signal.

## Normalize CPU cost per useful operation

For each stable load-test stage calculate:

```text
CPU seconds per useful operation
  = rate(process or cgroup CPU seconds) / successful operations per second
```

Then estimate busy cores at forecast demand:

```text
busy cores = sum(lambda_i * CPU seconds per operation_i)
planned cores = busy cores / target utilization
```

Suppose an API needs 1.8 ms of CPU per successful request at the production mix and forecast demand is 4,000 RPS:

```text
busy cores    = 4,000 * 0.0018 = 7.2
planned cores = 7.2 / 0.65     = 11.08
```

Round to at least 12 cores within the measured boundary, then account for sidecars, node daemons, failure reserve, and placement outside it. Verify that CPU cost stays stable near the proposed operating point. Cache misses, garbage collection, logging, lock contention, and retries can make cost per successful request rise near overload.

The target utilization is workload-specific. Choose it from the highest tested stage that meets latency and error objectives through expected bursts and scaling delay, not from a universal percentage.

## Interpret throttling correctly

Throttling proves quota constrained runnable work, but counters need context:

```text
throttled-period ratio = rate(nr_throttled) / rate(nr_periods)
```

A period counts as throttled even if the stall was brief, and this ratio covers the cgroup's own bandwidth limit rather than inherited throttling. Pair it with `throttled_usec`, `cpu.stat.local` where available, ancestor counters, CPU PSI, latency, and throughput. Counter rates must handle resets.

Throttling can occur while host-average CPU looks low because a container's quota is smaller than host capacity. Conversely, a batch workload may tolerate throttling without violating an objective. Alert on sustained throttling correlated with service harm rather than declaring every nonzero sample an incident.

In Kubernetes, CPU requests influence scheduling and CPU shares under contention, while CPU limits are enforced through kernel CPU controls. Confirm requests and limits in the running Pod specification and inspect the correct container cgroup. Removing a limit may reduce throttling but can let one workload harm neighbors; test the change and retain an admission and isolation policy.

## Find run-queue saturation

Run an open-arrival-rate staircase test and plot:

```text
offered work
useful throughput
CPU seconds per useful operation
p95 and p99 latency
CPU PSI
cgroup throttling time
runnable or scheduler delay
```

The CPU knee appears when useful throughput stops scaling proportionally while runnable delay, PSI, throttling, or latency rises. It may occur below 100 percent aggregate utilization because of a single-threaded stage, CPU affinity, uneven load, interrupt work, frequency changes, or noisy neighbors.

Test several instances of the same type. Cloud CPU performance, NUMA placement, simultaneous multithreading, and burst-credit models can change results. Do not count a hardware thread as equivalent to a physical core without measurement.

## Distinguish CPU shortage from other stalls

High latency with low CPU pressure can point elsewhere:

- memory PSI or reclaim suggests memory pressure;
- I/O PSI and device latency suggest storage;
- pool wait indicates bounded downstream concurrency;
- lock wait can leave CPU idle despite runnable application demand being blocked;
- steal time indicates the guest was not scheduled by the hypervisor;
- a single hot core indicates serialization or affinity.

Adding cores will not fix a remote quota or mutex. Change one suspected constraint and repeat the test.

## Make the plan operational

Record both a resource request and a trigger for review:

```yaml
forecast_rps: 4000
cpu_seconds_per_request: 0.0018
target_utilization: 0.65
planned_application_cores: 12
max_cpu_psi_some_avg60: 2-percent
max_throttled_time_rate: tested-baseline
retest_on: [runtime-change, instance-change, request-mix-change]
```

Use Prometheus `rate()` for monotonically increasing CPU and throttling counters and preserve labels needed to aggregate containers into the intended service boundary.

## Conclusion

Size CPU from measured CPU seconds per useful operation and a load-tested operating target. Use cgroup throttling and CPU pressure or scheduler delay to identify time denied to runnable work, and inspect per-core behavior before trusting a host average. Revalidate under realistic mix, bursts, placement, and instance variance.

## Official Documentation

- [Linux kernel cgroup v2 CPU interface](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html#cpu)
- [Linux Pressure Stall Information](https://www.kernel.org/doc/html/latest/accounting/psi.html)
- [Linux proc filesystem and load average documentation](https://www.kernel.org/doc/html/latest/filesystems/proc.html)
- [Kubernetes CPU resource units and limits](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#meaning-of-cpu)
- [Prometheus query function rate](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Prometheus Node Exporter guide](https://prometheus.io/docs/guides/node-exporter/)
