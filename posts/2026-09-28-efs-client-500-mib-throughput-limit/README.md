# EFS Client Stuck Near 500 MiB/s: Versions, NFS Parallelism, and Throughput

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, NFS, Performance

Description: Separate EFS client throughput ceilings from aggregate limits, then check client versions, mount settings, and workload parallelism.

An EFS file system can have unused aggregate capacity while one reader stays near 500 MiB/s. Adding Provisioned throughput may leave that reader unchanged because the bottleneck is per client, the workload is serial, or the EC2 instance cannot move data faster.

Treat 500 MiB/s as a useful clue, not a diagnosis. Start by identifying the actual file-system configuration, client software, mount path, and workload before changing capacity.

## Check which client limit applies

AWS currently documents up to **1,500 MiB/s combined read and write throughput per client** for eligible Elastic file systems mounted using version 2.0 or later of the EFS client or EFS CSI driver. Other configurations retain the 500 MiB/s limit; the performance table lists One Zone separately at 500 MiB/s. These are maximums, not guaranteed application rates. [EFS performance specifications](https://docs.aws.amazon.com/efs/latest/ug/performance.html).

```bash
aws efs describe-file-systems \
  --region us-east-1 \
  --file-system-id fs-0123456789abcdef0 \
  --query 'FileSystems[0].{Throughput:ThroughputMode,Performance:PerformanceMode,AZ:AvailabilityZoneName}'
```

On a Linux host, collect evidence without changing the mount:

```bash
mount.efs --version
uname -r
findmnt -rn -t nfs,nfs4 -o TARGET,SOURCE,OPTIONS
nfsstat -m
```

Record how the mount was created. Installing a newer package does not reconstruct an already established mount. For ECS or Kubernetes, identify the image or managed component performing the mount rather than assuming the application container's package version controls it. In EKS, inspect the deployed EFS CSI node image and its release details.

## Separate the four ceilings

Draw the data path as application → client → network → file system. Each stage has its own budget.

First, divide the `Sum` of `MeteredIOBytes` by the period in seconds and compare the result with the `Average` of `PermittedThroughput` over the same period (both in bytes per second). If aggregate utilization is already high, increasing a client's capabilities cannot create file-system headroom. If credits are exhausted in Bursting, resolve that condition separately. [EFS metrics](https://docs.aws.amazon.com/efs/latest/ug/efs-metrics.html).

Second, check the EC2 instance's published network capacity, current receive/transmit rate, CPU use, and retransmissions. A 500 MiB/s payload is roughly 4.2 Gbit/s before protocol overhead. A small instance, shared network traffic, or CPU saturation can explain an apparent storage plateau. Use the instance's actual specification and [EC2 network bandwidth guidance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html).

Third, inspect the application. One thread reading small blocks and waiting after every operation cannot necessarily fill the connection. Record file size, request size, worker count, and whether reads repeatedly hit local cache.

Finally, examine the mount. Prefer the EFS mount helper and AWS-recommended NFS settings. Avoid disabling attribute caches as an attempted speed fix. Those changes often multiply metadata round trips. AWS's [performance tips](https://docs.aws.amazon.com/efs/latest/ug/performance-tips.html) describe parallelism, request size, and cache effects.

## Run a controlled scaling experiment

Use a read-only benchmark against disposable or approved test data, with enough files and bytes to distinguish cache effects from remote reads. Do not generate load against a busy production mount without a capacity window.

Measure these cases while collecting application throughput and CloudWatch data:

1. One worker on one client.
2. Several workers reading distinct files on that client.
3. The same workload spread across two comparable clients.
4. The first two cases after an approved client upgrade and clean remount.

Keep instance type, dataset, storage class, and read/write mix fixed. If throughput grows with workers and then plateaus, you have evidence of a shared ceiling. If two clients exceed the one-client plateau in aggregate, the file system was not the first bottleneck. If neither test improves, investigate the shared network or file-system budget before deploying more workers.

Use MiB/s consistently. Some tools display decimal MB/s, and the read/write limit is combined rather than a separate full allocation for each direction. A mixed workload therefore needs a different comparison from a read-only test.

## Upgrade and verify with a maintenance plan

Follow the [EFS client installation instructions](https://docs.aws.amazon.com/efs/latest/ug/using-amazon-efs-utils.html) for the operating system. Drain application work before unmounting and remounting with the new helper. For CSI-managed mounts, use the driver's supported rollout process and account for its effect on nodes and pods.

Repeat the workload after the change and verify sustained useful throughput, latency, CPU consumption, and errors. Success is the application meeting its target under representative concurrency. A newer client removes one potential limit; it does not turn a serial reader, insufficient network link, or overloaded file system into a 1,500 MiB/s workload.
