# How to Use Spot Placement Scores Before Scaling a Batch Workload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EC2 Spot, Capacity Planning, Auto Scaling, Cost Optimization

Description: Query regional and zonal Spot placement scores with matching workload requirements, preserve scoring assumptions, and plan batch capacity without guarantees.

A Spot placement score helps decide where to request capacity for a particular workload. It does not reserve instances or predict how long they will survive. Use it immediately before a meaningful scale-out, alongside your deployment constraints and deadline policy.

The score depends on the amount of capacity, eligible instance types, location assumptions, and current conditions. Asking about ten small instances and then launching thousands of large instances is a different request, even if both runs use the same application.

## Write Down the Launch You Actually Intend

For a batch job, identify the requested compute units, compatible image architecture, memory requirement, supported Regions, and whether the workers must share a single Availability Zone.

This example needs 160 vCPUs of x86 compute using four compatible types. The candidate Regions already have application images, data access, IAM configuration, and sufficient quotas. Listing a Region in the score request does not prepare any of those resources.

AWS returns scores from one to ten. A high score suggests better prospects of fulfillment for the scored configuration, not a numerical probability or a promised quantity of machines. The [score overview](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-placement-score.html) also documents target-capacity limits based on recent usage and limits on new request configurations.

## Request Regional Scores

Use AWS CLI with permission for `ec2:GetSpotPlacementScores`:

```bash
aws ec2 get-spot-placement-scores \
  --region us-east-1 \
  --instance-types c6i.xlarge c6a.xlarge c6i.2xlarge c6a.2xlarge \
  --target-capacity 160 \
  --target-capacity-unit-type vcpu \
  --region-names us-east-1 us-east-2 us-west-2 \
  --no-single-availability-zone \
  --output json > regional-scores.json

jq '.SpotPlacementScores | sort_by(.Score) | reverse' \
  regional-scores.json
```

`--region` selects the endpoint for the API call; `--region-names` filters candidate locations being scored. Omitting the unit would make the target mean instances rather than vCPUs.

Specify at least three different eligible instance types. A score request with one or two types returns a low score; attribute requirements must likewise resolve to enough types. Different sizes count as different named instance types, but that does not excuse including sizes that cannot run the workload.

The [CLI reference](https://docs.aws.amazon.com/cli/latest/reference/ec2/get-spot-placement-scores.html) defines the valid capacity units as `units`, `vcpu`, and `memory-mib`. Save the exact request alongside the result and timestamp so operators can tell what was scored.

## Use Zonal Scores for a Single-Zone Job

A tightly coupled run or data placement constraint might require one zone. Request zonal scores for the full job size:

```bash
aws ec2 get-spot-placement-scores \
  --region us-east-1 \
  --instance-types c6i.xlarge c6a.xlarge c6i.2xlarge c6a.2xlarge \
  --target-capacity 160 \
  --target-capacity-unit-type vcpu \
  --region-names us-east-1 \
  --single-availability-zone \
  --query 'SpotPlacementScores[].{Region:Region,ZoneId:AvailabilityZoneId,Score:Score}' \
  --output table
```

Map the returned zone ID to your account's zone name and subnets:

```bash
aws ec2 describe-availability-zones \
  --region us-east-1 \
  --query 'AvailabilityZones[].{Id:ZoneId,Name:ZoneName,State:State}' \
  --output table
```

Zone IDs provide a stable physical-zone reference across accounts, whereas zone-name mappings can differ. Provision into a subnet in the selected zone. A high regional score does not establish that one particular zone can fulfill the entire workload.

## Preserve the Scoring Assumptions

AWS currently documents scores against the `capacity-optimized` strategy and a matching launch configuration. Regional scoring assumes availability across all relevant Availability Zones; zonal scoring assumes the specified single zone. Using fewer zones, different types, or another strategy changes the assumptions. [How placement scoring works](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-sps-works.html).

Price-capacity optimization is useful for many production fleets, but do not treat a placement score as a calibrated forecast for that strategy. You can use the score as contextual information while explicitly acknowledging the mismatch, or use the documented strategy for a launch meant to align with the score.

When manually listing types of different sizes, map vCPU units into launch weights. For these types the intended override excerpt for an Auto Scaling policy is:

```json
{
  "Overrides": [
    {"InstanceType": "c6i.xlarge", "WeightedCapacity": "4"},
    {"InstanceType": "c6a.xlarge", "WeightedCapacity": "4"},
    {"InstanceType": "c6i.2xlarge", "WeightedCapacity": "8"},
    {"InstanceType": "c6a.2xlarge", "WeightedCapacity": "8"}
  ]
}
```

This is a policy excerpt, not a full create-group request. The desired capacity would be 160 weighted units. Copying `160` into an unweighted group would request 160 instances and substantially change the workload being launched.

## Combine the Score with Operational Feasibility

Evaluate each candidate against deployment readiness. A higher score in a Region with a long dataset transfer can finish later than a slightly lower score beside the data. Include transfer time, egress charges, image replication, quotas, and downstream service availability in the decision.

Use a small number of meaningful configurations rather than continuously generating arbitrary type combinations. Fresh scores for the same planned workload are more useful than a large historical matrix that no longer matches your templates.

Keep an explicit decision deadline. If the Spot request remains below useful capacity after that deadline, choose among waiting, reducing parallelism, another prepared Region, or a deliberate On-Demand policy. These options should reflect the job's value and completion requirement.

## Validate After Launch

Record fulfilled capacity, time to worker registration, and time until the scheduler begins processing at the expected rate. Compare those observations with the saved score and configuration. Separate launch failures from bootstrap or data-access failures, which a score cannot diagnose.

A score of ten followed by partial fulfillment is possible. Retain the result as planning evidence and refresh it before the next attempt; do not build a controller that assumes the score guarantees eventual success.

## Conclusion

Score the capacity you intend to launch, retain the exact configuration and timestamp, and respect the strategy and zone assumptions. Use the result to improve location selection while keeping quotas, data readiness, and a deadline-based capacity policy in the launch plan.

## Official Documentation

- [Spot placement score overview and limits](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-placement-score.html)
- [How placement scores work](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/how-sps-works.html)
- [Get Spot placement scores CLI](https://docs.aws.amazon.com/cli/latest/reference/ec2/get-spot-placement-scores.html)
- [Auto Scaling instance weighting](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups-instance-weighting.html)
