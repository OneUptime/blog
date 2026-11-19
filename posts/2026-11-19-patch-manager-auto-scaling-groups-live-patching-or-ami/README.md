# Patch Manager for Auto Scaling Groups: Drain and Patch Live Instances or Bake a New AMI?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Systems Manager, Patch Manager, Auto Scaling, AMI

Description: Choose between coordinated in-place patching and tested AMI replacement, with explicit draining, capacity, launch-template, and rollback controls.

Patching every running instance does not ensure that tomorrow's replacement instance starts patched. An Auto Scaling group (ASG) still launches from its configured image and bootstrap process. Treat fleet remediation and future-launch configuration as separate deliverables.

This workflow assumes an Application Load Balancer (ALB), instance-count capacity, and a single launch template. The replacement path uses a rolling Instance Refresh.

## Choose the recovery model first

| Situation | Practical choice |
| --- | --- |
| Instances are disposable and a tested image pipeline exists | Build and promote a new AMI, then replace instances. |
| An urgent, tested patch must precede the next image release | Patch selected instances in place, then converge the image pipeline. |
| Instances hold unique data or long-running jobs | Resolve replication, recovery, and workload draining before either approach. |

Neither approach guarantees zero downtime without sufficient healthy capacity and compatible application state. A reboot can interrupt local work; replacement can discard it. Define acceptable errors, latency, queue age, and rollback criteria before maintenance.

## Establish capacity before removing traffic

Record current desired capacity, size bounds, instance states, launch-template versions, scaling activity, and target health. This read-only command retrieves the ASG configuration; substitute your account profile, Region, and group:

```bash
aws --profile production --region eu-west-1 \
  autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names app-asg --output json
```

Check `MinSize`, `MaxSize`, `DesiredCapacity`, `LaunchTemplate`, and `Instances`. Also inspect every attached target group: ASG membership alone does not establish application readiness. [CLI reference](https://docs.aws.amazon.com/cli/latest/reference/autoscaling/describe-auto-scaling-groups.html)

Provision and verify any extra capacity **before** draining. Check quotas, subnet addresses, Availability Zone capacity, and current traffic. Configure meaningful ALB readiness checks and enable ELB health checks on the ASG when replacement should respond to them; the ASG otherwise ignores those results by default. [ASG health checks](https://docs.aws.amazon.com/autoscaling/ec2/userguide/health-checks-overview.html)

## Patch one selected instance through Standby

Patching an `InService` instance can cause a health failure and ASG replacement while maintenance is still running. [Health-based replacement](https://docs.aws.amazon.com/autoscaling/ec2/userguide/health-checks-overview.html)

Use `Standby` for the selected instance. It remains in the ASG, is deregistered from attached load balancers, and receives no ASG health checks until returned to service. Its reported health is consequently stale. This provides a maintenance boundary without suspending health checks across the fleet. [Standby behavior](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-enter-exit-standby.html)

Choose capacity behavior deliberately. Starting with desired capacity four, steady demand, and no concurrent scaling or unrelated capacity changes:

- **Decrement desired capacity:** entering Standby reduces desired to three and does not launch a replacement. Returning the instance raises desired to four.
- **Keep desired capacity:** entering Standby leaves desired at four and launches a replacement. Returning the maintained instance raises desired to five.

The resulting desired capacity must fit the group's minimum and maximum. Reserve return headroom and reconcile capacity against current demand afterward; blindly restoring an old number can undo legitimate scaling. A replacement launched after entry is not already healthy when draining begins. [Capacity accounting](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-enter-exit-standby.html)

Wait for Standby and target deregistration to complete. ALB's deregistration delay defaults to 300 seconds; ending connections prematurely can produce client errors. Separately stop queue consumption and scheduled work, release leases safely, and wait for application work to finish. A target reaching `unused` does not prove background jobs finished. [ALB draining](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html)

Only then target the selected managed-node ID with the intended baseline and `AWS-RunPatchBaseline` installation. Plan for `RebootIfNeeded`; `NoReboot` does not make service restarts harmless or complete pending activation. Verify SSM recovery, the active kernel/services, a fresh compliance scan, and application readiness before exiting Standby. [Patch document behavior](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-aws-runpatchbaseline.html)

After return, require healthy ALB registration and a successful application observation period before selecting another instance. If verification fails, leave it out of traffic and restore service capacity before continuing.

Run Command concurrency limits simultaneous commands, not unavailable application capacity. Even concurrency one can move to another node before the first application recovers. Coordinate the entire drain–patch–verify–return sequence per batch. Error thresholds stop further dispatch; already-running invocations can finish. [Rate controls](https://docs.aws.amazon.com/systems-manager/latest/userguide/send-commands-multiple.html)

## Make future launches match the repaired fleet

In-place patching leaves the source AMI unchanged. Reproduce the fix in a clean build, test the resulting AMI, and publish a new launch-template version. Do not capture a serving instance's live disk, credentials, or mutable application state as the release image. Image Builder supports separate build and test stages, including launching test instances from the image. [Image workflows](https://docs.aws.amazon.com/imagebuilder/latest/userguide/manage-image-workflows.html)

Update the ASG's actual launch-template reference. Creating a version does not select it; changing the template's default does not move an ASG pinned to a numbered version. Prefer explicit version numbers and AMI IDs, and reconcile infrastructure-as-code with the promotion. Existing instances still require their own remediation or replacement. [Template versions](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-launch-template-versions.html), [ASG updates](https://docs.aws.amazon.com/autoscaling/ec2/userguide/update-auto-scaling-group.html)

## Roll out the tested AMI deliberately

Launch a canary from the candidate image and verify boot, dependencies, representative transactions, and compatibility with existing instances and data. Retain the previous working image and launch-template version.

Start the refresh with the candidate as `DesiredConfiguration`, preserving the previous working ASG configuration as the rollback target. Successful completion updates the ASG configuration; scale-outs during the refresh use the desired configuration. [Refresh workflow](https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-overview.html)

Set these controls explicitly for the workload:

- `MinHealthyPercentage` and `MaxHealthyPercentage` govern replacement capacity. With desired capacity fixed at four equal instances, steady demand, and no concurrent scaling, 100/125 allows one extra instance before a planned replacement while requiring four healthy instances for the refresh to proceed. Recalculate for scaling changes; independent failures can still reduce availability. Verify launch capacity; percentages cannot create resources.
- `InstanceWarmup` covers initialization after `InService`; it does not run application tests. Derive the interval from observed startup behavior.
- Use checkpoints ending at 100%, with enough delay to inspect the canary batch. Checkpoints resume after their delay; they are not manual approval gates, and percentages round to whole instances.
- Attach existing CloudWatch alarms for application failures and enable `AutoRollback` if automatic recovery is intended. Consider `BakeTime` for observation before completion.

[Refresh preferences](https://docs.aws.amazon.com/autoscaling/ec2/APIReference/API_RefreshPreferences.html), [checkpoint behavior](https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-adding-checkpoints-instance-refresh.html)

Launch hooks can gate readiness and termination hooks can coordinate cleanup during replacement. They do not run for Standby transitions. Hooks have time limits and cannot prevent Spot reclamation, so application recovery must tolerate an interrupted drain. [Lifecycle hooks](https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html)

Rollback requires a desired configuration and a usable previous configuration with a numbered launch-template version and explicit AMI ID. `$Latest`, `$Default`, and SSM AMI aliases prevent this rollback path. Cancellation alone does not undo replacements. After completion, recovery requires another refresh. Image rollback also cannot reverse incompatible database changes. [Rollback requirements](https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-rollback.html), [cancellation behavior](https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-adding-checkpoints-instance-refresh.html)

Close maintenance only after both the serving fleet and a newly launched instance pass application checks and patch verification. Keep the image identity, launch-template version, patch evidence, and application observations together so the next replacement has a known starting point.
