# Validation Summary: How to Diagnose Spot Capacity Launch Failures in EC2 Auto Scaling

## Status
validated

## Post Type
Technical troubleshooting guide with read-only AWS CLI commands and a jq inspection example.

## Technologies Covered
- Amazon EC2 Spot Instances and capacity pools
- Amazon EC2 Auto Scaling and mixed instances policies
- EC2 launch templates, AMIs, instance architectures, IAM, and encrypted EBS volumes
- VPC subnets and Availability Zones
- AWS Service Quotas and Spot placement scores
- AWS CLI v2, Bash, JMESPath, and jq

## Sources Consulted
- Auto Scaling launch failure troubleshooting: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ts-as-instancelaunchfailure.html
- Mixed instances group setup, flexibility, weights, pricing, and purchasing distribution: https://docs.aws.amazon.com/autoscaling/ec2/userguide/mixed-instances-groups-set-up-overview.html
- Describe scaling activities command, response fields, and pagination: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-scaling-activities.html
- Describe Auto Scaling groups command and response fields: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-auto-scaling-groups.html
- Describe subnets command and available address counts: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-subnets.html
- Describe instance type offerings command and location filters: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instance-type-offerings.html
- List applied service quotas command: https://docs.aws.amazon.com/cli/latest/reference/service-quotas/list-service-quotas.html
- Spot Instance quotas: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-limits.html
- Auto Scaling lifecycle hooks: https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html
- Suspend and resume Auto Scaling processes: https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-suspend-resume-processes.html
- Auto Scaling health checks: https://docs.aws.amazon.com/autoscaling/ec2/userguide/health-checks-overview.html
- Attribute-based instance selection and price protection: https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-mixed-instances-group-attribute-based-instance-type-selection.html
- Spot placement scores and limitations: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-placement-score.html
- Launch template troubleshooting: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ts-as-launch-template.html
- AWS CLI environment variables, including AWS_REGION: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
- jq manual: https://jqlang.org/manual/
- JMESPath specification: https://jmespath.org/specification.html

## Issues Found
- The scaling activities query selected only the activity array, discarding the CLI continuation token while the accompanying instructions suggested retrieving further pages. Changed the query to return an object containing both Activities and NextToken, and clarified that the returned token is supplied through --starting-token. This preserves the initial 30-activity limit while making pagination possible from the saved result.

## Review Notes
- Verified all five AWS CLI operations, their option names, response properties, output formats, and filters against the official command references. All four Bash blocks passed bash -n; all four JMESPath expressions compiled. A synthetic activity response confirmed that the corrected projection preserves both activity details and the continuation token. The jq expression ran successfully against a synthetic group response containing weighted capacity.
- The commands were not executed against a live AWS account. Resource IDs and the group name are examples; actual results depend on the selected account, Region, permissions, and resources.
- Confirmed the distinction between instance type offerings and current Spot availability, the recommendation for at least ten compatible instance types, and the importance of multiple supported zones.
- Confirmed capacity-unit accounting, lifecycle-hook waits, suspended launches, health-check replacement, launch-template compatibility, and KMS permissions as relevant diagnostic considerations. Pending:Wait indicates a lifecycle hook; bootstrap failures explain a prolonged wait when initialization is tied to that hook.
- Confirmed that Spot quotas are regional vCPU limits by category and that applied quota values do not provide current consumption. Open Spot requests can also count toward quota consumption and should be considered when investigating usage.
- Confirmed that price restrictions can exclude pools, a standard mixed policy retains its configured purchasing distribution during Spot shortages, and placement scores are advisory. On-Demand launches remain subject to their own quotas and capacity availability.
- All four linked AWS documentation pages resolve to the intended resources. The author link is a plausible GitHub profile URL and is not technical evidence.
- The examples are consistent with current AWS CLI v2 documentation. No deprecated APIs or explicit software version claims requiring correction were found. AWS_REGION is supported by CLI v2; CLI v1 users should check their Region configuration.
