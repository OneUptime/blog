# How to Set an On-Demand Baseline in Mixed EC2 Auto Scaling Groups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Auto Scaling, EC2 Spot, High Availability, Capacity Planning

Description: Calculate the On-Demand base and percentage above it, align capacity units, and verify a reliable mixed Auto Scaling group baseline.

The On-Demand base in a mixed instances group is a fixed portion of desired capacity. The On-Demand percentage applies only above that base. Confusing the two can leave a service with less dependable capacity than expected or with almost no Spot savings at its normal operating size.

Begin with the amount of work the service must handle without Spot. Express that requirement in the same capacity units used by the Auto Scaling group, then choose the additional purchasing mix separately.

## Calculate the Distribution

For an unweighted group, define desired instances as `D`, base instances as `B`, and On-Demand percentage above the base as `P`. The conceptual calculation is:

```text
base in use = min(D, B)
capacity above base = max(D - B, 0)
On-Demand target = base in use + On-Demand share of capacity above base
Spot target = D - On-Demand target
```

For whole instances, Auto Scaling rounds fractional distribution results in favor of On-Demand. Weighted groups can have additional differences from their theoretical targets because a launched instance contributes its full weight. [Mixed group scaling behavior](https://docs.aws.amazon.com/autoscaling/ec2/userguide/mixed-instances-groups-set-up-overview.html).

With `B=4` and `P=25`, these examples avoid fractions:

| Desired capacity | Base used | Additional On-Demand | Total On-Demand | Spot |
| --- | --- | --- | --- | --- |
| 2 | 2 | 0 | 2 | 0 |
| 4 | 4 | 0 | 4 | 0 |
| 8 | 4 | 1 | 5 | 3 |
| 12 | 4 | 2 | 6 | 6 |
| 20 | 4 | 4 | 8 | 12 |

The base is not an independent minimum group size. If desired capacity is two, a base of four does not force four instances to exist. Use an appropriate `MinSize` as well when four instances are the service's operational floor.

## Design the Baseline from Application Measurements

Suppose four workers can keep queue age below its objective during ordinary demand, and additional Spot workers shorten peak backlogs. A base of four with a minimum group size of four is a reasonable starting configuration for testing.

That statement still depends on worker performance and failure behavior. Four instances in one zone do not provide the same resilience as a workload that can continue across multiple zones. A four-worker baseline that saturates on a typical peak leaves no room for deployment or failure recovery.

Measure per-instance throughput, cold-start time, and the number of workers needed after a zone becomes unavailable. Account for databases, licenses, and other downstream bottlenecks before raising the compute baseline. On-Demand capacity removes Spot reclamation from that portion of the fleet, but it does not eliminate hardware or application failures.

## Create a Reviewable Mixed Policy

This example uses equal-size x86 instances and instance-count capacity. Replace the launch template, its fixed version, and subnet identifiers with your own tested values. Save this object as `mixed-baseline.json`:

```json
{
  "LaunchTemplate": {
    "LaunchTemplateSpecification": {
      "LaunchTemplateId": "lt-0123456789abcdef0",
      "Version": "5"
    },
    "Overrides": [
      {"InstanceType": "m6i.large"},
      {"InstanceType": "m6a.large"},
      {"InstanceType": "m5.large"},
      {"InstanceType": "m5a.large"}
    ]
  },
  "InstancesDistribution": {
    "OnDemandAllocationStrategy": "lowest-price",
    "OnDemandBaseCapacity": 4,
    "OnDemandPercentageAboveBaseCapacity": 25,
    "SpotAllocationStrategy": "price-capacity-optimized"
  }
}
```

The four types keep the example readable. Expand the compatible set based on workload testing and regional offerings. The launch template should contain the AMI and application settings while leaving the purchase distribution to the group.

The following command creates billable capacity. It assumes two subnets in different Availability Zones with compatible connectivity:

```bash
aws autoscaling create-auto-scaling-group \
  --region us-east-1 \
  --auto-scaling-group-name baseline-workers \
  --min-size 4 \
  --max-size 20 \
  --desired-capacity 12 \
  --vpc-zone-identifier subnet-0123456789abcdef0,subnet-0fedcba9876543210 \
  --mixed-instances-policy file://mixed-baseline.json
```

At desired capacity twelve, the intended purchasing mix is six On-Demand and six Spot. It is not three On-Demand and nine Spot: that calculation would incorrectly apply 25% to the entire group.

## Keep Units Consistent When Sizes Differ

If your override weights represent vCPUs, every size parameter and the base must use the corresponding units. A desired capacity of 48 vCPU units with an On-Demand base of 16 means sixteen vCPU units in the base, not sixteen instances.

For manually specified instance types, assign an explicit `WeightedCapacity` to each override when using weights. Do not weight one type and leave the others implicitly unweighted. Alternatively, attribute-based selection can use `DesiredCapacityType` for vCPU or memory capacity, subject to the documented configuration requirements. [Instance weighting guide](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups-instance-weighting.html).

A capacity unit should also match your scaling signal. "Messages per instance" can be misleading when some instances provide four times the processing capacity of others. Calculate backlog relative to measured processing capacity or use a metric suited to the application.

## Verify the Mix and Its Behavior Under Change

Read the group and its instances:

```bash
aws autoscaling describe-auto-scaling-groups \
  --region us-east-1 \
  --auto-scaling-group-names baseline-workers \
  --query 'AutoScalingGroups[0].{Desired:DesiredCapacity,Distribution:MixedInstancesPolicy.InstancesDistribution,Instances:Instances[].{Id:InstanceId,State:LifecycleState,Weight:WeightedCapacity}}' \
  --output json
```

The Auto Scaling response does not include the EC2 purchase lifecycle. Inspect EC2 records separately and correlate them by instance ID:

```bash
aws ec2 describe-instances \
  --region us-east-1 \
  --filters Name=tag:aws:autoscaling:groupName,Values=baseline-workers \
            Name=instance-state-name,Values=pending,running \
  --query 'Reservations[].Instances[].{Id:InstanceId,Market:InstanceLifecycle,Type:InstanceType}' \
  --output table
```

Count Spot-marked instances and inspect the remaining purchase types. Wait for stable fulfillment before comparing the observed mix with the table. Pending instances, weighting, replacements, and a capacity shortage can temporarily make the numbers differ.

Changing the base or percentage on an existing group can replace instances gradually. It is a live capacity change, so check drain behavior, service health, and quota headroom. Do not mistake the setting update for a purely future-only preference.

During a controlled test, reduce desired capacity to the minimum and confirm the baseline still processes expected traffic. Then scale above the base and verify additional capacity follows the intended mix. Finally, test loss of Spot workers and measure application recovery. A correct JSON policy does not itself demonstrate the service objective.

## Conclusion

Choose the On-Demand base from the required service floor, enforce that floor through group sizing, and apply the percentage only to additional capacity. Keep weights and scaling metrics consistent, then verify the purchasing mix and useful throughput at both minimum and peak sizes.

## Official Documentation

- [Mixed group scaling behavior](https://docs.aws.amazon.com/autoscaling/ec2/userguide/mixed-instances-groups-set-up-overview.html)
- [InstancesDistribution parameters](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_InstancesDistribution.html)
- [Auto Scaling instance weighting](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups-instance-weighting.html)
- [Create Auto Scaling group CLI](https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html)
