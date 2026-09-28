# Mount EFS from On-Premises Linux over Direct Connect or VPN with TLS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Linux, NFS, Networking, Encryption

Description: Mount EFS from on-premises Linux over private connectivity with TLS, explicit Region selection, and network and application checks.

Amazon EFS mount targets use private VPC addresses. An on-premises Linux client therefore needs a routed private path through Direct Connect or a VPN before it can mount the file system. TLS protects the NFS connection; it does not establish the route or solve DNS resolution. [AWS on-premises mounting tutorial](https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-helper-direct.html).

This example assumes an existing private connection to the EFS VPC, a Linux distribution supported by the EFS mount helper, and a Regional EFS file system. Use the actual client source addresses seen by AWS if your network performs translation.

## Separate routing, naming, and authorization

Collect four values before changing the client: the file-system ID, AWS Region, selected mount-target IP, and the client network allowed by its security group.

```bash
aws efs describe-mount-targets \
  --region eu-west-2 \
  --file-system-id fs-0123456789abcdef0 \
  --query 'MountTargets[].{AZ:AvailabilityZoneName,IP:IpAddress,State:LifeCycleState}'
```

Choose an available mount target and verify both route directions. The on-premises network needs a route to the mount-target subnet; the VPC route table needs a route back to the client network. An outbound route from the data center alone is insufficient.

Allow TCP 2049 to the mount-target security group from the appropriate private client CIDR. Check on-premises firewalls and stateless network ACLs for return traffic as well. EFS uses the NFS service port; opening port 443 alone does not permit mounting. [EFS network access requirements](https://docs.aws.amazon.com/efs/latest/ug/network-access.html).

On the Linux client, a short TCP connection test helps distinguish reachability from mount authorization:

```bash
ip route get 10.20.2.15
nc -vz -w 3 10.20.2.15 2049
```

A successful TCP handshake proves only that a listener is reachable. It does not prove the client has filesystem access or that TLS negotiation will succeed.

## Install the helper and declare the Region

Install a current supported `amazon-efs-utils` package using AWS's distribution-specific instructions. Record its version and ensure the host's certificate bundle and clock are maintained. [EFS client installation](https://docs.aws.amazon.com/efs/latest/ug/installing-amazon-efs-utils.html).

An on-premises host cannot rely on EC2 instance metadata to discover its Region. Set the file system's Region in `/etc/amazon/efs/efs-utils.conf`, under the existing `[mount]` section:

```ini
[mount]
region = eu-west-2
```

Edit the existing configuration rather than replacing the full file, which contains other helper settings. The [EFS helper configuration](https://github.com/aws/efs-utils/blob/master/dist/efs-utils.conf) documents this Region setting for on-premises mounts. AWS's on-premises procedure documents mapping the EFS hostname to a reachable mount-target IP.

For a durable fleet, manage name resolution centrally and verify its result from the actual client network. For a small deployment, a managed `/etc/hosts` entry can map the standard hostname to a chosen private address. Such a mapping is operationally pinned to that target; it is not automatic AZ failover.

## Mount with TLS and a specific target

For an explicit target, the helper's `mounttargetip` option avoids depending on EFS hostname resolution for target selection:

```bash
sudo mkdir -p /mnt/company-efs
sudo mount -t efs \
  -o tls,mounttargetip=10.20.2.15 \
  fs-0123456789abcdef0:/ /mnt/company-efs
```

Keep the file-system ID in the source argument. The helper needs its filesystem context for a TLS mount; this is different from issuing a plain NFS mount directly against an IP. AWS documents this TLS mount-target-IP form in its [mount-helper examples](https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-helper-ec2-linux.html).

If the file-system policy requires IAM authorization, add `iam` and configure a supported credential source that can refresh on the on-premises client. If it requires an access point, add `accesspoint=fsap-...`. Verify those identities and policy conditions before troubleshooting POSIX writes. TLS by itself neither supplies IAM authorization nor grants filesystem write permissions. [EFS IAM authorization](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html).

## Validate the data path before configuring boot

Inspect the mount and the helper log:

```bash
findmnt /mnt/company-efs
sudo tail -n 80 /var/log/amazon/efs/mount.log
```

A loopback NFS endpoint in mount output can be expected because the helper forwards NFS through a local TLS process. Check the helper's successful TLS startup rather than interpreting loopback as a remote target address.

Run a small write and read as the application user in a designated test directory. Confirm it from another authorized client. A successful root shell write is insufficient if the service runs with a different UID/GID.

Then add an `/etc/fstab` entry, retaining any `iam`, credential-source, and `accesspoint` options required by the tested mount:

```fstab
fs-0123456789abcdef0:/ /mnt/company-efs efs _netdev,tls,mounttargetip=10.20.2.15 0 0
```

Use `_netdev` so the operating system treats it as network storage. If the application must not start without EFS, make its service depend on the mount and test startup with the VPN unavailable. A boot that succeeds while the mount is absent can accidentally direct application writes into the underlying local directory.

## Plan for connection failure

Record another mount target and exercise recovery during a maintenance test. Existing NFS sessions do not automatically migrate merely because a DNS record changes. Stop dependent writers before deliberately replacing a failed mount, and verify application consistency when it returns.

Measure application latency across the private link as well as bandwidth. A metadata-heavy workload can remain slow on a high-bandwidth connection because each remote filesystem operation still crosses the network. Use local caching or move latency-sensitive compute closer to EFS when the measured access pattern requires it.
