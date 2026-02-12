# How to Configure Source/Destination Check on EC2 for NAT Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, NAT, Networking, VPC

Description: Learn how to disable source/destination checks on EC2 instances to enable NAT, routing, and firewall functionality within your VPC.

---

By default, every EC2 instance performs a source/destination check on all network traffic. This means the instance will only accept traffic where it's either the source or the destination. That's sensible for regular instances, but it completely breaks use cases like NAT instances, VPN gateways, firewalls, and load balancers - anything where the instance needs to forward traffic that isn't addressed to it.

Disabling this check is a one-line command, but understanding when and why you need it is just as important.

## What Is Source/Destination Checking?

When source/destination checking is enabled, AWS verifies that the instance is either the source or the destination of any traffic it sends or receives. If the instance tries to forward a packet where neither the source nor destination IP matches its own, AWS drops it silently.

Think about a NAT instance: it receives packets from private subnet instances (source: private IP, destination: internet IP). The NAT instance needs to forward those packets to the internet. Since neither the source nor destination is the NAT instance's own IP, the traffic gets dropped unless you disable the check.

```mermaid
graph LR
    A[Private Instance<br/>10.0.2.50] -->|Dst: 8.8.8.8| B[NAT Instance<br/>10.0.1.10]
    B -->|Dst: 8.8.8.8| C[Internet Gateway]
    C --> D[Internet]

    style B fill:#f96,stroke:#333
```

In this diagram, the NAT instance (orange) receives traffic destined for 8.8.8.8 but its own IP is 10.0.1.10. Without disabling source/destination check, this traffic never makes it through.

## When to Disable Source/Destination Check

You should disable this check whenever your instance acts as a network intermediary:

- **NAT instances** - forwarding traffic from private subnets to the internet
- **VPN gateways** - routing encrypted tunnel traffic
- **Software firewalls** - inspecting and forwarding traffic between subnets
- **Load balancers** - distributing traffic to backend servers
- **Network monitoring** - instances doing packet capture or traffic mirroring
- **Kubernetes/Docker networking** - container networking overlays sometimes need this

If your instance is just a regular application server that sends and receives its own traffic, leave the check enabled. It's a useful security feature for those cases.

## Disabling Source/Destination Check via AWS CLI

The command itself is straightforward. You can run it on a running instance without any downtime.

Disable source/destination check on an instance:

```bash
# Disable source/destination check on a specific instance
aws ec2 modify-instance-attribute \
  --instance-id i-0abc123def456789 \
  --no-source-dest-check
```

To verify the current setting:

```bash
# Check the source/destination check status
aws ec2 describe-instance-attribute \
  --instance-id i-0abc123def456789 \
  --attribute sourceDestCheck
```

The output will show `"Value": false` if the check is disabled.

If you need to re-enable it later:

```bash
# Re-enable source/destination check
aws ec2 modify-instance-attribute \
  --instance-id i-0abc123def456789 \
  --source-dest-check
```

## Disabling on a Specific Network Interface

If your instance has multiple ENIs, you might want to disable the check on only one interface. The instance-level setting applies to the primary interface, but you can also target a specific ENI.

Disable source/destination check on a specific ENI:

```bash
# Disable on a specific network interface
aws ec2 modify-network-interface-attribute \
  --network-interface-id eni-0abc123def456789 \
  --no-source-dest-check
```

This is useful when you have an instance with multiple interfaces where one handles regular traffic and another handles forwarded traffic.

## Setting Up a NAT Instance from Scratch

Let's put this into practice by setting up a complete NAT instance. While AWS NAT Gateway is the managed alternative, a NAT instance can be more cost-effective for low-traffic environments.

First, launch an instance in a public subnet with a public IP:

```bash
# Launch a NAT instance in a public subnet
aws ec2 run-instances \
  --image-id ami-0abc123def456 \
  --instance-type t3.micro \
  --key-name my-key \
  --subnet-id subnet-0abc123public \
  --security-group-ids sg-0abc123natsg \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=nat-instance}]'
```

Disable source/destination check on the new instance:

```bash
# Disable source/destination check for NAT functionality
aws ec2 modify-instance-attribute \
  --instance-id i-0abc123nat456 \
  --no-source-dest-check
```

Now SSH into the instance and enable IP forwarding and NAT:

```bash
# Enable IP forwarding in the kernel
sudo sysctl -w net.ipv4.ip_forward=1

# Make it permanent
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/nat.conf

# Set up NAT with iptables
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# Make iptables rules persistent
sudo yum install -y iptables-services
sudo service iptables save
sudo systemctl enable iptables
```

Finally, update the private subnet's route table to point internet-bound traffic at the NAT instance:

```bash
# Add a route in the private subnet's route table
aws ec2 create-route \
  --route-table-id rtb-0abc123private \
  --destination-cidr-block 0.0.0.0/0 \
  --instance-id i-0abc123nat456
```

## Security Group Configuration for NAT

The NAT instance's security group needs to allow traffic from the private subnets and allow outbound internet access.

Configure the security group for NAT:

```bash
# Allow all traffic from the private subnet CIDR
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123natsg \
  --protocol -1 \
  --cidr 10.0.2.0/24

# Allow HTTP and HTTPS outbound (usually already allowed by default)
aws ec2 authorize-security-group-egress \
  --group-id sg-0abc123natsg \
  --protocol -1 \
  --cidr 0.0.0.0/0
```

## NAT Instance with Terraform

Here's the Terraform equivalent for the entire setup:

```hcl
resource "aws_instance" "nat" {
  ami                         = "ami-0abc123def456"
  instance_type               = "t3.micro"
  subnet_id                   = aws_subnet.public.id
  associate_public_ip_address = true
  source_dest_check           = false  # This is the key setting

  vpc_security_group_ids = [aws_security_group.nat.id]

  user_data = <<-EOF
    #!/bin/bash
    sysctl -w net.ipv4.ip_forward=1
    echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.d/nat.conf
    iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
    yum install -y iptables-services
    service iptables save
    systemctl enable iptables
  EOF

  tags = { Name = "nat-instance" }
}

resource "aws_route" "private_nat" {
  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  instance_id            = aws_instance.nat.id
}

resource "aws_security_group" "nat" {
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["10.0.2.0/24"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "nat-sg" }
}
```

Notice `source_dest_check = false` in the instance resource. That single line is what makes everything work.

## NAT Instance vs NAT Gateway

You might wonder when to use a NAT instance over AWS's managed NAT Gateway. Here's the comparison:

| Feature | NAT Instance | NAT Gateway |
|---------|-------------|-------------|
| Cost | Instance pricing (t3.micro ~$7/mo) | ~$32/mo + data processing |
| Bandwidth | Depends on instance type | Up to 100 Gbps |
| Availability | Single instance (no HA by default) | Managed HA within AZ |
| Maintenance | You manage OS, patches, monitoring | Fully managed |
| Security Groups | Yes, full SG support | No SG, uses NACLs only |
| Port Forwarding | Yes, with iptables | No |
| Bastion Host | Can double as bastion | No |

For development environments or low-traffic workloads, a NAT instance saves money. For production, NAT Gateway is almost always the better choice due to its managed nature and built-in redundancy.

## High Availability for NAT Instances

If you do go the NAT instance route in production, you'll want some form of high availability. One approach is running a NAT instance per AZ with a health check that fails over the route.

A simple health check script that runs on a monitoring instance:

```bash
#!/bin/bash
# Check if NAT instance is healthy and failover if needed
NAT_INSTANCE_ID="i-0abc123nat456"
BACKUP_NAT_ID="i-0abc123backup"
ROUTE_TABLE_ID="rtb-0abc123private"

# Ping test through the NAT instance
STATUS=$(aws ec2 describe-instance-status \
  --instance-ids $NAT_INSTANCE_ID \
  --query 'InstanceStatuses[0].InstanceState.Name' \
  --output text)

if [ "$STATUS" != "running" ]; then
  echo "NAT instance is down, failing over to backup"
  aws ec2 replace-route \
    --route-table-id $ROUTE_TABLE_ID \
    --destination-cidr-block 0.0.0.0/0 \
    --instance-id $BACKUP_NAT_ID
fi
```

## Monitoring Your NAT Instance

Since a NAT instance is a single point of failure for your private subnets' internet access, monitoring is critical. Set up alerts for CPU usage, network throughput, and instance health checks. If the NAT instance goes down, nothing in your private subnets can reach the internet.

For a comprehensive monitoring approach, check out our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view) to make sure you catch NAT issues before they impact your workloads.

## Wrapping Up

Disabling source/destination check is a small configuration change with big implications. It unlocks the ability for EC2 instances to act as network intermediaries - NAT gateways, VPN endpoints, firewalls, and more. Just remember: only disable it on instances that specifically need to forward traffic, and keep it enabled everywhere else as a security measure.
