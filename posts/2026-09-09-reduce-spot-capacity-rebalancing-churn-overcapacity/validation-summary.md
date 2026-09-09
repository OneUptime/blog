# Validation Summary: How to Reduce Spot Capacity Rebalancing Churn and Overcapacity

## Status
validated

## Post Type
Technical operations guide with AWS CLI commands and an EC2 Fleet JSON configuration excerpt.

## Technologies Covered
- Amazon EC2 Spot Instances and rebalance recommendations
- Amazon EC2 Auto Scaling and mixed instances policies
- EC2 Fleet and Spot Fleet
- Auto Scaling lifecycle hooks and load-balancer deregistration
- AWS CLI, Bash, JMESPath, and JSON
- Capacity planning, monitoring, and target tracking scaling

## Sources Consulted
- [Auto Scaling Capacity Rebalancing](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-capacity-rebalancing.html)
- [EC2 Fleet and Spot Fleet Capacity Rebalancing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-capacity-rebalance.html)
- [Auto Scaling lifecycle hooks](https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html)
- [Complete a lifecycle action](https://docs.aws.amazon.com/autoscaling/ec2/userguide/completing-lifecycle-hooks.html)
- [Describe Auto Scaling groups CLI](https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-auto-scaling-groups.html)
- [Describe scaling activities CLI](https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-scaling-activities.html)
- [Describe lifecycle hooks CLI](https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-lifecycle-hooks.html)
- [Create EC2 Fleet CLI](https://docs.aws.amazon.com/cli/latest/reference/ec2/create-fleet.html)
- [Request Spot Fleet CLI](https://docs.aws.amazon.com/cli/latest/reference/ec2/request-spot-fleet.html)
- [Auto Scaling instance weights](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups-instance-weighting.html)
- [Target tracking scaling policies](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html)
- [Author GitHub profile](https://github.com/nawazdhandala) — checked the author link destination only.

## Issues Found
- **Lifecycle heartbeat extensions are bounded.** The phrase “endlessly extending a broken drain” could imply that heartbeats can hold a lifecycle hook indefinitely. Changed “endlessly” to “repeatedly” and stated the documented global limit: the smaller of 48 hours and 100 times the heartbeat timeout. This preserves the drain-budget advice while making the service limit explicit.

## Review Notes
- Confirmed the Auto Scaling replacement health-check sequence, temporary maximum-size allowance based on desired capacity, concurrent scaling behavior, retry behavior, and availability-based deferral. The weighted-capacity caveat is appropriate.
- Confirmed that proactive replacements and EC2 reclamations are different events. The suggested workload and cost metrics are operational recommendations, not claims that AWS provides these as built-in metrics.
- Verified all three CLI command names, singular/plural group-name flags, pagination option, output option, and queried response fields against AWS CLI documentation. The shell block passes Bash syntax checking. Running it requires a configured AWS identity, appropriate read permissions, the correct region, and an existing group named by ASG_NAME.
- Parsed the JSON excerpt successfully and verified its nesting, allocation strategy, replacement strategy, and termination delay against the create-fleet schema. It is correctly described as a partial request; a real request also needs the fleet type, launch configuration, and target capacity settings.
- Confirmed the distinct Spot Fleet configuration path, maintain-only fleet support, launch strategy behavior, delay bounds, and inability to modify running-fleet rebalancing settings.
- Lifecycle hooks cannot prevent EC2 reclamation. Deregistration and cleanup must fit the available time, and application readiness requires suitable checks or lifecycle integration.
- The activity query intentionally returns a limited diagnostic view. It omits the pagination token and instance description; deeper investigations may need additional fields and event records. This does not invalidate the example.
- All article links resolve to the intended documentation or author profile. No deprecated APIs or incompatible version-specific syntax were identified.
- Validation used official documentation and local syntax checks; no AWS resources were created or changed, and no live fleet interruption or scaling experiment was performed.
