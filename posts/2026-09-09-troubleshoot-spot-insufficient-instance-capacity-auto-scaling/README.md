# How to Diagnose Spot Capacity Launch Failures in EC2 Auto Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EC2 Spot, Auto Scaling, Troubleshooting, Capacity Planning

Description: Separate genuine Spot shortages from quotas, subnet limits, and launch template failures when an Auto Scaling group cannot reach desired capacity.

An Auto Scaling group below desired capacity does not automatically have a Spot supply problem. It might have no usable subnet addresses, a broken launch template, an exhausted quota, suspended launches, or instances that launch successfully and then fail health checks.

Start with the failed scaling activity. An `InsufficientInstanceCapacity` error is evidence about a particular launch attempt under particular constraints. It is not a statement that all EC2 capacity in the Region is exhausted.

## Capture the Group and Its Recent Activities

Use read-only commands before modifying the desired count or instance list. Replace the Region and group name:

```bash
export AWS_REGION=us-east-1
ASG_NAME=batch-workers

aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names "$ASG_NAME" \
  --output json > asg-state.json

aws autoscaling describe-scaling-activities \
  --auto-scaling-group-name "$ASG_NAME" \
  --max-items 30 \
  --query '{Activities:Activities[].{Time:StartTime,Status:StatusCode,Message:StatusMessage,Cause:Cause,Details:Details},NextToken:NextToken}' \
  --output json > scaling-activities.json
```

Read the activity's `StatusMessage`, `Cause`, and `Details` together. Repeated insufficient-capacity messages across eligible types and zones point toward a supply constraint. Authentication errors, missing AMIs, invalid security groups, or quota messages lead to different remedies. AWS documents these failure classes in its [launch failure troubleshooting guide](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ts-as-instancelaunchfailure.html).

The command deliberately limits the first review to 30 activities. If the incident began earlier, retrieve additional pages by passing the returned `NextToken` to `--starting-token`, or remove the client-side maximum. A busy group can generate many retries in a short interval.

## Check Whether Launching Is Actually the Missing Step

Inspect the group without assuming all instance counts represent healthy service:

```bash
jq '.AutoScalingGroups[0] | {
  DesiredCapacity, MinSize, MaxSize, DesiredCapacityType,
  VPCZoneIdentifier, SuspendedProcesses,
  MixedInstancesPolicy,
  Instances: [.Instances[] | {
    InstanceId, InstanceType, AvailabilityZone,
    LifecycleState, HealthStatus, WeightedCapacity
  }]
}' asg-state.json
```

A suspended `Launch` process prevents launches even when capacity is available. Instances stuck in `Pending:Wait` suggest a lifecycle hook or bootstrap problem. Repeated successful launches followed by terminations suggest health checking or application startup failures.

With instance weighting, count capacity units rather than rows in the `Instances` array. Six large instances may already supply a 24-unit target. Conversely, many pending instances can coexist with an application that still lacks usable workers.

## Audit the Eligible Pool Matrix

Extract the explicit instance types and subnet IDs, or inspect the attribute requirements if the group uses attribute-based selection. Then check the relevant resources:

```bash
aws ec2 describe-subnets \
  --subnet-ids subnet-0123456789abcdef0 subnet-0fedcba9876543210 \
  --query 'Subnets[].{Subnet:SubnetId,Zone:AvailabilityZone,FreeIPs:AvailableIpAddressCount}' \
  --output table

aws ec2 describe-instance-type-offerings \
  --location-type availability-zone \
  --filters Name=instance-type,Values=c6i.large,c6a.large,m6i.large \
  --query 'InstanceTypeOfferings[].{Type:InstanceType,Zone:Location}' \
  --output table
```

A type being offered does not mean Spot capacity is currently available. A subnet having free addresses does not prove its routing and endpoints allow bootstrap. These checks eliminate constraints before you interpret supply.

Inspect the launch template version referenced by the group. An AMI must match the CPU architecture of each candidate. Network-interface settings, instance-profile permissions, encrypted EBS permissions, and security group placement must also work for each candidate zone.

Broaden the matrix with tested alternatives. Add families and generations the workload can use, then include additional operationally supported zones. AWS recommends flexibility across at least ten instance types when practical. Arbitrary additions that cannot run the image only create new launch failures. [Mixed group setup guidance](https://docs.aws.amazon.com/autoscaling/ec2/userguide/mixed-instances-groups-set-up-overview.html).

## Separate Quota and Price Constraints from Supply

Spot quotas are distinct from On-Demand quotas and are measured in vCPUs for the relevant instance categories. List your applied EC2 quotas, then inspect the matching category in Service Quotas:

```bash
aws service-quotas list-service-quotas \
  --service-code ec2 \
  --query 'Quotas[?contains(QuotaName, `Spot`)].{Name:QuotaName,Code:QuotaCode,Value:Value}' \
  --output table
```

Compare the quota with usage across the account and Region, including unrelated fleets. The quota listing alone does not return current consumption. A quota increase cannot manufacture spare capacity, and additional instance types do not bypass an exhausted category quota.

Check `SpotMaxPrice` and attribute-based price protection. A cap can remove otherwise usable pools. Document the budget implication before changing an intentional cap. Raising a maximum price does not buy priority over other customers or guarantee fulfillment.

## Choose a Recovery That Matches the Requirement

If the workload can wait, preserve the target and let the group retry while broadening compatible pools. If a deadline requires additional reliable capacity, explicitly adjust the On-Demand distribution or use a separately controlled On-Demand group.

A standard mixed policy does not automatically replace its unfulfilled Spot share with On-Demand. Changing an allocation strategy changes pool selection within that share; it does not change the purchasing mix.

For a regional batch job, a fresh Spot placement score can help compare supported locations. Include data locality, image availability, service quotas, and dependencies before selecting another Region. A score is advisory, so retain a deadline policy even for highly scored locations.

## Verify Recovery at the Application Boundary

After changing one constraint, follow the next activities and confirm that new instances reach `InService`. Then check worker registration, queue age, successful job completions, or healthy load-balancer targets.

Record which change restored service. If a quota increase was pending but adding a compatible zone immediately fulfilled the group, avoid attributing success to the quota request. Preserve the original error and timestamps for later capacity planning.

## Conclusion

Diagnose the failed operation before broadening or increasing capacity. Separate launch configuration, quotas, pricing constraints, and actual Spot availability, then validate recovery through healthy application capacity rather than the desired count alone.

## Official Documentation

- [Auto Scaling launch failure troubleshooting](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ts-as-instancelaunchfailure.html)
- [Mixed instances group setup](https://docs.aws.amazon.com/autoscaling/ec2/userguide/mixed-instances-groups-set-up-overview.html)
- [Describe scaling activities](https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-scaling-activities.html)
- [Spot Instance quotas](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-limits.html)
