# How to Assign an Elastic IP Address to an EC2 Instance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Elastic IP, Networking, Static IP

Description: Learn how to allocate and associate an Elastic IP address with your EC2 instance for a static public IP that persists across stops and starts.

---

By default, when you stop and start an EC2 instance, it gets a new public IP address. That's fine for development, but it's a problem if you have DNS records, firewall rules, or third-party integrations that depend on a stable IP. Elastic IPs solve this by giving you a static public IPv4 address that you control.

This guide covers how to allocate, associate, and manage Elastic IPs, plus the cost implications you need to know about.

## What Is an Elastic IP?

An Elastic IP (EIP) is a static, public IPv4 address that you allocate to your AWS account. Unlike the default public IP that EC2 assigns automatically, an Elastic IP:

- Stays the same even when you stop and start the instance
- Can be moved from one instance to another in seconds
- Belongs to your account until you explicitly release it
- Can be associated with instances or network interfaces

Think of it as owning an IP address instead of renting one temporarily.

## Allocating an Elastic IP

### Via the Console

1. Go to EC2 > Elastic IPs in the left navigation
2. Click "Allocate Elastic IP address"
3. Leave the settings at defaults (Amazon's pool of IPv4 addresses)
4. Click "Allocate"

You now have an Elastic IP, but it's not attached to anything yet.

### Via the AWS CLI

```bash
# Allocate a new Elastic IP address
aws ec2 allocate-address --domain vpc

# Output includes the allocation ID and public IP
# {
#     "PublicIp": "54.123.45.67",
#     "AllocationId": "eipalloc-0123456789abcdef0",
#     "Domain": "vpc"
# }
```

## Associating an Elastic IP with an Instance

### Via the Console

1. Select the Elastic IP you just allocated
2. Click "Actions" > "Associate Elastic IP address"
3. Choose "Instance" as the resource type
4. Select your EC2 instance from the dropdown
5. Optionally select a specific private IP if the instance has multiple
6. Click "Associate"

The instance's old public IP is released, and the Elastic IP takes its place.

### Via the AWS CLI

```bash
# Associate an Elastic IP with an EC2 instance
aws ec2 associate-address \
    --allocation-id eipalloc-0123456789abcdef0 \
    --instance-id i-0123456789abcdef0
```

If the instance already has a public IP, the association replaces it. If you want to reassociate an EIP that's already attached to another instance, add `--allow-reassociation`:

```bash
# Move an Elastic IP from one instance to another
aws ec2 associate-address \
    --allocation-id eipalloc-0123456789abcdef0 \
    --instance-id i-0987654321fedcba0 \
    --allow-reassociation
```

This is really useful for failover scenarios. If your primary instance goes down, you can point the EIP at a standby instance and traffic flows there immediately.

## Verifying the Association

Check that everything worked:

```bash
# Verify the Elastic IP is associated correctly
aws ec2 describe-addresses \
    --allocation-ids eipalloc-0123456789abcdef0

# Check the instance's public IP
aws ec2 describe-instances \
    --instance-ids i-0123456789abcdef0 \
    --query 'Reservations[0].Instances[0].PublicIpAddress'
```

You can also SSH in to verify from the instance side:

```bash
# From inside the instance, check the public IP
curl http://checkip.amazonaws.com
```

## Cost Implications

Elastic IP pricing changed in February 2024. Here's what you need to know:

**Elastic IPs associated with running instances**: $0.005 per hour (roughly $3.60/month per EIP). This applies to ALL public IPv4 addresses on AWS, not just Elastic IPs.

**Elastic IPs NOT associated with any instance**: Additional charge on top of the base rate. AWS charges more for idle Elastic IPs to discourage hoarding.

**Elastic IPs on stopped instances**: Also incur the idle charge. If you stop an instance, its Elastic IP keeps costing you.

The takeaway: only allocate Elastic IPs you're actively using. Release ones you don't need.

```bash
# Check all your Elastic IPs and their association status
aws ec2 describe-addresses \
    --query 'Addresses[*].[PublicIp,InstanceId,AssociationId]' \
    --output table
```

## Disassociating and Releasing

When you no longer need an Elastic IP:

```bash
# Step 1: Disassociate from the instance
aws ec2 disassociate-address \
    --association-id eipassoc-0123456789abcdef0

# Step 2: Release the Elastic IP back to AWS
aws ec2 release-address \
    --allocation-id eipalloc-0123456789abcdef0
```

Once released, the IP address goes back into Amazon's pool. You can't get the same IP back, so only release it if you're sure you don't need it.

## Using Elastic IPs for DNS

One of the most common reasons to use an Elastic IP is to point a DNS record at it. Since the IP doesn't change, your DNS stays valid:

```
# Example DNS record in Route 53 or your DNS provider
Type: A
Name: api.example.com
Value: 54.123.45.67  (your Elastic IP)
TTL: 300
```

Without an Elastic IP, you'd need to update DNS every time the instance stops and starts. With one, the record stays permanent.

That said, for web applications behind a load balancer, you typically don't need Elastic IPs at all. The load balancer provides a stable DNS name (CNAME), and the instances behind it can use ephemeral IPs.

## Elastic IP Limits

By default, each AWS account gets 5 Elastic IPs per region. You can request an increase through the Service Quotas console, but AWS wants you to justify the request. They're conservative because IPv4 addresses are a limited global resource.

If you need more than 5, consider whether you actually need them:

- Are some EIPs unused? Release them.
- Can you use a load balancer instead? ALBs/NLBs provide stable endpoints without consuming EIPs.
- Can you use a NAT Gateway for outbound traffic from private instances?

## Elastic IPs with Network Interfaces

You can also associate an Elastic IP with a specific Elastic Network Interface (ENI) instead of an instance. This is useful in advanced networking scenarios:

```bash
# Associate an EIP with a network interface
aws ec2 associate-address \
    --allocation-id eipalloc-0123456789abcdef0 \
    --network-interface-id eni-0123456789abcdef0
```

When you associate with an ENI, you can move the entire network interface (with its Elastic IP, private IP, and security groups) from one instance to another. This is useful for high-availability setups where a failover instance needs to take over the exact network identity of the failed instance.

## Failover Pattern

Here's a practical failover script that moves an Elastic IP from a failing instance to a standby:

```bash
#!/bin/bash
# Simple failover script: move Elastic IP to standby instance

ALLOC_ID="eipalloc-0123456789abcdef0"
STANDBY_INSTANCE="i-0987654321fedcba0"
PRIMARY_INSTANCE="i-0123456789abcdef0"

# Check if primary is healthy
HEALTH=$(aws ec2 describe-instance-status \
    --instance-ids $PRIMARY_INSTANCE \
    --query 'InstanceStatuses[0].InstanceStatus.Status' \
    --output text)

if [ "$HEALTH" != "ok" ]; then
    echo "Primary instance unhealthy. Moving Elastic IP to standby..."

    aws ec2 associate-address \
        --allocation-id $ALLOC_ID \
        --instance-id $STANDBY_INSTANCE \
        --allow-reassociation

    echo "Elastic IP moved to $STANDBY_INSTANCE"
fi
```

For production failover, you'd want something more robust - probably using a load balancer, Auto Scaling, or a proper HA solution. But this pattern works for simple setups.

Set up [monitoring with OneUptime](https://oneuptime.com) to detect when your primary instance goes down so you can trigger failover automatically or get alerted immediately.

## Best Practices

1. **Don't use EIPs when a load balancer will do.** ALBs and NLBs are almost always a better choice for public-facing services.

2. **Tag your Elastic IPs.** Include the service name, environment, and purpose so you know what each one is for six months from now.

3. **Monitor for unassociated EIPs.** They cost money and serve no purpose. Set up a CloudWatch alarm or periodic audit.

4. **Document the association.** Keep a record of which EIP goes with which service. When an EIP is just an IP address in a console, it's easy to lose track.

5. **Consider IPv6.** If your infrastructure supports it, IPv6 addresses are free and effectively unlimited. Not everything supports IPv6 yet, but it's worth considering for new deployments.

Elastic IPs are a simple but essential tool in your AWS networking toolkit. Use them when you need a stable IP address, but don't overuse them - there are often better architectural solutions for the problems people try to solve with static IPs.
