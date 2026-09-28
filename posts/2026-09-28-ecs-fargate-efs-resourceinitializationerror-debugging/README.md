# Fix ECS Fargate EFS ResourceInitializationError: DNS, Networking, and IAM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EFS, ECS, Fargate

Description: Diagnose Fargate EFS startup failures from stopped-task evidence through DNS, task ENI networking, task-role authorization, and access-point configuration.

`ResourceInitializationError` is a startup failure category, not a diagnosis. When its details mention EFS, the task may be unable to resolve the filesystem name, reach a mount target, or obtain authorization. The container's application logs may be empty because the volume must be prepared before the application starts.

This guide assumes ECS on Linux Fargate with an EFS volume. AWS supports EFS on Linux Fargate platform version 1.4.0 and later. Fargate manages the mount through a supervisor container; installing `amazon-efs-utils` inside the application image does not repair that managed mount. [EFS support in ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-volumes.html)

## Capture the stopped task and its exact revision

```bash
aws ecs describe-tasks \
  --cluster production \
  --tasks arn:aws:ecs:us-east-1:111122223333:task/production/EXAMPLE \
  --query 'tasks[].{Reason:stoppedReason,Code:stopCode,Definition:taskDefinitionArn,Attachments:attachments,Containers:containers[].{Name:name,Reason:reason}}'
```

Collect the details promptly and save the task-definition ARN. Editing a new revision does not change the revision used by the failed task.

Classify the embedded EFS message. A name-resolution failure points toward DNS and placement. A timeout suggests network reachability. An access-denied response suggests IAM, the filesystem policy, or the access point. Do not treat every stopped task as evidence that the application needs more CPU.

## Reconstruct the task's network path

Find the task ENI from the attachment details, then inspect it if it still exists. ECS deletes the ENI during task deprovisioning, so a stopped task's ENI may no longer be available. In that case, use the saved attachment subnet ID and the security groups from the service or task launch configuration, and inspect a fresh diagnostic task's ENI:

```bash
aws ec2 describe-network-interfaces \
  --network-interface-ids eni-0123456789abcdef0 \
  --query 'NetworkInterfaces[0].{IP:PrivateIpAddress,Subnet:SubnetId,Groups:Groups,VPC:VpcId}'
```

Compare its subnet's Availability Zone with the EFS targets. For ordinary EFS DNS with a Regional filesystem, ensure there is a target in every zone where the service may place tasks. A One Zone filesystem supports only one mount target in its own zone; keep task placement in that zone for this DNS approach. A target belongs to a subnet, but one target covers its Availability Zone; you do not create one for every application subnet. [EFS DNS selection](https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-cmd-dns-name.html)

Authorize TCP 2049 from the **task's** security group to the EFS mount-target group. An EC2 host or load-balancer group is not interchangeable with the task ENI's group. Check restricted task egress and subnet ACL return traffic. [EFS network rules](https://docs.aws.amazon.com/efs/latest/ug/network-access.html)

For a reproducible test, use a temporary diagnostic EC2 instance or a task without the broken EFS volume in the same subnet and intended security-group context. Test DNS and target TCP 2049 there. A bastion in another subnet provides weaker evidence. EFS traffic to a same-VPC private target does not need a NAT gateway.

## Inspect the task definition's volume configuration

For an access point with IAM authorization, the relevant fragment should resemble:

```json
{
  "volumes": [
    {
      "name": "shared-data",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-0123456789abcdef0",
        "transitEncryption": "ENABLED",
        "authorizationConfig": {
          "accessPointId": "fsap-0123456789abcdef0",
          "iam": "ENABLED"
        }
      }
    }
  ]
}
```

This is a fragment to merge into a full task definition. Its container needs a `mountPoints` entry whose `sourceVolume` is `shared-data` and whose `containerPath` is the intended application directory.

When using an access point, omit `rootDirectory` or set it to `/`; the access point supplies the server-side root. Transit encryption must be enabled for access points and for IAM authorization. [ECS EFS configuration fields](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specify-efs-config.html)

## Check the task role and server-side directory

With `iam` enabled, EFS uses the task IAM role in `taskRoleArn`. Do not add EFS client permissions only to `executionRoleArn`, which serves other ECS startup responsibilities. Confirm the effective permissions allow the necessary client actions under the intended conditions. For same-account access, an allow can come from the task role's identity policy or the filesystem policy; both do not need to grant it, and an applicable explicit deny overrides an allow. [EFS IAM authorization](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html)

Inspect the access point's filesystem ID, lifecycle state, POSIX identity, and root directory. A missing directory without valid creation information prevents mounting. An existing directory with an incompatible owner or mode is not repaired merely by configuring new creation defaults. [Access-point root requirements](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html)

## Validate a fresh task in every placement zone

Launch a new task using the corrected revision and confirm it reaches `RUNNING`. Then test the mounted directory from the actual application container. A successful start followed by write failures means you have moved past initialization; check client-write permissions, POSIX authorization, and whether the container's mount point is configured as read-only.

Exercise every subnet used by the service, either through controlled diagnostic tasks or a staged rollout. Record startup success, the task revision, target coverage, and a small read/write check. Only then roll out broadly; otherwise a missing mount target or security-group difference can make the failure appear intermittent as tasks move between zones.
