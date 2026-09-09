# How to Diversify Spot Fleet Without Unnecessary Overprovisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Spot Fleet, EC2 Spot, Capacity Planning, Cost Optimization

Description: Use compatible instance pools and capacity weights in Spot Fleet, understand rounding, and measure delivered capacity before changing fleet targets.

A fleet with many eligible instance types does not need one instance of every type. Diversification gives the allocator more places to find capacity. Target capacity determines how much work the fleet should support, and weights explain how different instance sizes contribute.

The main overprovisioning mistake is adding larger instances while leaving every instance with a weight of one. A target of 20 then means 20 instances, whether the allocator chooses small workers or machines several times larger.

This guide uses the actual Spot Fleet API for operators maintaining existing fleets. AWS discourages new `RequestSpotFleet` usage because it is a legacy API; evaluate EC2 Auto Scaling or EC2 Fleet for a new deployment. Do not paste Spot Fleet configuration directly into `create-fleet`. [Spot Fleet command reference](https://docs.aws.amazon.com/cli/latest/reference/ec2/request-spot-fleet.html).

## Define a Useful Unit of Capacity

Suppose a batch scheduler assigns one independent CPU-bound task per vCPU. For a first approximation, use vCPUs as capacity units:

| Instance type | Example weight | Meaning |
| --- | --- | --- |
| `c6i.large` | 2 | Two vCPU units |
| `c6a.large` | 2 | Two vCPU units |
| `c6i.xlarge` | 4 | Four vCPU units |
| `c6a.xlarge` | 4 | Four vCPU units |

Confirm the hardware characteristics and benchmark your workload. A memory-bound job may need memory-based weights instead. A license-limited workload may need a different accounting model altogether.

Weights are accounting values, not CPU limits. The application or scheduler must still assign work appropriately. A four-unit instance that runs a single worker process can remain mostly idle even though the fleet's capacity total looks correct.

## Expand Only Across Compatible Pools

Choose families with the architecture, instruction set, memory, network bandwidth, and storage behavior the application requires. An x86 image cannot simply boot on a Graviton type. A workload depending on local NVMe storage needs alternatives with appropriate storage, not any cheaper CPU instance.

Add subnets in multiple Availability Zones. Check that every subnet has the required routing, endpoints, security group connectivity, and free addresses. Multiple subnets in one zone improve subnet options but do not create independent instance-type/zone pools.

For a four-type, two-zone configuration, the theoretical pool count is eight. Actual eligibility can be smaller if a type is not offered in a zone. Check offerings before treating the matrix as available:

```bash
aws ec2 describe-instance-type-offerings \
  --region us-east-1 \
  --location-type availability-zone \
  --filters Name=instance-type,Values=c6i.large,c6a.large,c6i.xlarge,c6a.xlarge \
  --query 'InstanceTypeOfferings[].{Type:InstanceType,Zone:Location}' \
  --output table
```

Offerings describe where a type is supported. They do not establish current spare Spot capacity.

## Build a Weighted Spot Fleet Request

The following JSON is the configuration object accepted by `--spot-fleet-request-config`. Replace the IAM role, launch template, version, and subnet IDs with tested resources in one Region. The launch template must supply a compatible AMI and network/security settings. It should not hard-code a conflicting subnet or purchasing option.

```json
{
  "IamFleetRole": "arn:aws:iam::123456789012:role/aws-ec2-spot-fleet-tagging-role",
  "Type": "maintain",
  "TargetCapacity": 40,
  "AllocationStrategy": "priceCapacityOptimized",
  "InstanceInterruptionBehavior": "terminate",
  "LaunchTemplateConfigs": [
    {
      "LaunchTemplateSpecification": {
        "LaunchTemplateId": "lt-0123456789abcdef0",
        "Version": "3"
      },
      "Overrides": [
        {"InstanceType": "c6i.large", "SubnetId": "subnet-0123456789abcdef0", "WeightedCapacity": 2},
        {"InstanceType": "c6a.large", "SubnetId": "subnet-0123456789abcdef0", "WeightedCapacity": 2},
        {"InstanceType": "c6i.xlarge", "SubnetId": "subnet-0123456789abcdef0", "WeightedCapacity": 4},
        {"InstanceType": "c6a.xlarge", "SubnetId": "subnet-0123456789abcdef0", "WeightedCapacity": 4},
        {"InstanceType": "c6i.large", "SubnetId": "subnet-0fedcba9876543210", "WeightedCapacity": 2},
        {"InstanceType": "c6a.large", "SubnetId": "subnet-0fedcba9876543210", "WeightedCapacity": 2},
        {"InstanceType": "c6i.xlarge", "SubnetId": "subnet-0fedcba9876543210", "WeightedCapacity": 4},
        {"InstanceType": "c6a.xlarge", "SubnetId": "subnet-0fedcba9876543210", "WeightedCapacity": 4}
      ]
    }
  ]
}
```

A 40-unit target can be served by 20 two-unit instances, 10 four-unit instances, or a mixture. The eight overrides are eligible placements, not eight independent targets. Save this as `spot-fleet-config.json`; submitting it launches billable capacity:

```bash
aws ec2 request-spot-fleet \
  --region us-east-1 \
  --spot-fleet-request-config file://spot-fleet-config.json
```

The [fleet weighting documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-instance-weighting.html) explains that fleet fulfillment rounds up when whole instances are necessary. A target of 41 units cannot be matched exactly by weights of two and four. Do not advertise exact sizing when the allowed instance increments make it impossible.

## Bound Waste Without Shrinking the Pool Unnecessarily

Keep the largest allowed instance reasonably small compared with normal target capacity. If your group commonly needs 10 units, admitting a 64-unit instance can produce a poor fit. Prefer sizes that fit the scheduler's useful concurrency, then broaden across families and zones before adding much larger sizes.

Avoid setting one independent fleet per family solely to force diversity. Ten fleets each with a minimum can accumulate unused capacity when the workload shrinks. A single weighted target lets the allocator choose an appropriate mixture.

`priceCapacityOptimized` does not promise equal occupancy of every eligible pool. The separate `diversified` strategy has different placement behavior. Decide whether the requirement is broad eligibility or an actual placement distribution, and verify the resulting fleet rather than inferring it from the override list.

## Validate Delivered Work and Temporary Overlap

After fulfillment, inspect the fleet request and active instances:

```bash
FLEET_ID=sfr-01234567-89ab-cdef-0123-456789abcdef
aws ec2 describe-spot-fleet-requests \
  --region us-east-1 \
  --spot-fleet-request-ids "$FLEET_ID"
aws ec2 describe-spot-fleet-instances \
  --region us-east-1 \
  --spot-fleet-request-id "$FLEET_ID"
```

Sum the weights of active instances and compare them with the target. Separately compare that sum with registered, healthy worker capacity. A launched instance still downloading its application contributes to AWS capacity before it contributes useful work.

If Capacity Rebalancing is enabled, old and replacement instances can overlap. That is a separate source of temporary capacity beyond rounding. In particular, the `launch` replacement strategy leaves old instances running until your automation or EC2 interruption removes them. Do not lower the target repeatedly to chase a temporary overlap; investigate the replacement lifecycle first.

## Conclusion

Use one clear capacity unit, explicit weights, compatible families, and multiple zones. Bound the size of individual allocations and inspect real worker throughput. Diversification improves the allocator's choices while weighting prevents those choices from silently changing the intended amount of compute.

## Official Documentation

- [Spot Fleet request CLI](https://docs.aws.amazon.com/cli/latest/reference/ec2/request-spot-fleet.html)
- [Fleet instance weighting](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-instance-weighting.html)
- [Fleet allocation strategies](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-allocation-strategy.html)
- [Fleet Capacity Rebalancing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-capacity-rebalance.html)
