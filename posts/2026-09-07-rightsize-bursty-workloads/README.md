# Rightsizing Bursty Workloads Without Losing Spike Capacity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rightsizing, Capacity Planning, Autoscaling, Performance

Description: Preserve short-lived spike capacity by measuring burst shape, scaling delay, queue tolerance, and credit behavior before reducing steady resources.

---

Bursty workloads look inefficient in averages because their safety comes from capacity used only briefly. Rightsizing them safely requires describing the burst, then choosing which mechanism will serve it. Shrinking to average demand without that mechanism converts idle cost into latency, throttling, or dropped work.

## Measure burst shape, not just peak utilization

For each meaningful burst, capture:

```text
arrival rate before burst
peak arrival rate
time from baseline to peak
duration above steady capacity
time to drain backlog
recurrence and predictability
CPU, memory, network, and storage demand
latency, errors, throttles, and queue age
```

Two services can both show a maximum of 90 percent CPU. One may spike for ten seconds every hour and absorb work in a queue. The other may remain at 90 percent for twenty minutes while synchronous clients wait. They should not receive the same recommendation.

Keep metric resolution shorter than the burst. Correlate resource demand with a business metric such as requests per second or messages available. A low CPU average during a growing queue is not spare capacity.

## Calculate the capacity needed before scaling completes

Map the full reaction path:

1. telemetry is produced and scraped;
2. the autoscaler evaluates the signal;
3. a new replica or instance is requested;
4. compute capacity becomes available;
5. the image and application start;
6. readiness succeeds and traffic arrives.

The existing fleet must handle or buffer the load during that interval. If arrival rate grows by 200 requests per second each minute and usable capacity takes three minutes, the steady fleet, queue, or load-shedding design must cover the additional 600 requests per second at the end of the delay. Queue storage must cover accumulated excess arrivals over the whole interval: with a linear ramp, no initial backlog, and existing capacity exactly matching the initial arrival rate, that is 54,000 requests (0.5 × 180 seconds × 600 requests per second), with enough capacity afterward to drain them within their deadlines.

Do not assume a pod starts immediately. A pending pod can trigger node provisioning, and the new node may take much longer than HPA evaluation.

## Choose the burst mechanism deliberately

### Keep local headroom

Local CPU headroom is the fastest response and is appropriate for sudden synchronous traffic. It costs more at idle but avoids a cold path. Confirm that memory, network, and connection pools can also burst.

### Scale horizontally

Use HPA or an equivalent service autoscaler when work divides cleanly. Scale on a leading signal such as queue depth, request rate, or concurrency when CPU rises too late. Configure stabilization and rate policies so a short quiet interval does not remove freshly added capacity.

### Queue the work

For asynchronous workloads, queue age is often the real objective. Size workers so the oldest acceptable message completes before its deadline, and scale from backlog per worker rather than average CPU alone.

### Schedule capacity

If the burst follows a known market open, cron job, or billing boundary, scale before it begins. Scheduled capacity avoids paying all day and avoids waiting for reactive scaling.

### Use burstable compute carefully

AWS T-family instances provide baseline CPU and spend accrued credits above that baseline. In Standard mode, exhausted credits constrain performance toward baseline. In Unlimited mode, sustained excess can incur surplus-credit charges. Track credit balance and surplus charges across the entire burst cycle, including startup, before choosing a smaller burstable shape.

## Protect the non-CPU bottlenecks

A smaller shape can change more than vCPU count. Verify:

- network and packet-per-second limits;
- disk IOPS, throughput, and burst credits;
- memory available for caches and concurrent requests;
- maximum connections and file descriptors;
- accelerator or local-disk availability;
- per-instance license and architecture constraints.

High CPU can be a symptom of an I/O retry loop. More vCPU will not fix a saturated volume, and fewer vCPUs may reduce network bandwidth on some cloud families.

## Run a burst replay against candidates

Build a test matrix rather than changing production from one chart:

| Test | Required result |
| --- | --- |
| Expected burst | Latency and errors remain within objectives |
| Burst before scale-out | Existing capacity or queue absorbs arrival |
| Two consecutive bursts | Credits and caches recover sufficiently |
| One replica or zone unavailable | Remaining path meets degraded objective |
| Dependency slows | Retries do not amplify resource demand |
| Scale-in after burst | No oscillation or premature backlog growth |

Canary the smaller size on a subset of traffic and compare it with a control. Roll back on service outcomes, not only utilization. CPU at 95 percent can be healthy for a batch worker and unacceptable for a latency-sensitive API.

## Review both cost and capacity

Compute effective cost per completed unit of work over the same measurement interval, counting each cost once:

```text
total cost = base instance cost
           + burst credit charges
           + extra replica cost
           + additional retry and queue storage cost
effective cost per completed unit = total cost / completed units of work
```

A smaller instance that runs longer or repeatedly scales out can cost more. Keep the configuration that meets objectives at the lowest measured cost, even if its average utilization looks less tidy.

## Conclusion

Rightsize bursts from their amplitude, ramp, duration, and recurrence. Ensure local headroom, autoscaling, scheduling, or queueing covers the complete reaction interval. Validate credit behavior and secondary resource limits, then judge candidates by service outcomes and cost per completed work.

## Official Documentation

- [Amazon EC2 burstable performance concepts](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-credits-baseline-concepts.html)
- [Amazon EC2 burstable instance best practices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances.html)
- [Kubernetes Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [Kubernetes node autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
