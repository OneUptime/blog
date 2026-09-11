# How to Autoscale Buildkite Agents Without Long Queue Waits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, AWS, Autoscaling, DevOps

Description: Tune warm capacity, startup time, queue targeting, and Elastic CI Stack scaling settings to reduce self-hosted Buildkite job delays.

---

Autoscaling from zero minimizes idle machines, but the first queued job still has to wait for provisioning, bootstrapping, and agent registration. If those steps take several minutes, changing the maximum pool size alone cannot deliver a short queue wait.

A useful autoscaling design starts with a queue-delay target and measured startup times. Keep enough ready capacity for latency-sensitive arrivals, and use scaling for larger bursts. The following approach uses Buildkite's Elastic CI Stack for AWS as a concrete example, while the measurements apply to other self-hosted platforms too.

## Measure the entire path to execution

Record four timestamps for a representative job: when it becomes eligible for an agent, when infrastructure starts launching, when the agent connects, and when the job begins. Separately record checkout and dependency installation after the job starts.

These intervals explain different problems. A long interval before launch suggests scaler delay or a capacity ceiling. A long boot-to-registration interval suggests image initialization, network access, or token configuration. A long checkout does not belong to queue wait, although it still hurts the developer's feedback time.

Measure percentiles during both quiet periods and bursts. An average can look good while the first build of each morning waits for a cold pool. For scheduled workloads, include the usual schedule window in the sample.

## Start with a measured warm baseline

The [Elastic CI Stack configuration reference](https://buildkite.com/docs/agent/self-hosted/aws/elastic-ci-stack/ec2-linux-and-windows/configuration-parameters) provides these relevant controls:

| Setting | Operational purpose |
| --- | --- |
| `MinSize` | Minimum number of instances |
| `MaxSize` | Maximum number of instances |
| `InstanceBuffer` | Idle instance capacity to retain |
| `AgentsPerInstance` | Agent processes started per instance |
| `ScaleOutCooldownPeriod` | Delay between scale-out events |
| `ScaleInIdlePeriod` | Time all agents must be idle before instance termination |

An initial values sketch for a small queue might be:

```yaml
MinSize: 2
MaxSize: 12
InstanceBuffer: 1
AgentsPerInstance: 1
ScaleOutFactor: 1.0
ScaleOutCooldownPeriod: 60
ScaleInIdlePeriod: 900
```

These are illustrative parameter values, not a complete CloudFormation template or a sizing recommendation. Apply equivalent values through the versioned stack configuration you already manage. Review the installed stack release's parameter descriptions before changing them.

A minimum and an idle buffer express different goals. The minimum prevents the fleet from shrinking below a baseline; the buffer aims to leave headroom when work is consuming the fleet. Decide whether you need one or both instead of increasing them together without a measurement.

## Estimate demand in runnable slots

Suppose a normal arrival burst contains six jobs and your boot-to-ready time is three minutes. With two idle agents, two jobs can start immediately while the other four wait for existing work or new capacity. A large `MaxSize` does not remove that first three-minute delay.

If the queue-delay target is shorter than the startup time, pre-existing capacity must be sufficient to start the expected initial burst within that target, allowing for agents that finish jobs and become available again. For larger bursts, accept a defined amount of queueing or pre-scale before a predictable event.

Do not multiply instance count by `AgentsPerInstance` and assume that is useful throughput. Four CPU-heavy jobs on a small host may take much longer than one. Benchmark your actual mix, including memory peaks and container disk usage, before packing several agents onto a machine.

## Reduce startup work

Bake stable toolchains into a maintained agent image. Keep boot scripts focused on registration and environment-specific configuration instead of downloading a complete toolchain on every launch.

Move application dependency work into measured caches where appropriate, but distinguish a cache miss inside a job from an agent that is not ready. A startup script that waits for a registry or secret backend can delay every job in a newly scaled fleet.

Track failed launches too. A scaler can request capacity correctly while EC2 cannot satisfy the instance selection, a subnet runs out of addresses, or the agent fails to authenticate. Monitor connected agents alongside requested and running instance counts.

## Avoid scale-in churn

An idle window shorter than the usual gap between jobs repeatedly destroys useful warm machines. Increase `ScaleInIdlePeriod` when your measurements show frequent termination followed by immediate replacement.

With multiple agents on one instance, the stack's idle termination policy considers all agents on that instance. One long-running job can keep the host alive. Conversely, a crashed agent process reduces active capacity without necessarily making the whole host unhealthy.

Use graceful draining and the stack's supported termination behavior. Treat scale-in protection and self-termination as part of the lifecycle; changing an Auto Scaling Group policy independently can interrupt work the stack expected to finish.

## Keep routing aligned with capacity

A queue must have agents that advertise the tags requested by its jobs. Scaling a generic test fleet does not help a release job requiring a release queue and a special architecture.

Use separate capacity pools when trust or hardware requires them, then set latency targets per pool. Combining compatible jobs into fewer queues can reduce stranded idle capacity, but do not combine workloads that need different security boundaries merely to improve utilization.

## Verify with controlled bursts

Submit a small burst, a larger burst, and a burst after the idle window. Record queue delay, registration delay, failed launches, completed jobs per minute, and idle instance time. Repeat after each material scaling change.

A successful configuration should meet the chosen delay target without continuous oscillation or resource contention. If the pool reaches `MaxSize`, decide whether the remaining queue represents an acceptable cost limit or a capacity shortfall. Raising the ceiling should follow that decision.

## Conclusion

Short queue waits require ready capacity when startup is slower than the target. Tune the warm baseline, startup path, scaling response, and idle termination together, using actual runnable capacity as the measure.

## Official Documentation

- [Elastic CI Stack parameters](https://buildkite.com/docs/agent/self-hosted/aws/elastic-ci-stack/ec2-linux-and-windows/configuration-parameters)
- [Queue targeting](https://buildkite.com/docs/agent/queues)
- [Agent configuration](https://buildkite.com/docs/agent/self-hosted/configure)
