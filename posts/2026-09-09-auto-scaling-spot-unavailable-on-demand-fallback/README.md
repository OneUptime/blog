# Why EC2 Auto Scaling Does Not Fall Back from Spot to On-Demand

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EC2 Spot, Auto Scaling, High Availability, Capacity Planning

Description: Understand why mixed instances groups retain their Spot share during shortages and implement an explicit, controlled On-Demand capacity policy.

A mixed instances Auto Scaling group distributes desired capacity according to its purchase policy. A configuration with 20% On-Demand and 80% Spot does not mean "try Spot first, then spend more if necessary." It means the group is expected to fulfill that purchasing mix.

When compatible Spot capacity is unavailable, the group continues trying other eligible Spot pools. It does not silently convert the missing share to On-Demand. This explains how a healthy group configuration can remain below desired capacity while ordinary On-Demand launches are still possible. [AWS mixed group behavior](https://docs.aws.amazon.com/autoscaling/ec2/userguide/mixed-instances-groups-set-up-overview.html).

## Reproduce the Arithmetic Before Changing Anything

Consider an unweighted group with these settings:

```json
{
  "OnDemandBaseCapacity": 4,
  "OnDemandPercentageAboveBaseCapacity": 25,
  "SpotAllocationStrategy": "price-capacity-optimized"
}
```

At desired capacity 20, the first four instances belong to the On-Demand base. Of the remaining 16, four are On-Demand and twelve are Spot. The target mix is therefore eight On-Demand instances and twelve Spot instances.

If only six Spot instances can launch, the group can have eight On-Demand plus six Spot while still wanting twenty total. Increasing `MaxSize` alone does not change that mix. Increasing desired capacity changes the target, but it continues applying the same distribution and can simply increase the unfulfilled Spot requirement.

This example uses whole-instance capacity and values without percentage rounding. Groups with weights require capacity-unit arithmetic and can temporarily exceed targets because instances are indivisible.

## Inspect the Policy and Actual Lifecycle

Use AWS CLI and `jq` to save a reviewable configuration:

```bash
set -euo pipefail

ASG_NAME=queue-workers
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names "$ASG_NAME" \
  --output json > group.json

jq '.AutoScalingGroups[0] | {
  DesiredCapacity, DesiredCapacityType,
  Distribution: .MixedInstancesPolicy.InstancesDistribution,
  Instances: [.Instances[] | {
    InstanceId, LifecycleState,
    HealthStatus, WeightedCapacity
  }]
}' group.json

aws autoscaling describe-scaling-activities \
  --auto-scaling-group-name "$ASG_NAME" \
  --max-items 20 \
  --query 'Activities[].{Time:StartTime,Status:StatusCode,Message:StatusMessage}'
```

Auto Scaling instance records expose group lifecycle and health, but they do not include the EC2 purchase lifecycle field. Read the EC2 records for the same group to identify Spot instances:

```bash
aws ec2 describe-instances \
  --filters "Name=tag:aws:autoscaling:groupName,Values=$ASG_NAME" \
            Name=instance-state-name,Values=pending,running \
  --query 'Reservations[].Instances[].{Id:InstanceId,Market:InstanceLifecycle,State:State.Name}' \
  --output table
```

An EC2 instance with `InstanceLifecycle` equal to `spot` is Spot capacity. A missing Spot lifecycle marker does not prove the application is ready; check `LifecycleState`, health, and your application's own readiness signal separately.

Confirm that launch failures are capacity-related. A wrong AMI architecture, failed lifecycle hook, or broken IAM permission will not be repaired by changing the purchase percentage.

## Choose an Explicit Fallback Model

There are three practical policies to consider:

| Policy | Suitable situation | Main operational cost |
| --- | --- | --- |
| Larger permanent On-Demand baseline | A minimum service rate must always be maintained | Paying for the baseline during quiet periods |
| Temporarily raise the On-Demand percentage | One mixed group needs extra capacity during a shortage | Replacement activity when the mix changes |
| Separate On-Demand overflow group | A scheduler can spread work across independently controlled groups | Coordinating scaling and aggregate capacity |

For a customer-facing service, begin with the baseline needed to satisfy the service objective without Spot. For deadline-driven batch work, a temporary policy can trade extra spend for a smaller completion delay.

On-Demand also has quotas and capacity constraints. If launch-time assurance is required, evaluate appropriate Capacity Reservations rather than treating an On-Demand purchase request as a reservation.

## Apply a Temporary Mix Change with a Saved Rollback

For a standard mixed policy, export its existing configuration and increase the percentage deliberately. The following example changes the share above the base to 100% On-Demand:

```bash
jq '.AutoScalingGroups[0].MixedInstancesPolicy' \
  group.json > mixed-before.json

jq -e 'type == "object" and has("LaunchTemplate")
       and (.InstancesDistribution.DistributionSegments // [] | length == 0)' \
  mixed-before.json >/dev/null

jq '.InstancesDistribution.OnDemandPercentageAboveBaseCapacity = 100' \
  mixed-before.json > mixed-fallback.json

aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name "$ASG_NAME" \
  --mixed-instances-policy file://mixed-fallback.json
```

Changing purchase distribution can gradually replace running instances, with new instances launched before old ones terminate. It is not restricted to filling currently missing slots. Account for replacement overlap, quotas, and application draining before using this as an incident response. [InstancesDistribution update semantics](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_InstancesDistribution.html).

Once the shortage and backlog have recovered, restore the saved policy through the same update command with `mixed-before.json`. Review it first if another operator or deployment changed the group while fallback was active. Blindly restoring stale configuration can overwrite a newer launch template or override list.

## Avoid a Feedback Loop

A fallback controller should use sustained unmet demand and application impact, not one failed launch. For example, require a capacity gap over several observations plus unacceptable queue age before increasing On-Demand capacity. Those thresholds are workload choices, not AWS defaults.

Allow only one controller to own the policy. Record the original distribution, the time and reason for the change, and the permitted spending ceiling. Hold the temporary state long enough for new instances to boot and become useful. Recover toward Spot gradually after a stable window instead of switching purchase modes every minute.

If you use two groups, calculate overflow from usable aggregate capacity. Otherwise, the Spot group can recover while the On-Demand group is still scaling out, creating an unintended surge.

## Do Distribution Segments Change This?

Current Auto Scaling documentation includes `DistributionSegments` with ordered reservation types and optional On-Demand fallback. That feature explicitly excludes Spot as a target capacity type. Its fallback between reservation-backed capacity and On-Demand does not turn a standard Spot percentage into Spot-first fallback. [Distribution Segments documentation](https://docs.aws.amazon.com/autoscaling/ec2/userguide/use-distribution-segments.html).

## Conclusion

Treat the mixed instances policy as a capacity distribution contract. Build a deliberate baseline or overflow policy, preserve its rollback state, and verify recovery through useful capacity. A purchasing change should express an operational decision instead of depending on an implicit fallback that the Spot policy does not provide.

## Official Documentation

- [Mixed group setup and retry behavior](https://docs.aws.amazon.com/autoscaling/ec2/userguide/mixed-instances-groups-set-up-overview.html)
- [InstancesDistribution API](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_InstancesDistribution.html)
- [Distribution Segments and Spot exclusion](https://docs.aws.amazon.com/autoscaling/ec2/userguide/use-distribution-segments.html)
- [Mixed instances groups](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups.html)
