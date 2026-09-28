# Find EFS Clients Before Deleting a Mount Target to Avoid Hung df Processes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, NFS, Linux

Description: Inventory EFS clients, drain active mounts, and verify dependencies before deleting a mount target without stranding NFS processes.

Deleting an EFS mount target while clients still use it can leave ordinary commands waiting on NFS. A monitoring script that runs `df` against every mounted file system may then appear stuck even though its local disks are healthy.

The safe sequence is to find consumers, stop their work, unmount successfully, and only then delete the target. AWS explicitly warns that target deletion breaks existing mounts. [Deleting EFS mount targets](https://docs.aws.amazon.com/efs/latest/ug/mount-target-delete.html).

## Identify the exact network endpoint

Start with a read-only inventory:

```bash
aws efs describe-mount-targets \
  --region us-east-1 \
  --file-system-id fs-0123456789abcdef0 \
  --query 'MountTargets[].{Target:MountTargetId,IPv4:IpAddress,IPv6:Ipv6Address,ENI:NetworkInterfaceId,AZ:AvailabilityZoneName,Subnet:SubnetId,State:LifeCycleState}'
```

Save the mount-target ID, IPv4 and IPv6 addresses (where present), ENI, and Availability Zone in the maintenance record. Avoid selecting a target merely because its name looks old. Cross-AZ mounts, static IP mount commands, on-premises consumers, and peered networks can invalidate assumptions about which hosts use it.

Inspect infrastructure configuration for the file-system ID, access-point IDs, DNS name, and target IP addresses. Include EC2 launch templates and boot mounts, ECS task definitions, Lambda file-system configuration, and EKS persistent volumes. Stopped workloads matter: a scheduled job can recreate a dependency after today's active connections disappear.

## Combine traffic evidence with configuration

The EFS `ClientConnections` metric gives a file-system connection count, not a list of owners for an individual mount target. Use it as a trend and cross-check, not proof that a particular endpoint is unused. [EFS metrics](https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html).

If VPC Flow Logs already cover the target ENI, query accepted traffic to all of its IPv4 and IPv6 addresses on TCP 2049. Map observed source IPs back to instances, task ENIs, Kubernetes nodes, or connected networks. Flow logs are retrospective evidence with delivery and aggregation delay; an idle client may be absent from the chosen window. [VPC Flow Logs](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html).

Compare traffic across a period containing scheduled activity. Investigate unfamiliar sources before changing a security group to block them: blocking traffic can create the same hanging-client problem you are trying to prevent.

## Inspect mounts without traversing remote files

On each Linux host, start from the kernel's mount table:

```bash
rg ' - nfs4? ' /proc/self/mountinfo
ss -tnp '( dport = :2049 )'
```

The mount table describes the calling process's mount namespace. Containers can have different namespaces, so inspect the host and relevant runtime-managed mounts. `/proc` exposes process and mount information through kernel interfaces. [Linux proc documentation](https://docs.kernel.org/filesystems/proc.html).

With TLS mounts, the NFS source may appear as a loopback address because the EFS helper runs a local proxy. Correlate the helper's mount configuration and logs with the proxy's remote connection. The loopback source is not evidence that the mount is local disk.

Avoid recursive `find`, `du`, and broad directory listings as discovery tools on a mount already suspected to be unresponsive. They can add more blocked operations. Likewise, repeatedly wrapping `df` in a timeout does not guarantee that a task blocked in uninterruptible kernel I/O immediately exits.

## Drain before deleting

Assign an owner to every consumer. Stop or pause the application, drain in-flight requests, and disable automatic restarts and scheduled jobs for the maintenance window. Complete application-specific checkpoints before unmounting.

```bash
sudo umount /mnt/efs
```

For Kubernetes or ECS, let the orchestrator stop the workload and release its mounts through its normal lifecycle. Hand-unmounting a runtime-managed volume can conflict with reconciliation.

If unmount reports “busy,” identify open files or working directories while the server is reachable, stop the owners, and retry. AWS recommends normal unmount behavior. Lazy detach is not evidence that outstanding I/O finished; forced unmount can interrupt it. [Unmounting EFS](https://docs.aws.amazon.com/efs/latest/ug/unmounting-fs.html), [mount troubleshooting](https://docs.aws.amazon.com/efs/latest/ug/troubleshooting-efs-mounting.html).

Once every affected namespace is clear and restart configuration is corrected, perform the intended deletion:

```bash
aws efs delete-mount-target \
  --region us-east-1 \
  --mount-target-id fsmt-0123456789abcdef0
```

Re-run the target inventory until the deleted target disappears. Verify unaffected workloads and resume migrated consumers against their intended endpoints.

## If deletion already stranded a client

Prevent new work from entering the affected application and capture its mount and process state. AWS documents that replacing a deleted file system and mount target with a new file system and mount target at the same IP address can cause “bad file handle” errors, resolved by unmounting and remounting. Reusing an IP address does not preserve the old file system’s file handles.

Use an application-approved recovery sequence that accounts for outstanding writes. Do not hide an unavailable mount with a new local directory and let the service write there accidentally. Before resuming, verify the actual mounted file system, read a known marker, and perform an authorized write test as the service identity. Retirement succeeds when all clients are accounted for and healthy, not merely when the control-plane deletion finishes.
