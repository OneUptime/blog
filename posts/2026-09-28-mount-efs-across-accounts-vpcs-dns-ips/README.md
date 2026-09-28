# Mount EFS Across AWS Accounts or VPCs with Peering, DNS, and Target IPs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EFS, Networking

Description: Connect EFS clients across accounts or VPCs while keeping routing, DNS resolution, Availability Zone identity, and IAM authorization aligned.

Mounting EFS across an account boundary requires four separate decisions: which mount target to use, how packets reach it, how the client discovers its address, and which identity may use the file system. A working peering connection solves only part of that sequence.

This walkthrough assumes two VPCs with nonoverlapping IPv4 address space and an EFS file system already created in the destination account. Shared-VPC deployments differ: clients in the shared VPC can use ordinary EFS DNS behavior even when their resources belong to another account. [EFS cross-account and cross-VPC access](https://docs.aws.amazon.com/efs/latest/ug/manage-fs-access-vpc-peering.html)

## Establish the private network path

Connect the VPCs with peering or a transit gateway, then install routes in the client and mount-target subnet route tables. The return route matters as much as the outgoing route. Verify that the chosen connection supports the topology; peering does not provide transitive routing through a third VPC. [VPC peering routing requirements](https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-routing.html)

Permit client outbound and target inbound TCP 2049. Where security-group referencing is unsupported for the particular topology, use appropriately scoped source and destination CIDRs. Check stateless subnet ACL return traffic separately.

## Select a target by Availability Zone ID

Account-local zone names such as `us-east-1a` are not a safe cross-account mapping. Use a physical zone ID such as `use1-az2`.

From the client account, inspect the client's subnet:

```bash
aws ec2 describe-subnets \
  --subnet-ids subnet-0123456789abcdef0 \
  --query 'Subnets[0].{Zone:AvailabilityZone,ZoneID:AvailabilityZoneId}'
```

Using authorized credentials in the EFS account, list targets:

```bash
aws efs describe-mount-targets \
  --region us-east-1 \
  --file-system-id fs-0123456789abcdef0 \
  --query 'MountTargets[].{ZoneID:AvailabilityZoneId,IP:IpAddress,State:LifeCycleState}'
```

Prefer an available target with the same zone ID. Document any cross-zone selection so latency, failure exposure, and transfer charges are intentional. AWS's cross-VPC tutorial uses this zone-ID matching process. [EFS target-selection tutorial](https://docs.aws.amazon.com/efs/latest/ug/efs-different-vpc.html)

## Start with an explicit IP while preserving TLS

Install a supported `amazon-efs-utils` package on the client. Use a filesystem ID and the helper's `mounttargetip` option rather than substituting a bare IP into a TLS hostname:

```bash
sudo mkdir -p /mnt/shared
sudo mount -t efs \
  -o tls,iam,accesspoint=fsap-0123456789abcdef0,mounttargetip=10.20.2.40,region=us-east-1 \
  fs-0123456789abcdef0:/ /mnt/shared
```

The explicit target removes DNS discovery from this test. It does not remove the requirements for network reachability, credentials, file-system authorization, or access-point permissions. A target replacement can change the address, so an IP stored in configuration needs an update process. [EFS helper mount options](https://github.com/aws/efs-utils#mount-an-efs-and-s3-file-system)

## Choose a maintainable DNS strategy

For a small fixed deployment, a controlled hosts entry or a private hosted zone containing the required records can be sufficient. For a shared DNS service, configure a Route 53 Resolver inbound endpoint in the EFS VPC and an outbound endpoint in the client VPC. Associate a narrowly scoped forwarding rule with the client VPC that sends the EFS queries to the inbound endpoint IPs. Permit UDP and TCP 53 through the endpoint network path. [Resolver outbound forwarding](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-forwarding-outbound-queries.html), [Resolver inbound endpoints](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-forwarding-inbound-queries.html)

Test the returned target IP from every client zone. Forwarding changes where a query is resolved; it does not guarantee that the resulting target is colocated with the original client. If zone-local selection matters, use explicitly designed zone-specific records or the helper's documented `crossaccount` workflow and its DNS prerequisites. Avoid associating a broad conflicting EFS zone with the provider VPC.

A DNS fallback based on `botocore` is another option, but it adds AWS API credentials and discovery permissions. Treat `DescribeMountTargets` discovery access separately from permission to mount data. [Cross-VPC mount prerequisites](https://docs.aws.amazon.com/efs/latest/ug/mount-fs-different-vpc.html)

## Authorize the client principal

For an IAM-authorized cross-account mount, grant the client role the required EFS client actions and let the destination file-system policy trust that role. Scope permissions to the destination filesystem ARN and, where appropriate, restrict access to the intended access-point ARN with the `elasticfilesystem:AccessPointArn` condition key. Reading requires `ClientMount`; writing additionally needs `ClientWrite`. Grant `ClientRootAccess` only when root behavior is needed. [EFS client authorization](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html)

Finally, verify the mount and perform a read/write probe as the application. Repeat after a client reboot and from each intended zone. Keep the selected target mapping, DNS ownership, and policy principal together in the deployment configuration so an account or network refactor cannot silently separate them.
