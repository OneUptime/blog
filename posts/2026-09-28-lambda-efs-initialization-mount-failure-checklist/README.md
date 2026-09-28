# Lambda Cannot Mount EFS During Initialization: Checking VPC Subnets, Mount Targets, and Access-Point Permissions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EFS, Lambda

Description: Diagnose Lambda EFS initialization failures using precise exception types, Availability Zone coverage, execution-role access, and access-point directory readiness.

When Lambda cannot mount EFS, the function may fail before your handler executes. Changing file-handling code inside the handler will not repair an initialization-time network or mount authorization failure. Start with the exact exception and the function version's deployed configuration.

This checklist assumes a Lambda function connected to a VPC and an EFS access point in the same deployment region. Resource IDs in the examples are placeholders.

## Read the exception before choosing a fix

AWS distinguishes three useful cases:

| Exception | Meaning to investigate |
| --- | --- |
| `EFSMountFailureException` | The mount request was rejected; check permissions and resource readiness |
| `EFSMountConnectivityException` | Lambda could not establish the NFS network connection |
| `EFSMountTimeoutException` | The connection was established, but the mount did not finish in time |

For mount timeouts after connectivity is established, AWS suggests retrying after a short interval and considering lower concurrency to reduce filesystem load. That differs from a blocked port, where retrying cannot repair the network. [Lambda invocation troubleshooting](https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting-invocation.html)

Capture the exception from the synchronous invocation response or the relevant asynchronous failure destination. Application log absence is consistent with failure before the handler, so it does not establish a logging problem.

## Inspect the exact function configuration

```bash
aws lambda get-function-configuration \
  --function-name report-worker \
  --query '{State:State,Reason:StateReason,Role:Role,VPC:VpcConfig,Filesystems:FileSystemConfigs,LastUpdate:LastUpdateStatus}'
```

If an alias invokes a published version, inspect that qualifier as well; correcting `$LATEST` does not change a published version. Record the access-point ARN, local mount path, role, subnets, and security groups together.

Describe those subnets and compare their Availability Zones with available EFS mount targets. The target need not be in the identical subnet, but it must provide the expected zone coverage and an NFS route from the function's subnets. AWS recommends a target in every zone used by the function. [Lambda EFS configuration](https://docs.aws.amazon.com/lambda/latest/dg/configuration-filesystem-efs.html)

## Verify the NFS path and function security groups

Permit the function's configured security group to send TCP 2049 and permit the target's group to receive TCP 2049 from it. Inspect ACLs and routes for both directions. A security-group rule for an unrelated EC2 administration host does not authorize Lambda's ENIs.

A temporary diagnostic instance using the same subnet and security-group context can test DNS and TCP connectivity. It does not prove Lambda execution-role authorization, but it helps isolate the network stage. Adding a NAT gateway is not a repair for a missing rule between private same-VPC resources. [EFS network controls](https://docs.aws.amazon.com/efs/latest/ug/network-access.html)

Check every subnet configured on the function. A deployment that only covers one of several zones can fail as Lambda creates new environments elsewhere.

## Inspect the execution role and filesystem policy

The execution role needs the appropriate EFS client permissions for a custom-policy deployment: `ClientMount` and, for writers, `ClientWrite`. VPC network-interface management permissions serve a different purpose. The deployment principal's `DescribeMountTargets` permission also does not substitute for runtime data access.

```bash
aws efs describe-file-system-policy \
  --file-system-id fs-0123456789abcdef0 \
  --query Policy --output text
```

Compare the role and access-point ARN with policy principals, grants, and denies. If `PolicyNotFound` is returned, evaluate the documented default-policy behavior rather than assuming the resource is inaccessible. For an explicitly restricted deployment, make the intended runtime grants clear and scoped. [EFS policy model](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html)

## Confirm access-point readiness and directory traversal

```bash
aws efs describe-access-points \
  --access-point-id fsap-0123456789abcdef0 \
  --query 'AccessPoints[0].{State:LifeCycleState,FS:FileSystemId,User:PosixUser,Root:RootDirectory}'
```

Check that the filesystem and access point still exist and are ready. Compare the enforced UID/GID with the root directory's owner and mode. Directory traversal needs execute permission for the effective identity.

If the root path does not exist, EFS can create it only when its creation configuration provides owner UID, owner GID, and permissions. If the directory already exists, creation defaults do not correct its existing permissions. [Access-point directory rules](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html)

The Lambda local mount path must start with `/mnt/`. It represents the access-point root inside the execution environment; do not append the server-side root a second time when building application paths.

## Verify a fresh environment and a real operation

After repairing configuration, wait for the update to finish and invoke a controlled test version. Test a known read through the local mount path. For a writer, create a unique file, close it, read it back, and remove it from a designated scratch directory.

Then test a controlled concurrency increase. A single warm invocation can miss zone placement and mount-pressure failures. Record invocation error type, function version, target coverage, and the file probe result. Increase function timeout only when evidence shows legitimate initialization work needs more time; it cannot authorize an access point or open TCP 2049.
