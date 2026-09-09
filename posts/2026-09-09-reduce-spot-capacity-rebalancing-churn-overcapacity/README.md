# How to Reduce Spot Capacity Rebalancing Churn and Overcapacity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EC2 Spot, Auto Scaling, Capacity Planning, Monitoring

Description: Separate expected replacement overlap from avoidable Spot churn, distinguish Auto Scaling from fleet settings, and measure useful capacity during rebalancing.

Capacity Rebalancing can replace a Spot Instance before EC2 reclaims it. That buys recovery time, but it also means more replacement activity and a period when both the old and new instance are running.

Before disabling the feature to reduce your instance count, determine whether the extra capacity is normal overlap, an unhealthy replacement loop, or an independent controller launching duplicate replacements. Those problems have different remedies.

## Identify Which Service Owns the Instances

EC2 Auto Scaling, EC2 Fleet, and Spot Fleet expose different rebalancing controls:

| Manager | Control | Behavior to inspect |
| --- | --- | --- |
| Auto Scaling group | `CapacityRebalance` | Replacement health checks, lifecycle hooks, group sizing |
| EC2 Fleet | `SpotOptions.MaintenanceStrategies.CapacityRebalance` | Replacement strategy and termination delay |
| Spot Fleet | `SpotMaintenanceStrategies.CapacityRebalance` | Replacement strategy and termination delay |

In Auto Scaling, new instances normally launch and pass health checks before old instances are terminated. Auto Scaling can temporarily exceed the group's maximum size by up to 10% of desired capacity to enable replacement. That allowance is not 10% of `MaxSize`, nor is it a general cap covering all possible concurrent replacement and scaling activity. [Auto Scaling rebalancing behavior](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-capacity-rebalancing.html).

A desired capacity of 100 therefore makes ten capacity units the relevant documented rebalancing allowance. With weighted instances, actual instance counts and capacity increments require additional interpretation. Avoid using a raw count of EC2 rows as your only capacity measure.

## Build a Timeline for a Replaced Instance

Read the current Auto Scaling configuration and recent activity:

```bash
ASG_NAME=analytics-workers
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names "$ASG_NAME" \
  --query 'AutoScalingGroups[0].{Rebalance:CapacityRebalance,Desired:DesiredCapacity,Max:MaxSize,Distribution:MixedInstancesPolicy.InstancesDistribution}' \
  --output json

aws autoscaling describe-scaling-activities \
  --auto-scaling-group-name "$ASG_NAME" \
  --max-items 50 \
  --query 'Activities[].{Start:StartTime,End:EndTime,Status:StatusCode,Cause:Cause,Message:StatusMessage}' \
  --output json

aws autoscaling describe-lifecycle-hooks \
  --auto-scaling-group-name "$ASG_NAME"
```

Correlate a recommendation with the replacement launch, readiness, old-instance draining, and final termination. A useful timeline distinguishes these cases:

- A healthy replacement overlaps briefly with a draining worker.
- A replacement repeatedly fails bootstrap or health checks.
- A worker waits until a long lifecycle timeout because completion is never reported.
- A custom event handler raises desired capacity while Auto Scaling also replaces the worker.

For the last case, retain application draining in the handler and remove its duplicate capacity action. One controller should own each desired-capacity decision.

## Fix Avoidable Replacement Loops

Inspect the Spot allocation strategy first. Selecting replacements solely by lowest price can put them back into fragile pools. Use an appropriate capacity-aware strategy and broaden compatible types and zones.

Then inspect startup and readiness. A health check that passes before a worker registers with the scheduler can allow the previous worker to leave too early. A check that always fails because of a missing secret or package produces repeated replacement attempts regardless of Spot availability.

Measure cold-start phases separately: instance launch, image startup, configuration, data download, and registration. Bake stable dependencies into the image when that reduces startup time. Keep slow external work out of the critical path where possible.

Auto Scaling already considers replacement availability when responding to recommendations. It may wait if a new instance would have worse availability, then react when an interruption notice arrives. A recommendation without an immediate replacement is therefore not automatically a stuck controller.

## Bound Application Draining

Inspect lifecycle hooks for unnecessarily long timeouts and missing `CompleteLifecycleAction` calls. Heartbeats can keep a hook alive during valid cleanup, but endlessly extending a broken drain keeps billable overlap around without improving recovery.

Set a measured drain budget and report completion as soon as the application is ready to leave. Coordinate load-balancer deregistration and cleanup because those phases consume the same available interruption window. Lifecycle hooks do not stop EC2 from reclaiming a Spot Instance. [Lifecycle hook considerations](https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html).

Do not shorten the timeout blindly to make the instance-count graph prettier. Verify that jobs can resume or requests can finish under the proposed limit first.

## Inspect Fleet Replacement Strategy Separately

For EC2 Fleet and Spot Fleet, `launch` creates a replacement but leaves the at-risk instance running. Your automation must eventually retire it, or it can remain billable until EC2 interrupts it. This is a common explanation for growing overcapacity.

`launch-before-terminate` adds automated retirement after a configured delay following replacement launch. The delay is 120 to 7,200 seconds, and it does not guarantee the old instance will survive until that delay expires. EC2 can still interrupt it earlier. [Fleet Capacity Rebalancing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-capacity-rebalance.html).

For EC2 Fleet, the relevant configuration excerpt is:

```json
{
  "SpotOptions": {
    "AllocationStrategy": "price-capacity-optimized",
    "MaintenanceStrategies": {
      "CapacityRebalance": {
        "ReplacementStrategy": "launch-before-terminate",
        "TerminationDelay": 180
      }
    }
  }
}
```

This is part of a full `create-fleet` request for a `maintain` fleet, not an Auto Scaling setting. Choose 180 seconds only if your measured lifecycle supports it. Fleet rebalancing settings cannot be changed on a running fleet; changing them requires a planned replacement fleet and controlled migration of work.

## Measure Churn Against Service Value

Track replacements per healthy worker-hour, minutes of old/new overlap, failed replacement launches, bootstrap failures, and time below useful capacity. Separate EC2 reclamations from proactive replacements; rebalancing can increase replacements without increasing EC2's underlying interruption rate.

Estimate overlap cost using actual instance runtime and applicable prices. Compare that cost with lost work, backlog growth, and request failures avoided. For a short batch job, proactive replacement might cost more than simply retrying later; for an interactive service, earlier readiness can be valuable.

Do not repeatedly lower desired capacity to counter replacement overlap. Scaling in can remove useful workers just as other workers are draining and can interact poorly with target-tracking policies.

## Conclusion

Keep rebalancing when its recovery benefit justifies the overlap, and remove avoidable churn by fixing allocation, bootstrap, lifecycle completion, and duplicate controllers. Use the controls for the actual fleet manager and assess the result through useful capacity and completed work.

## Official Documentation

- [Auto Scaling Capacity Rebalancing](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-capacity-rebalancing.html)
- [EC2 Fleet and Spot Fleet rebalancing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-capacity-rebalance.html)
- [Auto Scaling lifecycle hooks](https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html)
- [Create EC2 Fleet CLI](https://docs.aws.amazon.com/cli/latest/reference/ec2/create-fleet.html)
