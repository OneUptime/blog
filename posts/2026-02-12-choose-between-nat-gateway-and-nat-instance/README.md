# How to Choose Between NAT Gateway and NAT Instance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Networking, NAT, Cost Optimization

Description: Compare NAT gateway and NAT instance options for private subnet internet access, covering performance, cost, availability, and management trade-offs.

---

When your private subnet needs outbound internet access, you have two options: a managed NAT gateway or a self-managed NAT instance. They do the same basic job - translate private IPs to public IPs for outbound traffic - but the implementation, cost, performance, and operational burden are wildly different.

The short answer for most people is: use a NAT gateway. But "most people" doesn't mean everyone, and there are genuine scenarios where a NAT instance makes more sense. Let's break it down properly.

## NAT Gateway: The Managed Option

AWS NAT gateways are fully managed. You create one, point routes at it, and forget about it. AWS handles the scaling, patching, and availability.

Key characteristics:
- Bandwidth scales automatically up to 100 Gbps
- Redundant within a single availability zone
- No OS patching, no maintenance
- Fixed pricing: ~$0.045/hour + $0.045/GB processed
- Cannot be used as a bastion host

## NAT Instance: The DIY Option

A NAT instance is just a regular EC2 instance running Amazon Linux with IP forwarding enabled and source/destination check disabled. You manage everything - the OS, the scaling, the monitoring, the failover.

Key characteristics:
- Bandwidth limited by instance type
- Single instance (unless you build your own HA)
- You patch the OS, monitor the instance, handle failures
- Cost based on EC2 instance pricing
- Can double as a bastion host
- Supports port forwarding and security group rules

## Side-by-Side Comparison

Here's the honest comparison:

```
Feature              NAT Gateway           NAT Instance
-------------------------------------------------------------
Availability         Redundant in AZ       Single instance
Bandwidth            Up to 100 Gbps        Instance-dependent
Maintenance          None (managed)        You handle it
Cost (baseline)      ~$32/month            t3.nano: ~$3.75/month
Cost (data)          $0.045/GB             Standard EC2 data rates
Security groups      No (uses NACLs)       Yes
Port forwarding      No                    Yes
Bastion host         No                    Yes
Scaling              Automatic             Manual
```

## When to Use NAT Gateway

Use a NAT gateway when:

**You need reliability.** NAT gateways are redundant within an AZ and can handle failover automatically. If uptime matters, this is the safe choice.

**You have significant traffic.** NAT gateways scale to 100 Gbps without intervention. A NAT instance would require careful sizing and possibly manual scaling.

**You don't want operational overhead.** No patching, no monitoring (beyond basic CloudWatch), no recovering from crashes. It just works.

**Your data transfer costs exceed the NAT gateway premium.** Once you're processing enough data, the simplicity premium of the NAT gateway becomes negligible compared to total costs.

Here's the typical NAT gateway setup:

```bash
# Create a NAT gateway - the managed way
EIP=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text)

NAT_GW=$(aws ec2 create-nat-gateway \
  --subnet-id $PUBLIC_SUBNET \
  --allocation-id $EIP \
  --query 'NatGateway.NatGatewayId' \
  --output text)

aws ec2 wait nat-gateway-available --nat-gateway-ids $NAT_GW

# Route private traffic through the NAT gateway
aws ec2 create-route \
  --route-table-id $PRIVATE_RT \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NAT_GW
```

## When to Use a NAT Instance

Use a NAT instance when:

**Budget is extremely tight.** A t3.nano costs about $3.75/month compared to $32/month for a NAT gateway. For dev/test environments where you don't care about HA, this saves real money.

**You need port forwarding.** NAT gateways don't support port forwarding. If you need to forward specific ports, a NAT instance is your only option.

**You want a combined bastion/NAT host.** A NAT instance can double as a bastion host for SSH access to private instances. One instance, two purposes.

**Your traffic is minimal.** If you're just running a small dev environment that occasionally downloads packages, paying $32/month for a NAT gateway is overkill.

## Setting Up a NAT Instance

Here's how to create a NAT instance from scratch:

```bash
# Step 1: Launch an instance with the Amazon Linux AMI
INSTANCE_ID=$(aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type t3.nano \
  --subnet-id $PUBLIC_SUBNET \
  --security-group-ids $NAT_SG \
  --key-name my-key \
  --query 'Instances[0].InstanceId' \
  --output text)

# Step 2: Disable source/destination check (critical!)
aws ec2 modify-instance-attribute \
  --instance-id $INSTANCE_ID \
  --no-source-dest-check

# Step 3: Allocate and associate an EIP
EIP=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text)
aws ec2 associate-address --allocation-id $EIP --instance-id $INSTANCE_ID
```

Then configure IP forwarding on the instance itself:

```bash
# Run these ON the NAT instance (via SSH or user data)

# Enable IP forwarding
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/nat.conf

# Set up iptables NAT rules
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sudo iptables -A FORWARD -i eth0 -o eth0 -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i eth0 -o eth0 -j ACCEPT

# Save iptables rules so they persist across reboots
sudo iptables-save | sudo tee /etc/iptables.rules
```

You can automate this with user data:

```bash
#!/bin/bash
# User data script for NAT instance
yum update -y
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
sysctl -p
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
iptables -A FORWARD -i eth0 -o eth0 -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i eth0 -o eth0 -j ACCEPT
iptables-save > /etc/iptables.rules
echo "iptables-restore < /etc/iptables.rules" >> /etc/rc.local
chmod +x /etc/rc.local
```

Finally, route private subnet traffic to the NAT instance:

```bash
# Route through the NAT instance instead of a NAT gateway
aws ec2 create-route \
  --route-table-id $PRIVATE_RT \
  --destination-cidr-block 0.0.0.0/0 \
  --instance-id $INSTANCE_ID
```

## Cost Analysis

Let's do the math for different scenarios.

**Low traffic (10 GB/month):**
- NAT Gateway: $32 (hourly) + $0.45 (data) = $32.45/month
- NAT Instance (t3.nano): $3.75/month
- Savings with NAT instance: ~$28.70/month

**Medium traffic (500 GB/month):**
- NAT Gateway: $32 + $22.50 = $54.50/month
- NAT Instance (t3.small): $15.18/month
- Savings with NAT instance: ~$39.32/month

**High traffic (5 TB/month):**
- NAT Gateway: $32 + $225 = $257/month
- NAT Instance (c5.large): $62.05/month
- Savings with NAT instance: ~$195/month

The savings are significant, especially at scale. But factor in the engineering time to manage, monitor, and troubleshoot the NAT instance. If your team's time costs $150/hour, even a few hours of NAT instance maintenance per month erases the savings.

## Building HA for NAT Instances

If you go the NAT instance route and need HA, you'll have to build it yourself. One approach uses Auto Scaling with a health check:

```yaml
# CloudFormation snippet for HA NAT instance
NatInstanceASG:
  Type: AWS::AutoScaling::AutoScalingGroup
  Properties:
    MinSize: 1
    MaxSize: 1
    DesiredCapacity: 1
    VPCZoneIdentifier:
      - !Ref PublicSubnet1
    LaunchTemplate:
      LaunchTemplateId: !Ref NatLaunchTemplate
      Version: !GetAtt NatLaunchTemplate.LatestVersionNumber
    HealthCheckType: EC2
    HealthCheckGracePeriod: 120
    Tags:
      - Key: Name
        Value: nat-instance
        PropagateAtLaunch: true
```

This restarts the NAT instance if it fails, but there's downtime while the new instance spins up. It's not as seamless as a managed NAT gateway.

## My Recommendation

For production: always use NAT gateways. The reliability and zero-maintenance factor is worth the cost.

For dev/test: NAT instances are fine. Save the money, accept the trade-offs.

For staging: NAT gateway with a single instance (no per-AZ HA). It's a compromise between cost and reliability.

For more on the complete VPC networking setup, see [creating a VPC from scratch](https://oneuptime.com/blog/post/create-vpc-from-scratch-in-aws/view).

## Wrapping Up

NAT gateways and NAT instances solve the same problem differently. NAT gateways trade money for simplicity and reliability. NAT instances trade operational effort for cost savings. Pick the right tool for your situation, and don't feel bad about using NAT instances in non-production environments. Saving $30/month per environment across a dozen environments is $360/month - that's real money.
