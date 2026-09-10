# How to Calculate Real Spot Savings After Restarts and Transfer Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Spot, Cost Optimization, FinOps, EC2

Description: Compare Spot and On-Demand by cost per successful workload, including replayed work, cold starts, storage, transfer, fallback, and operational effort.

---

An hourly Spot discount does not tell you how much a workload saves. A cheaper instance can repeat failed work, download the same dataset several times, and occupy a larger fleet while retries catch up. The right comparison is total cost for the same completed workload at the required completion time.

This walkthrough builds an illustrative calculation. All example rates and quantities are fictional inputs, not current AWS prices. Replace them with your Region, operating system, instance mix, actual bill, and measured application throughput.

## Define a comparable unit of work

Choose an output that users care about: one completed simulation, one validated build, one million processed records, or one training run meeting the same quality threshold. Count only successful outputs with the required correctness checks.

For heterogeneous machines, normalize useful work using benchmarks. One vCPU-hour on two processor generations does not necessarily produce equal throughput. Include startup, data loading, and checkpoint time in measurements instead of using only the application's main compute loop.

Specify the completion-time requirement as well. A fleet that saves money but finishes a daily report after the business deadline is not delivering the same service.

## Separate useful hours from overhead

For each attempt, record:

| Measurement | Why it matters |
| --- | --- |
| Useful work committed | The denominator for successful output |
| Work replayed after loss | Compute consumed without additional final output |
| Startup and data reload | Often paid again on every replacement |
| Checkpoint work | CPU and I/O spent to reduce future replay |
| Idle capacity | Billed workers waiting for tasks or draining |
| On-Demand fallback | Capacity purchased when Spot is unsuitable or unavailable |

Use mutually exclusive categories. If a checkpoint upload runs concurrently with useful computation, do not count the same wall-clock second twice. For actual billing, allocate the instance's cost over that interval; the categories explain the cost rather than creating additional billed time.

AWS has different interruption billing rules based on who interrupts the instance and the operating system. Do not assume every interrupted partial hour is free. Reconcile against the [official interruption billing table](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/billing-for-interrupted-spot-instances.html) and actual usage records.

## Add costs outside instance runtime

Use the following accounting model:

```text
Spot strategy cost = billed Spot compute
                   + billed On-Demand fallback
                   + incremental storage and snapshots
                   + incremental requests and data transfer
                   + incremental operational effort

Savings fraction = 1 - Spot strategy cost / comparable baseline cost
```

Only exclude common costs when they are truly unchanged between strategies. For example, the same final output bucket can cancel out, while additional checkpoint objects and retained interrupted-instance volumes do not.

Trace the data path rather than applying a generic network surcharge. Cross-zone traffic, cross-Region copies, internet egress, NAT processing, and S3 requests have distinct charging rules. Same-Region EC2/S3 transfer treatment does not imply that a NAT gateway in the path is free. Check [EC2 data transfer pricing](https://aws.amazon.com/ec2/pricing/on-demand/), [S3 pricing](https://aws.amazon.com/s3/pricing/), and [VPC pricing](https://aws.amazon.com/vpc/pricing/).

Stopped or hibernated workers may keep EBS volumes allocated. Include those volumes until they are deleted or reused, not only while their instances are running.

## Work through an example

Assume the baseline needs 1,000 equivalent useful instance-hours at an effective On-Demand rate of $0.12 per hour. The comparable baseline compute cost is $120, and unchanged common costs are excluded from both sides.

The Spot strategy finishes the same workload with:

| Category | Hours or cost |
| --- | ---: |
| Useful work on Spot | 920 hours |
| Useful work on On-Demand fallback | 80 hours |
| Replayed Spot work | 120 hours |
| Spot startup and reload | 40 hours |
| Spot checkpoint overhead | 20 hours |
| Spot idle/drain capacity | 100 hours |
| Incremental storage | $8 |
| Incremental transfer | $12 |
| Incremental requests | $2 |
| Allocated extra operational effort | $15 |

At a fictional Spot rate of $0.036 per hour, billed Spot time is 1,200 hours and costs $43.20. Fallback costs $9.60. The total is $89.80, which saves about 25.2% against $120. The nominal rate discount was 70%, but it did not become a 70% workload saving.

Reproduce the arithmetic with this standalone Python program:

```python
baseline_hours = 1000
on_demand_rate = 0.12
spot_rate = 0.036
spot_hours = 920 + 120 + 40 + 20 + 100
fallback_hours = 80
other_cost = 8 + 12 + 2 + 15

baseline = baseline_hours * on_demand_rate
compute = spot_hours * spot_rate + fallback_hours * on_demand_rate
total = compute + other_cost
print(f"Baseline: ${baseline:.2f}")
print(f"Spot strategy: ${total:.2f}")
print(f"Savings: {100 * (1 - total / baseline):.1f}%")

remaining_margin = baseline - total
print(f"Additional overhead before break-even: ${remaining_margin:.2f}")
```

Operational effort is an internal allocation, not an AWS invoice line. Report both infrastructure-only cost and the fully allocated result if stakeholders need to distinguish them.

## Evaluate interruption sensitivity

Repeat the model for low, typical, and adverse interruption periods. Use observed attempt distributions instead of treating each interruption as an independent event with a fixed probability. Correlated loss can create simultaneous retries and temporary shortages.

Checkpointing has a measurable tradeoff. Frequent checkpoints add request and I/O cost; infrequent checkpoints increase replay. Vary the interval in staging and compare cost per successful output, p95 completion time, and bytes transferred per output.

Include cold-cache runs and replacement queues. A retry rate measured when the fleet has spare capacity can understate completion delay during a busy period.

## Compare against the real alternative

Use the effective marginal baseline for the decision. If existing commitments already cover On-Demand usage, moving that work to Spot might leave the commitment unused while adding a Spot bill. Conversely, a new burst beyond commitment coverage can have a different baseline.

AWS Savings Plans do not apply to Spot Instances. Keep the discount accounting separate and verify where freed committed usage will go. [Savings Plans pricing concepts](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)

Refresh the calculation after changes to job duration, dataset location, instance architecture, checkpoint frequency, or interruption behavior. A rate comparison can stay attractive while the underlying workload economics change.

## Conclusion

Measure cost per successful output under the required completion deadline. Include repeated work and the complete data path, compare against the actual On-Demand alternative, and use adverse interruption scenarios before declaring the saving durable.

## Official Documentation

- [Interrupted Spot billing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/billing-for-interrupted-spot-instances.html)
- [EC2 pricing and transfer](https://aws.amazon.com/ec2/pricing/on-demand/)
- [S3 pricing](https://aws.amazon.com/s3/pricing/)
- [VPC pricing](https://aws.amazon.com/vpc/pricing/)
- [AWS Savings Plans](https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html)
