# How to Choose Capacity or Price-Capacity Optimized EC2 Spot Allocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EC2 Spot, Auto Scaling, Cost Optimization, Capacity Planning

Description: Compare EC2 Spot allocation strategies, apply the correct API values, and evaluate completed-work cost without confusing capacity selection with guarantees.

A Spot allocation strategy chooses which eligible capacity pools receive your launch requests. The right comparison is the cost of completing your workload, including retries and checkpoint overhead. The lowest instance bill can still produce the most expensive batch run.

AWS recommends `price-capacity-optimized` as a starting point for EC2 Auto Scaling. `capacity-optimized` remains useful when interruptions are especially expensive or eligible instance types have similar prices. Both strategies need a sufficiently broad set of compatible instance types and Availability Zones. [AWS allocation strategy guidance](https://docs.aws.amazon.com/autoscaling/ec2/userguide/allocation-strategies.html).

## Understand the Decision Each Strategy Makes

A Spot capacity pool is an instance type in an Availability Zone. Adding `m6i.large` in a second zone gives the allocator another pool; adding a second subnet in the same zone does not create another instance-type/zone pool.

| Strategy | Selection emphasis | Workload question |
| --- | --- | --- |
| `price-capacity-optimized` | Price among pools with strong capacity availability | Can the application cheaply retry or resume interrupted work? |
| `capacity-optimized` | Available capacity | Does even a modest change in interruption exposure outweigh instance-price differences? |

Neither strategy reserves capacity. Neither promises a minimum lifetime. An instance that looked attractive at launch can receive an interruption notice later because supply and demand changed.

For a worker that checkpoints every minute and resumes in seconds, compare price-capacity optimization first. For an expensive, tightly coupled computation that must restart a large stage after a worker loss, test capacity optimization while improving checkpoint boundaries. The choice is a workload decision rather than a permanent classification of instance families.

## Use the Correct API Spelling

These AWS APIs have similar concepts but different JSON structures and enum values:

| Service | Property | Capacity option | Price and capacity option |
| --- | --- | --- | --- |
| EC2 Auto Scaling | `InstancesDistribution.SpotAllocationStrategy` | `capacity-optimized` | `price-capacity-optimized` |
| EC2 Fleet | `SpotOptions.AllocationStrategy` | `capacity-optimized` | `price-capacity-optimized` |
| Spot Fleet | `AllocationStrategy` | `capacityOptimized` | `priceCapacityOptimized` |

Spot Fleet is a legacy API. Existing fleets can still need maintenance, but AWS discourages new use of `RequestSpotFleet`; evaluate EC2 Auto Scaling or EC2 Fleet for new implementations. The [Spot Fleet CLI reference](https://docs.aws.amazon.com/cli/latest/reference/ec2/request-spot-fleet.html) documents the camel-case values.

## Change One Auto Scaling Setting Deliberately

The following example updates an existing standard mixed instances group. It requires AWS CLI, `jq`, and permissions to describe and update that group. Set your own Region and group name. Export the existing policy so launch templates, overrides, and purchase percentages remain visible during review:

```bash
set -euo pipefail

export AWS_REGION=us-east-1
ASG_NAME=render-workers

aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names "$ASG_NAME" \
  --query 'AutoScalingGroups[0].MixedInstancesPolicy' \
  --output json > mixed-policy-before.json

jq -e 'type == "object" and has("LaunchTemplate")' \
  mixed-policy-before.json >/dev/null

jq '.InstancesDistribution.SpotAllocationStrategy = "price-capacity-optimized"
    | del(.InstancesDistribution.SpotInstancePools)' \
  mixed-policy-before.json > mixed-policy-after.json

aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name "$ASG_NAME" \
  --mixed-instances-policy file://mixed-policy-after.json
```

`SpotInstancePools` applies to the `lowest-price` strategy, so remove it when changing strategies. Preserve an intentionally configured maximum price during this experiment so you change one meaningful variable. Review restrictive price caps separately.

Changing this allocation setting affects subsequent launches. It does not immediately replace every running instance. Verify the setting, then observe ordinary scaling or a controlled scale-out in a test group. The [InstancesDistribution API](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_InstancesDistribution.html) distinguishes these changes from purchase-percentage updates that can replace instances.

```bash
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names "$ASG_NAME" \
  --query 'AutoScalingGroups[0].MixedInstancesPolicy.InstancesDistribution' \
  --output json
```

Do not judge the change by the composition of old instances immediately after the update. Record launch times and compare instances actually selected under each configuration.

## Compare Completed Work Instead of Only Hourly Prices

Run comparable workloads with the same eligible instance types, zones, image, checkpoint interval, and target capacity. Keep each strategy's measurements separate. Record:

- Requested capacity and time spent below usable capacity.
- Successful jobs or output units and their completion latency.
- Interrupted jobs, checkpoint time, and repeated computation.
- EC2 runtime, storage, and data-transfer charges attributable to the run.

Use this calculation for the comparison:

```text
effective cost per completed job =
  total attributable run cost / successfully completed jobs
```

For example, a hypothetical run costing $80 for 1,000 completed jobs has an effective compute cost of $0.08 per job. A $72 run that finishes only 800 jobs costs $0.09 per completed job. These are illustrative workload calculations, not AWS prices or predicted savings.

Repeat across meaningful demand windows before deciding. Two groups competing for identical pools at the same instant can influence one another, while runs on different days encounter different capacity conditions. Document that uncertainty instead of treating a small sample as a universal winner.

## Keep Flexibility and Recovery in the Design

An allocator cannot use a compatible family you omitted. Benchmark additional CPU vendors, generations, and sizes, then include those that satisfy application requirements. If instance sizes differ, account for their contribution with weights rather than assuming every worker has equal throughput.

Retain interruption handling regardless of which strategy wins. Store durable checkpoints away from the instance, make result publication idempotent, and measure time to useful service after replacement. An allocation change improves selection; application recovery controls the consequences of losing a selected instance.

## Conclusion

Start with price-capacity optimization, evaluate capacity optimization when interruption cost justifies it, and preserve the API-specific spelling. Validate success through newly launched capacity and completed-work economics, with the same workload requirements in both comparisons.

## Official Documentation

- [Auto Scaling allocation strategies](https://docs.aws.amazon.com/autoscaling/ec2/userguide/allocation-strategies.html)
- [InstancesDistribution API](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_InstancesDistribution.html)
- [EC2 Fleet allocation strategies](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-allocation-strategy.html)
- [Spot Fleet CLI reference](https://docs.aws.amazon.com/cli/latest/reference/ec2/request-spot-fleet.html)
