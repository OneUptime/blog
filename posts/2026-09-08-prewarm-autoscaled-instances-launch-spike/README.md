# How to Pre-Warm Autoscaled Instances Before a Marketing or Launch-Day Spike

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Autoscaling, Capacity Planning, Cloud Computing, Load Testing, Reliability

Description: Work backward from a dated traffic forecast, measured cold-start latency, and tested unit capacity to make instances genuinely ready before launch traffic arrives.

---

Reactive autoscaling begins after demand changes. A marketing campaign or product launch has a known time, so waiting for CPU or queues to rise spends the warmup interval degrading real requests.

Pre-warming means provisioning, initializing, validating, and registering enough capacity before the event. Merely starting virtual machines is not sufficient.

## Convert the event forecast into a target

Freeze three inputs with owners:

```text
event demand forecast and uncertainty bound
SLO-safe throughput per instance for the event traffic mix
failure and maintenance reserve required during the event
```

Suppose the p95 event forecast is 50,000 RPS, one load-tested instance safely serves 1,250 RPS, and policy requires four extra instances for one host failure:

```text
demand instances = ceil(50,000 / 1,250) = 40
event target      = 40 + 4 = 44 instances
```

Validate databases, caches, brokers, third-party quotas, connection pools, load balancers, IPs, and network paths at that target. Frontend pre-warming only moves the bottleneck if shared dependencies cannot scale.

## Measure cold-to-serving time

Measure many real launches and retain a high percentile for each stage:

```text
allocation and boot
agent and runtime initialization
image or artifact retrieval
configuration and secret retrieval
schema or metadata checks
cache population or JIT warmup
health and readiness success
load-balancer registration and propagation
```

Do not add each stage's independent p99 to claim an end-to-end p99. Measure the end-to-end distribution directly. Add an explicit scheduling buffer for variance and operator response.

If p99 cold-to-serving time is nine minutes and the operating buffer is three minutes, begin the scale action at least 12 minutes before expected arrivals. Add any required healthy observation period before the launch-gate deadline: the 10-minute gate below requires at least 22 minutes of lead time before that deadline with these startup and buffer values. Start earlier when provider capacity allocation or quota changes have longer lead times.

## Choose the pre-warm mechanism

For a one-time event, a scheduled action can raise desired and minimum capacity before the start and lower it after a guarded cool-down. AWS EC2 Auto Scaling scheduled actions can set desired, minimum, and maximum group capacity. Keep dynamic policies enabled so unexpected demand can add more.

For recurring patterns, AWS predictive scaling forecasts capacity and supports a scheduling buffer that launches instances before the forecast hour. Evaluate it in forecast-only mode before allowing it to scale. It is not a substitute for a one-time launch forecast that history cannot contain.

For slow-booting EC2 applications, a warm pool keeps pre-initialized instances alongside an Auto Scaling group so scale-out can draw from them. Warm-pool states have different cost and resume characteristics; benchmark the chosen state and understand which initialization steps must rerun.

On Kubernetes, raise application minimum replicas and node-group minimums or low-priority placeholder capacity early enough for nodes and Pods to become Ready. Confirm Pod topology, volumes, and disruption constraints at the event size.

## Warm the application safely

Readiness should prove the instance can serve the event path, not only that a process opened a port. Exercise synthetic canary traffic through the real load-balancer path and confirm:

- configuration and secrets loaded;
- dependency pools established within their global budgets;
- critical code paths compiled or initialized;
- bounded caches populated where appropriate;
- authentication, DNS, and certificates work;
- event-specific data is accessible;
- telemetry arrives with the new instance identity.

Avoid a simultaneous warmup stampede. Forty instances that all rebuild a large cache or open maximum database pools can overload dependencies before the campaign begins. Stagger the ramp, cap warmup concurrency, and use shared artifacts when correctness permits.

Do not send fake writes to production business workflows. Use idempotent canaries, isolated tenants, read-only paths, or a representative staging environment.

## Use explicit readiness gates

Create a launch gate with a deadline before marketing traffic starts:

```yaml
required_serving_instances: 44
healthy_for: 10m
synthetic_success_rate: 99.9-percent
p99_canary_latency: less-than-350ms
database_pool_headroom: greater-than-20-percent
queue_backlog: 0
autoscaling_max_verified: 64
rollback_or_hold_owner: launch-commander
```

If the gate fails, choose a pre-agreed action: delay traffic, reduce audience, disable an expensive feature, shed optional work, or add a controlled capacity tier. A dashboard without decision authority is not a gate.

## Observe and unwind safely

During the event compare actual arrivals and mix with the forecast. Track useful throughput, per-instance skew, latency, errors, queues, dependency saturation, autoscaling activities, and remaining failure reserve.

Keep capacity through the full event tail, retry horizon, and queued-work drain. Scale in gradually and respect connection draining, lifecycle hooks, termination grace, and stateful work. A one-time scheduled action does not restore the group's earlier desired, minimum, or maximum values, so pair the event with an explicit restoration action or runbook. Remove obsolete recurring schedules. Record forecast error, cold-start distributions, unused instance-hours, and any hidden constraint for the next event.

Google SRE launch guidance emphasizes that launches can create nonlinear overload and that load tests are essential because behavior near saturation is difficult to predict from first principles.

## Conclusion

Pre-warm from a tested event-specific instance capacity and a forecast uncertainty bound. Schedule backward from measured cold-to-serving time, verify complete dependency and application readiness, and retain reactive scale-out for forecast error. Use a formal gate before launch and a gradual, observable scale-in afterward.

## Official Documentation

- [AWS scheduled scaling for EC2 Auto Scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html)
- [AWS predictive scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-predictive-scaling.html)
- [AWS predictive scaling scheduling buffer](https://docs.aws.amazon.com/autoscaling/ec2/userguide/predictive-scaling-policy-overview.html)
- [AWS EC2 Auto Scaling warm pools](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html)
- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [Google SRE Book: Reliable Product Launches at Scale](https://sre.google/sre-book/reliable-product-launches/)
