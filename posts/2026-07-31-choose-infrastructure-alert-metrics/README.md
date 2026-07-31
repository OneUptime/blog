# Which Infrastructure Metrics Actually Deserve Alerts? A Practical Selection Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Infrastructure Monitoring, Alerting, Prometheus, Linux, SRE, Observability

Description: Select infrastructure alerts by consequence, urgency, actionability, signal quality, and response scope instead of paging on every available metric.

---

Most infrastructure metrics deserve a graph. Far fewer deserve a notification, and only a small subset should wake an on-call engineer.

CPU utilization, free memory, disk latency, network errors, load average, and temperature are system facts. An alert also needs an operational contract: what harm is occurring or approaching, how soon a person must act, and what they can do.

Prometheus recommends keeping alerts few, paging on symptoms associated with user pain, and avoiding pages where there is nothing to do. Google SRE similarly distinguishes immediate alerts, non-urgent tickets, and informational monitoring output.

## Choose the Response Before the Metric

Use three destinations:

- **Page:** immediate human action can improve an ongoing or imminent serious outcome.
- **Ticket:** work is important but can wait for normal working hours.
- **Dashboard or log:** useful for diagnosis, capacity planning, and trend analysis.

Examples:

| Observation | Likely output |
| --- | --- |
| One host is at 82% CPU, service objectives are healthy, and capacity is redundant. | Dashboard |
| Filesystem will exhaust in an estimated two days and expansion is a normal daytime operation. | Ticket |
| Filesystem will exhaust inside the safe response lead time and a critical writer cannot shed load. | Page |
| Customer request-error budget is burning rapidly while backend hosts are saturated. | Page on customer symptom; infrastructure data in context |
| Correctable memory errors increased once on a noncritical redundant host. | Ticket or hardware workflow |
| A required interface is down on both members of a redundant pair. | Page |

Your business criticality, redundancy, automation, and staffing determine the destination.

## Apply Five Selection Tests

### 1. Consequence

What concrete outcome follows?

- customer errors or latency;
- data loss or corruption;
- loss of redundancy;
- security exposure;
- capacity exhaustion;
- inability to recover;
- monitoring blindness.

“The metric is unusual” is not a consequence.

### 2. Urgency

How long until intervention is too late? Include:

- detection and notification delay;
- acknowledgement;
- diagnosis;
- approval;
- mitigation execution;
- safety margin.

A capacity page should fire early enough to complete a safe action, not at 99% when expansion already takes an hour.

### 3. Actionability

Name the first safe action:

- shed noncritical load;
- expand or clean a filesystem;
- fail traffic away from a host;
- stop a rollout;
- replace a degraded node;
- restore monitoring coverage.

If the responder can only watch the graph, do not page.

### 4. Signal quality

Check:

- metric semantics;
- reset and missing-data behavior;
- expected variance;
- label cardinality;
- scrape and evaluation interval;
- persistence required;
- seasonality and workload phases;
- false positives in historical replay.

A threshold copied from another fleet does not pass this test.

### 5. Response scope

Alert at the boundary where someone can act:

- service;
- cluster;
- region;
- redundancy group;
- host;
- device or mount point.

Five hundred host pages for one service incident hide the scope. One global alert can hide the exact fault domain. Group and route deliberately.

## Start with Service Symptoms

Google SRE’s four golden signals are:

- latency;
- traffic;
- errors;
- saturation.

For online systems, page as high in the customer path as practical. Use black-box success, latency, and service-objective burn to detect impact. Infrastructure metrics then explain causes and warn about resource exhaustion that has not yet produced visible symptoms.

There are legitimate infrastructure pages:

- a stateful volume approaching exhaustion;
- both devices in a redundant pair degraded;
- OOM kills on a critical singleton;
- loss of monitoring coverage;
- rapidly increasing uncorrectable hardware errors;
- CPU pressure on a component whose customer symptom is delayed or unobservable.

Document why the service-level signal is insufficient.

## Evaluate Common Host Signals

### CPU

CPU busy percentage alone shows occupancy, not necessarily harmful saturation. A batch node may run productively at high utilization; one latency-sensitive task may suffer while a fleet average looks moderate.

Combine:

- non-idle CPU time;
- normalized load or runnable queue;
- CPU Pressure Stall Information (PSI);
- steal and throttling;
- application latency and throughput;
- redundancy and scheduling headroom.

Page on sustained customer impact or demonstrated compute contention with an immediate response. Use high-but-healthy CPU for capacity planning.

### Memory

Linux intentionally uses memory for caches. “Used memory above 90%” is normally a poor page.

Prefer:

- `MemAvailable` relative to total memory;
- memory PSI;
- reclaim and swap behavior appropriate to the workload;
- OOM kill events;
- application allocation failures;
- cgroup memory limits for constrained workloads.

Page when critical work is stalling, being killed, or approaching an unrecoverable limit. A low-available-memory condition with no pressure may be a ticket or dashboard.

### Filesystem bytes and inodes

Monitor both available bytes and available inodes. Exclude pseudo-filesystems and mounts that have no operational meaning.

Useful alerts include:

- time to exhaustion inside the response lead time;
- critical minimum free space;
- unexpected read-only state;
- filesystem or device errors;
- growth acceleration after a known change.

A fixed 80% threshold is weak across a 20 GB boot disk and a 20 TB data volume. Combine an absolute safety floor with a tested forecast where growth is sufficiently regular.

### Disk I/O

Throughput alone is workload, not failure. Use:

- operation latency;
- queueing or device busy time;
- I/O PSI;
- application storage latency;
- device errors and timeouts;
- workload-specific throughput objective.

High throughput can be healthy. Low throughput with long queues and blocked work can be severe.

### Network

Raw packet and byte rates usually belong on dashboards. Alert candidates include:

- required link state;
- errors or discards as a ratio to traffic;
- retransmission or connection-failure symptoms;
- sustained bandwidth saturation with queueing or loss;
- loss of expected peers or routes;
- redundancy-group failure.

Exclude unused interfaces and expected virtual-device churn. Map interfaces to services or redundancy groups before paging.

### Load average

Linux load average combines runnable tasks with tasks in uninterruptible wait. It is not a CPU percentage. Normalize it by the relevant logical CPU count for rough host comparison and correlate with CPU busy time, CPU PSI, I/O PSI, and process state.

High load with low CPU can indicate blocked work rather than compute saturation.

### Kernel and hardware integrity

Treat these separately from utilization:

- OOM kills;
- machine-check or uncorrectable memory errors;
- storage media errors;
- thermal throttling;
- critical filesystem errors;
- clock synchronization failure where correctness depends on time.

Route to the team that can isolate or replace the component. Correctable counters and temperature readings need model-specific thresholds and trend handling; do not invent universal limits.

### Exporter and monitoring health

Prometheus’s `up` metric says whether a target was scraped successfully; it does not prove the application is healthy. Alert separately on monitoring coverage and use external black-box checks to catch failures inside the monitoring path.

Metamonitoring should answer whether:

- targets are being scraped;
- rules are evaluating;
- Alertmanagers can deliver;
- expected series are present;
- label or sample volume is within bounds.

## Prefer Composite Conditions Where They Add Meaning

A useful infrastructure condition often combines state and consequence:

```text
filesystem forecast crosses zero inside response lead time
AND mount is writable
AND service is assigned to the critical storage class
```

```text
CPU non-idle time is sustained
AND CPU pressure shows tasks waiting
AND service latency is outside its objective
```

```text
memory availability is low
AND memory pressure is sustained
OR OOM kills are increasing
```

Do not make expressions so complex that nobody can explain them. Prometheus recommends simple alerts and good consoles for diagnosis. Recording rules can make a reviewed intermediate signal easier to test.

Be careful with boolean precedence and vector matching in PromQL. Unit-test representative healthy, firing, missing, and resolving cases.

## Derive Thresholds from Response Time

For capacity:

```text
required lead time =
  notification + acknowledgement + diagnosis + approval
  + mitigation duration + safety margin
```

Alert when the tested forecast enters that horizon. Maintain an absolute floor for sudden growth and forecast failure.

For saturation:

- identify the service degradation point in load tests or production history;
- choose a margin that allows mitigation;
- require persistence long enough to ignore harmless bursts;
- verify that the alert still arrives before unacceptable impact.

Prometheus alert rules support a `for` duration. It reduces transient noise but adds delay, so include it in the response calculation.

## Design the Notification

Every alert should include:

- affected service and fault domain;
- observed value and threshold;
- duration;
- consequence;
- dashboard;
- runbook;
- recent change or incident link where available;
- owning team;
- safe first action;
- escalation path.

Avoid notifications that say only “CPU high on `node-184`.”

## Validate Before Paging

Use this rollout:

1. confirm metric semantics against the exporter and operating-system documentation;
2. evaluate the expression in table view and inspect labels;
3. replay historical incidents and normal peaks;
4. run rule tests;
5. deploy initially to a non-paging destination;
6. introduce a bounded representative condition;
7. verify pending, firing, routing, and resolution;
8. enable paging;
9. review every fire for actionability and every missed incident for coverage.

Node Exporter warns that additional collectors can increase scrape duration, cardinality, and resource demand. Enable collectors deliberately and watch the exporter’s own scrape behavior.

## A Selection Checklist

```text
[ ] The alert names a concrete harmful or near-harmful outcome.
[ ] A human must act within a defined time.
[ ] A safe action and owner exist.
[ ] Service-symptom paging was considered first.
[ ] Metric semantics and missing-data behavior are documented.
[ ] Threshold and duration come from evidence and response lead time.
[ ] Aggregation matches the fault and ownership boundary.
[ ] Notification contains context, dashboard, and runbook.
[ ] Healthy, firing, missing, and recovery cases are tested.
[ ] The page has a review and retirement process.
```

Collect broadly, visualize generously, ticket important risks, and page selectively.

## Official Documentation

- [Google SRE: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Prometheus: Alerting Practices](https://prometheus.io/docs/practices/alerting/)
- [Prometheus: The Zen of Prometheus](https://prometheus.io/docs/practices/the_zen/)
- [Prometheus: Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus Node Exporter](https://github.com/prometheus/node_exporter)
- [Linux Kernel: Pressure Stall Information](https://docs.kernel.org/accounting/psi.html)
