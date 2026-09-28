# EFS DNS Failures: VPC Settings, Mount Targets, and Hosted Zone Conflicts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EFS, DNS

Description: Diagnose EFS DNS failures by separating resolver configuration, Availability Zone mount-target placement, and private hosted-zone conflicts.

A failed EFS DNS lookup happens before an NFS authorization decision. Changing the application's POSIX permissions cannot repair it. The useful question is which resolver answered the query, from which VPC and Availability Zone, and whether EFS has a usable mount target there.

This procedure assumes a Linux client in the same VPC as the file system and mount targets with IPv4 addresses. Cross-VPC clients need additional DNS design or a mount-target IP address, supplied explicitly or discovered by the EFS mount helper; ordinary peering does not make the standard EFS name resolve automatically. [Cross-VPC EFS mounting](https://docs.aws.amazon.com/efs/latest/ug/mount-fs-different-vpc.html)

## Capture the actual resolver result

Run these on the mounting client, substituting your region and file-system ID:

```bash
getent ahostsv4 fs-0123456789abcdef0.efs.us-east-1.amazonaws.com
cat /etc/resolv.conf
dig fs-0123456789abcdef0.efs.us-east-1.amazonaws.com A
```

`getent` follows the host's name-service configuration, including `/etc/hosts`; `dig` tests DNS directly. Different answers are a reason to inspect local overrides, resolver caches, and the name-service switch configuration.

Read the DNS status, not only the answer count. `NXDOMAIN` says the responding resolver considers the name nonexistent. `SERVFAIL` points toward a resolver failure. A timeout suggests the resolver cannot be reached or does not answer. Record the responding server shown by `dig`.

For an IPv4-enabled VPC, compare the result with Amazon's link-local resolver from the client:

```bash
dig @169.254.169.253 \
  fs-0123456789abcdef0.efs.us-east-1.amazonaws.com A
```

If that works while the normal query fails, investigate the custom DNS forwarding path and DHCP options. Do not replace a company resolver blindly; it may also provide private application names. [Amazon DNS server behavior](https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html)

## Verify both VPC DNS attributes

```bash
aws ec2 describe-vpc-attribute \
  --vpc-id vpc-0123456789abcdef0 \
  --attribute enableDnsSupport

aws ec2 describe-vpc-attribute \
  --vpc-id vpc-0123456789abcdef0 \
  --attribute enableDnsHostnames
```

Run the CLI in the client's region. Check that both values are enabled for the standard EFS DNS workflow. Inspect these independently: a VPC that resolves public websites can still be configured incorrectly for the private names an application needs. Update the intended VPC configuration through your infrastructure management process. [Viewing and changing VPC DNS attributes](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-dns-updating.html)

## Match the client zone to an available target

```bash
aws efs describe-mount-targets \
  --file-system-id fs-0123456789abcdef0 \
  --query 'MountTargets[].{AZ:AvailabilityZoneName,AZID:AvailabilityZoneId,State:LifeCycleState,IP:IpAddress,VPC:VpcId}' \
  --output table
```

The standard file-system DNS name selects a target in the client's Availability Zone. Check the zone of the actual mounting node, not the Kubernetes control plane or an unrelated bastion. A Regional file system usually needs mount targets covering all zones in which clients are scheduled. EFS permits one target per Availability Zone; a target is not required in every subnet. [Mounting with EFS DNS names](https://docs.aws.amazon.com/efs/latest/ug/mounting-fs-mount-cmd-dns-name.html)

A newly created target may need time for its records to propagate. Use bounded deployment retries that first check target readiness. An indefinite retry loop can conceal a permanent placement error.

## Investigate overlapping private hosted zones

List the private zones directly associated with the affected VPC:

```bash
aws route53 list-hosted-zones-by-vpc \
  --vpc-id vpc-0123456789abcdef0 \
  --vpc-region us-east-1
```

This command does not include associations through Route 53 Profiles. If the VPC uses a Profile, also inspect its hosted-zone associations using `ListProfileResourceAssociations`. [Hosted-zone listing limitations](https://docs.aws.amazon.com/cli/latest/reference/route53/list-hosted-zones-by-vpc.html)

Look for zones that intercept the exact file-system name or a parent such as `efs.us-east-1.amazonaws.com`. In an associated private zone, a missing matching record can return `NXDOMAIN`; Route 53 does not automatically fall back to a public answer. [Private hosted-zone considerations](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-considerations.html)

There is also a creation-time failure: AWS documents that conflicting customer-owned EFS hosted zones can prevent EFS from creating records for new mount targets. A target in `error` therefore deserves a DNS configuration review, not just another mount attempt. Resolve the conflicting zone association deliberately, then recreate the affected target if required by the documented recovery procedure. [EFS mount-target DNS conflicts](https://docs.aws.amazon.com/efs/latest/ug/troubleshooting-efs-mounting.html)

## Finish with a network and mount check

Once the name resolves to an expected target IP, test TCP 2049 and perform the intended TLS/IAM mount. If DNS now works but TCP fails, the DNS repair is complete and the remaining problem is network access. Verify from each client zone and restart or expire relevant application caches through their supported mechanism. Save the resolver answer and target inventory alongside the fix so the next rollout can detect the same mismatch early.
