# Validation Summary: Patch Manager for Auto Scaling: Patch Live Instances or Bake an AMI?

## Status
validated

## Post Type
Technical operational guide with an AWS CLI example and implementation guidance.

## Technologies Covered
- Amazon EC2 Auto Scaling groups, Standby, lifecycle hooks, and rolling Instance Refresh
- AWS Systems Manager Patch Manager and Run Command
- Application Load Balancer target health and connection draining
- Amazon Machine Images, EC2 launch templates, and EC2 Image Builder
- Amazon CloudWatch alarms
- AWS CLI and Bash

## Sources Consulted
- [AWS CLI: describe-auto-scaling-groups](https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-auto-scaling-groups.html)
- [Auto Scaling health checks](https://docs.aws.amazon.com/autoscaling/ec2/userguide/health-checks-overview.html)
- [Standby behavior and capacity accounting](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-enter-exit-standby.html)
- [ALB target group attributes and deregistration delay](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html)
- [AWS-RunPatchBaseline parameters and reboot behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-aws-runpatchbaseline.html)
- [Run Command targeting, concurrency, and error controls](https://docs.aws.amazon.com/systems-manager/latest/userguide/send-commands-multiple.html)
- [Image Builder build, test, and distribution workflows](https://docs.aws.amazon.com/imagebuilder/latest/userguide/manage-image-workflows.html)
- [EC2 launch-template versions](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-launch-template-versions.html)
- [Updating an Auto Scaling group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/update-auto-scaling-group.html)
- [Instance Refresh workflow and desired configuration](https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-overview.html)
- [RefreshPreferences API reference](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_RefreshPreferences.html)
- [Instance Refresh checkpoints and cancellation effects](https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-adding-checkpoints-instance-refresh.html)
- [Auto Scaling lifecycle hooks](https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html)
- [Instance Refresh rollback requirements](https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-rollback.html)

## Issues Found
- **Launch-template promotion could overwrite the rollback target.** The original instruction to update the ASG's launch-template reference appeared before the rolling refresh procedure. Following both instructions sequentially would save the candidate configuration on the ASG before starting the refresh; rollback uses the configuration last saved before the refresh, not an independently retained older version. Qualified the direct update as part of the in-place patching path and instructed the replacement path to supply the candidate through `DesiredConfiguration` without first updating the ASG. This preserves the previous working configuration for rollback and matches the AWS refresh and rollback documentation. No other technical errors were found.

## Review Notes
- Checked the CLI operation, global flags, group-name option, JSON output, and referenced response fields against the AWS CLI reference. The command is read-only and syntactically valid. It requires the reader's configured profile, Region, existing ASG, and appropriate IAM permissions; it was not executed against an AWS account.
- Confirmed both four-instance Standby examples, desired-capacity bounds, target deregistration and re-registration, and stale ASG health while in Standby. Replacement capacity still needs readiness verification before maintenance removes serving capacity.
- Confirmed the ALB 300-second default deregistration delay and the distinction between connection draining and application background-work completion.
- Confirmed baseline selection, Install and Scan operations, reboot options, and service-restart caveats. RebootIfNeeded can reboot after any patch installation; it does not inspect whether each patch individually requires a reboot. NoReboot does not prevent service restarts.
- Confirmed Run Command concurrency governs command execution rather than application recovery, and already-running invocations can complete after error controls stop additional dispatch.
- Confirmed Image Builder's separate build and test stages, immutable launch-template versions, and the fact that changing launch configuration does not itself remediate existing instances.
- Confirmed the rolling refresh's desired-configuration behavior, 100/125 capacity example, warmup semantics, checkpoint delays and whole-instance effects, CloudWatch alarms, AutoRollback, and BakeTime. Warmup can also inherit the ASG default; explicit per-refresh values are valid overrides.
- Confirmed lifecycle hooks apply to replacement launches and terminations, not Standby transitions, and cannot prevent Spot reclamation. Confirmed rollback restrictions for dynamic template versions and Parameter Store AMI aliases, cancellation semantics, and the need for another refresh after completion.
- All external links present in the post resolved to their intended resources, including the author profile. The checkpoint reference also explicitly supports the cancellation statement.
- The review covers the post's stated ALB, instance-count, single-launch-template, rolling-refresh scope. Application readiness, rollback compatibility, and workload-specific capacity recommendations require validation in the reader's environment; documentation review cannot establish zero downtime for a particular workload.
- No deprecated API or CLI usage was identified. Review date: 2026-11-20.
