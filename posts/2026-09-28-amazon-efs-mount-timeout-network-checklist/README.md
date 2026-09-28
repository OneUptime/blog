# EFS Mount Timeouts: Mount Targets, Port 2049, Security Groups, Routes, NACLs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EFS, Networking

Description: Trace an EFS mount timeout from the actual mount-target IP through TCP 2049, security groups, subnet routes, and stateless network ACLs.

An EFS mount that waits and eventually times out usually needs a network investigation. Start with the client that actually mounts the volume: an EC2 instance, an ECS task network interface, or an EKS worker node. A successful connection from an administrator's laptop does not establish that this client can reach EFS.

The examples below assume a Linux client and IPv4 mount targets. Replace the resource IDs and region before running commands. Keep the failing command and its complete output; a DNS lookup failure and a server authorization rejection require different follow-up work.

## Identify the destination before changing rules

Ask EFS which mount targets currently exist:

```bash
aws efs describe-mount-targets \
  --region us-east-1 \
  --file-system-id fs-0123456789abcdef0 \
  --query 'MountTargets[].{Id:MountTargetId,IP:IpAddress,State:LifeCycleState,AZ:AvailabilityZoneId,Subnet:SubnetId,ENI:NetworkInterfaceId}' \
  --output table
```

Choose an `available` target reachable from the client, preferably in the same Availability Zone. Compare its IP with the address returned on that client:

```bash
getent ahostsv4 fs-0123456789abcdef0.efs.us-east-1.amazonaws.com
```

A stale hosts-file entry or a hard-coded IP can point at a deleted target. AWS explicitly lists an incorrect destination address as a cause of mount timeouts. Fix the address before widening a firewall. [EFS mount troubleshooting](https://docs.aws.amazon.com/efs/latest/ug/troubleshooting-efs-mounting.html)

## Test one TCP connection

```bash
nc -vz -w 5 10.20.2.40 2049
ip route get 10.20.2.40
```

Run these on the mounting client. A successful TCP handshake narrows the problem to later stages; it does not prove that TLS, IAM, or an access point will authorize the mount. A failed ping is not useful evidence about NFS, because ICMP is a different protocol.

For packet-level evidence, collect a short capture while repeating the connection test:

```bash
sudo tcpdump -ni any 'host 10.20.2.40 and tcp port 2049'
```

Repeated SYN packets without a reply suggest a blocked or missing network path. A completed handshake followed by a mount rejection sends the investigation toward the helper logs and file-system policy.

## Inspect the security groups actually attached

Retrieve the target's groups using the target ID from the first command:

```bash
aws efs describe-mount-target-security-groups \
  --region us-east-1 \
  --mount-target-id fsmt-0123456789abcdef0
```

Inspect the mounting client's ENI as well. The effective pair of rules should permit client outbound TCP 2049 and target inbound TCP 2049 from that client. An inbound rule referencing a security group helps only when that group is attached to the originating network interface and the network topology supports that reference. An outbound rule instead references the destination network interface's group. [EFS security-group requirements](https://docs.aws.amazon.com/efs/latest/ug/network-access.html)

A common mistake is authorizing an ECS instance group when the traffic comes from a Fargate task group, or authorizing a workload group when the CSI mount originates on the worker node. Record the source ENI rather than guessing from an application name.

## Check both subnet route tables and ACL directions

For traffic inside one VPC, inspect the applicable local route and any more specific routes or appliances. For peering or a transit gateway, check both directions: the client subnet needs a route to the target network, and the target subnet needs a return route to the client network. An internet gateway or NAT gateway does not make a private EFS target publicly accessible.

Network ACLs are stateless. For a TCP connection from client source port `P` to target port 2049, the path needs:

| Subnet boundary | Required packet direction |
| --- | --- |
| Client outbound | Destination target IP, TCP 2049 |
| Target inbound | Source client IP, TCP 2049 |
| Target outbound | Destination client IP, TCP port P |
| Client inbound | Source target IP, TCP port P |

Choose return-port ranges from the client configuration and the supported operating systems. Do not assume every NFS connection uses a privileged source port. Include lower-numbered deny rules in the review because ACL evaluation stops at the first match. [VPC network ACL rules](https://docs.aws.amazon.com/vpc/latest/userguide/nacl-rules.html)

## Prove recovery with the intended mount

After the TCP test succeeds, retry the original EFS helper command with its required TLS, IAM, and access-point options. Confirm the mount with `findmnt -M /mnt/efs -t nfs,nfs4`, check that it is the intended EFS mount, then read a known file as the application identity. If the application writes, create and remove a uniquely named test file in an approved directory.

Keep the observed client ENI, target IP, route, and rule change in the incident record. Repeat from another affected subnet or Availability Zone before declaring a fleet-wide repair; a single healthy target can hide a missing rule on the next placement.
