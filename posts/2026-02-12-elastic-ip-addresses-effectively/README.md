# How to Use Elastic IP Addresses Effectively

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Networking, EC2

Description: A practical guide to using Elastic IP addresses in AWS effectively, covering allocation, association, cost optimization, and alternatives for modern architectures.

---

Elastic IP addresses (EIPs) give you a static public IPv4 address that you can attach to instances, NAT gateways, or network interfaces in your VPC. Unlike regular public IPs that change when you stop and start an instance, an EIP stays the same until you explicitly release it. This makes them useful for scenarios where external systems need to reach your resources at a predictable address.

But EIPs come with some quirks and costs that catch people off guard. Let's dig into how to use them properly.

## Allocating an Elastic IP

Allocating an EIP reserves a public IP address in your account. It doesn't cost anything while it's associated with a running instance - but it does cost money if it's allocated and not associated, or associated with a stopped instance.

```bash
# Allocate an Elastic IP address
aws ec2 allocate-address --domain vpc

# Output includes the allocation ID and the IP address
# {
#   "PublicIp": "52.1.2.3",
#   "AllocationId": "eipalloc-0123456789abcdef0",
#   "Domain": "vpc"
# }
```

The `--domain vpc` flag is important - it allocates a VPC EIP rather than an EC2-Classic one. Since EC2-Classic is retired, this is technically the only option now, but older documentation sometimes omits it.

## Associating an EIP with an Instance

Once allocated, you need to associate the EIP with a resource.

```bash
# Associate the EIP with an EC2 instance
aws ec2 associate-address \
  --allocation-id eipalloc-0123456789abcdef0 \
  --instance-id i-0abc123def456789

# Or associate with a specific network interface
aws ec2 associate-address \
  --allocation-id eipalloc-0123456789abcdef0 \
  --network-interface-id eni-0abc123def456789
```

When you associate an EIP with an instance that already has a public IP, the existing public IP is released back to the pool and replaced by the EIP. The instance's private IP doesn't change.

You can also associate an EIP with a specific private IP on instances that have multiple private IPs. This is useful for hosting multiple websites on a single instance, each with its own public IP.

```bash
# Associate EIP with a specific private IP on a multi-IP instance
aws ec2 associate-address \
  --allocation-id eipalloc-0123456789abcdef0 \
  --network-interface-id eni-0abc123def456789 \
  --private-ip-address 10.0.1.15
```

## EIP Costs

AWS charges for EIPs in a few scenarios:

1. **An EIP that's allocated but not associated** - You pay an hourly fee. AWS does this to discourage hoarding scarce IPv4 addresses.
2. **An EIP associated with a stopped instance** - Same hourly fee.
3. **Additional EIPs on a running instance** - The first EIP on a running instance is free, but each additional one costs money.
4. **Data transfer** - Standard data transfer charges apply to traffic through an EIP, same as any other public IP.

Starting in February 2024, AWS also charges for all public IPv4 addresses, including EIPs associated with running instances. This changed the economics significantly.

```bash
# Check your current EIP allocations
aws ec2 describe-addresses \
  --query 'Addresses[*].{IP:PublicIp,Allocated:AllocationId,Associated:AssociationId,Instance:InstanceId}' \
  --output table
```

Run this periodically to find orphaned EIPs that are costing you money for no reason.

## Moving an EIP Between Instances

One of the best use cases for EIPs is failover. You can quickly move an EIP from a failed instance to a replacement.

```bash
# Disassociate from the current instance
aws ec2 disassociate-address \
  --association-id eipassoc-0123456789abcdef0

# Associate with the replacement instance
aws ec2 associate-address \
  --allocation-id eipalloc-0123456789abcdef0 \
  --instance-id i-replacement-instance
```

This operation takes a few seconds, during which the IP is briefly not routable. For automated failover, you can script this as part of a health check workflow. Though for most production workloads, an Application Load Balancer with health checks is a better approach - see the alternatives section below.

## Using EIPs with NAT Gateways

NAT gateways require an Elastic IP. This is one of the cases where you can't avoid using an EIP.

```bash
# Allocate an EIP for the NAT gateway
aws ec2 allocate-address --domain vpc

# Create a NAT gateway with the EIP
aws ec2 create-nat-gateway \
  --subnet-id subnet-0abc123 \
  --allocation-id eipalloc-0123456789abcdef0
```

If your outbound traffic needs to come from a predictable IP (for firewall whitelisting on the other end), the NAT gateway's EIP gives you that. This is common when integrating with partners or third-party APIs that require you to whitelist specific IPs.

## Terraform Configuration

```hcl
# Allocate an EIP
resource "aws_eip" "web" {
  domain = "vpc"

  tags = {
    Name = "web-server-eip"
  }
}

# Associate with an instance
resource "aws_eip_association" "web" {
  instance_id   = aws_instance.web.id
  allocation_id = aws_eip.web.id
}

# EIP for NAT gateway
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "nat-gateway-eip"
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id
}
```

## EIP Limits

The default limit is 5 EIPs per region per account. You can request an increase through the AWS Service Quotas console, but AWS will want a justification. They're protective of IPv4 addresses because the global pool is exhausted.

```bash
# Check your current EIP limit
aws service-quotas get-service-quota \
  --service-code ec2 \
  --quota-code L-0263D0A3 \
  --query 'Quota.Value'
```

## When NOT to Use Elastic IPs

For most modern architectures, there are better alternatives to EIPs:

**Use a Load Balancer** - If you're running a web service, put it behind an ALB or NLB. The load balancer handles the public IP, and you can scale instances behind it without worrying about IP addresses. DNS points to the load balancer, not individual instances.

**Use Route 53 with health checks** - For DNS-based failover, Route 53 health checks can automatically switch DNS to a healthy endpoint. See our guide on Route 53 health checks at https://oneuptime.com/blog/post/2026-02-12-route-53-health-checks/view.

**Use AWS Global Accelerator** - If you need static IPs for your application, Global Accelerator gives you two static anycast IPs that route to your backends. It's more resilient than a single EIP.

**Use IPv6** - IPv6 addresses on instances are static by default and don't have the scarcity problems of IPv4. If your clients support IPv6, this is worth considering.

EIPs still have their place - NAT gateways need them, some legacy integrations require whitelisted IPs, and some regulatory requirements mandate static addressing. But reach for an EIP as a last resort rather than a first choice. For more on managing EIP lifecycle, see https://oneuptime.com/blog/post/2026-02-12-release-and-recover-elastic-ip-addresses/view.
