# When to Stop, Hibernate, or Terminate Interrupted EC2 Spot Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Spot, EC2, Storage, Cost Optimization

Description: Choose Spot interruption behavior from recovery needs, request-type restrictions, hibernation prerequisites, and the cost of waiting for capacity.

---

The Spot interruption behavior decides what happens to the interrupted instance. It does not guarantee when replacement capacity becomes available or how quickly the application resumes. Choose it from the workload's recovery model, rather than treating stop or hibernate as an availability feature.

EC2 offers `terminate`, `stop`, and `hibernate`. Termination is the default. Stop and hibernate preserve the instance identity, but their retained state and restart paths differ. [AWS interruption behaviors](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/interruption-behavior.html)

## Compare the state you actually need

| Behavior | State retained | Appropriate recovery model |
| --- | --- | --- |
| Terminate | Only externally durable data and EBS volumes configured to persist | Replace the machine and resume from application state |
| Stop | Attached EBS data and instance configuration; memory is lost | Boot the same instance when its capacity returns |
| Hibernate | EBS data plus RAM saved to the root volume | Resume supported operating-system memory state |

Instance-store data is not protected by any of these choices when the instance is stopped, hibernated, or terminated. Keep required outputs on suitable durable storage before interruption. RAM preservation also does not preserve the remote end of an expired network connection or application lease.

## Prefer termination for replaceable workers

Terminate fits workers whose source of truth is a queue, object store, or database. A new machine can use another compatible type or zone, subject to the fleet's configuration and capacity.

For an individual `RunInstances` request, the market options are:

```json
{
  "MarketType": "spot",
  "SpotOptions": {
    "SpotInstanceType": "one-time",
    "InstanceInterruptionBehavior": "terminate"
  }
}
```

Save this as `spot-options.json` and use it with your reviewed launch parameters:

```bash
aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type "$INSTANCE_TYPE" \
  --subnet-id "$SUBNET_ID" \
  --security-group-ids "$SECURITY_GROUP_ID" \
  --instance-market-options file://spot-options.json \
  --count 1
```

The command launches billable capacity; supply an AMI, instance type, subnet, and security group suitable for the workload. Add the instance role, storage mappings, and bootstrap configuration required by your environment. A one-time request does not provide an application-level replacement controller. [Creating Spot requests](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-requests.html)

Before relying on retained EBS data, verify each mapping's `DeleteOnTermination` setting. Preserving a disk does not automatically attach it to the replacement worker or move it to another zone.

## Choose stop when rebooting the same instance is acceptable

For `RunInstances`, stop requires a persistent Spot request:

```json
{
  "MarketType": "spot",
  "SpotOptions": {
    "SpotInstanceType": "persistent",
    "InstanceInterruptionBehavior": "stop"
  }
}
```

Use this as the alternative contents of `spot-options.json`. Do not combine a persistent `RunInstances` request with the default terminate behavior; the API documents persistent requests for stop or hibernate. [SpotMarketOptions API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_SpotMarketOptions.html)

When EC2 interrupts and stops the instance, EC2 controls its restart. For a persistent individual request, resumption requires capacity for the same type in the same Availability Zone. This can be a poor match for jobs with strict deadlines. EBS charges continue while the machine waits. EC2 Fleet and Spot Fleet have their own request-mode requirements; AWS documents `maintain` for stopped interrupted fleet instances.

Stop is useful when rebuilding the local EBS environment is expensive, RAM is replaceable, and the workload can wait. Add monitoring for stopped-instance age and retained-volume cost so old requests do not quietly accumulate.

## Choose hibernate only after checking prerequisites

Hibernation writes RAM to an encrypted EBS root volume and later restores it. Enable support at launch; you cannot add it to an existing instance. The AMI, family, RAM size, root-volume type and capacity, and encryption must meet the current requirements. [Hibernation prerequisites](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hibernating-prerequisites.html)

For a supported individual Spot launch, use persistent market options with `InstanceInterruptionBehavior` set to `hibernate`, and set:

```bash
--hibernation-options Configured=true
```

That is an additional argument to the launch command, not a complete launch by itself. Configure a sufficiently large encrypted root-volume mapping for the selected AMI and RAM size. Setting hibernation support with an explicitly conflicting interruption behavior produces an API error.

Current AWS documentation distinguishes user-initiated hibernation from EC2 interruption: a user can resume an instance they hibernated, subject to Spot capacity and price, while EC2 controls resumption after EC2-initiated hibernation. Hibernation is not supported for instances in an Auto Scaling group or used by ECS. [Hibernation behavior and limitations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-hibernate-overview.html)

After resuming, reconnect sockets, refresh credentials, recheck leases, and verify wall-clock assumptions. An in-memory worker that resumes with a stale lock can conflict with a replacement that already took ownership.

## Do not depend on a guaranteed hibernation notice window

AWS's current pages are inconsistent: the Spot interruption-notice page says hibernation begins immediately without the usual two-minute interval, while the hibernation overview describes a notice two minutes before hibernation. The FIS tutorial also retains the immediate-hibernation warning. [Interruption notices](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html), [hibernation overview](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-hibernate-overview.html), [FIS tutorial](https://docs.aws.amazon.com/fis/latest/userguide/fis-tutorial-spot-interruptions.html)

Until the behavior is confirmed for your supported configuration, make required state durable during normal execution and assume no guaranteed hibernation lead time. A shutdown hook should improve recovery, not be the only mechanism protecting completed work.

## Validate the complete lifecycle and cost

Test initial launch, interruption, waiting, restart, and final cleanup. Distinguish a user stop from an EC2 interruption in your evidence; their restart ownership and billing treatment can differ.

Check whether the application resumes from the expected point, whether its external dependencies remain valid, and how long paid storage persists while compute is unavailable. Cancel unused persistent requests as part of cleanup and verify instance state carefully: cancellation behavior depends on the request's current state. [Managing Spot requests](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances-request.html)

A successful hibernation demonstration does not establish the best total cost. Compare memory restoration with launching a fresh worker and loading a compact application checkpoint.

## Conclusion

Use terminate for replaceable workers, stop for EBS-backed environments that can wait, and hibernate for supported workloads that benefit from memory restoration. Keep recovery deadlines, retained-storage cost, and application correctness separate from the interruption setting.

## Official Documentation

- [Spot interruption behaviors](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/interruption-behavior.html)
- [Spot request creation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-requests.html)
- [SpotMarketOptions API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_SpotMarketOptions.html)
- [Hibernation prerequisites](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hibernating-prerequisites.html)
- [Hibernation behavior](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-hibernate-overview.html)
- [Spot request management](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances-request.html)
