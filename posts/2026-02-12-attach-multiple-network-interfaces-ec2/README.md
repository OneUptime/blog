# How to Attach Multiple Network Interfaces to an EC2 Instance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Networking, ENI

Description: A practical guide to attaching multiple Elastic Network Interfaces to EC2 instances for multi-homed configurations, security isolation, and network segmentation.

---

There are plenty of scenarios where a single network interface on an EC2 instance just doesn't cut it. Maybe you need to separate management traffic from application traffic, or you're building a network appliance that sits across multiple subnets. Whatever the reason, AWS lets you attach multiple Elastic Network Interfaces (ENIs) to a single instance, and it's simpler than you might think.

## Why Use Multiple Network Interfaces?

Before diving into the how, let's talk about the why. Multiple ENIs give you:

- **Network segmentation**: Put management and data traffic on separate subnets
- **Dual-homed instances**: Connect an instance to multiple VPC subnets simultaneously
- **Security isolation**: Apply different security groups to different interfaces
- **License management**: Some software licenses are tied to MAC addresses, and ENIs have persistent MACs
- **Failover configurations**: Move an ENI (with its IP) from a failed instance to a healthy one

The number of ENIs you can attach depends on your instance type. A t3.micro supports 2 interfaces, while larger instances like c5.18xlarge support up to 15.

## Checking Interface Limits for Your Instance Type

Before you start creating interfaces, find out how many your instance type supports.

This command shows the maximum ENI count and IPs per interface for a given instance type:

```bash
# Check ENI limits for an instance type
aws ec2 describe-instance-types \
  --instance-types m5.large \
  --query 'InstanceTypes[].NetworkInfo.{MaxENIs: MaximumNetworkInterfaces, IPv4PerENI: Ipv4AddressesPerInterface}'
```

For an m5.large, you'll typically see a max of 3 ENIs with 10 IPv4 addresses per interface. Plan your architecture around these limits.

## Creating an Elastic Network Interface

Let's create a new ENI. You need to specify the subnet it'll live in and optionally assign security groups.

Here's how to create an ENI in a specific subnet:

```bash
# Create a new ENI in a specified subnet with a security group
aws ec2 create-network-interface \
  --subnet-id subnet-0abc123def456 \
  --description "Secondary interface for management traffic" \
  --groups sg-0abc123def456 \
  --tag-specifications 'ResourceType=network-interface,Tags=[{Key=Name,Value=mgmt-eni}]'
```

The command returns the new interface's ID, private IP, MAC address, and other details. Save the `NetworkInterfaceId` - you'll need it for the next step.

## Attaching the ENI to an Instance

Now attach the ENI to your running instance. Unlike ENA enablement, you can attach additional interfaces to a running instance (with some caveats).

This attaches the ENI as the second interface on the instance:

```bash
# Attach the ENI to an instance
aws ec2 attach-network-interface \
  --network-interface-id eni-0abc123def456789 \
  --instance-id i-0abc123def456789 \
  --device-index 1
```

The `device-index` parameter matters. Index 0 is your primary interface (eth0). Your second interface gets index 1 (eth1), and so on.

You can also set the interface to auto-delete when the instance terminates:

```bash
# Modify the attachment to delete on termination
aws ec2 modify-network-interface-attribute \
  --network-interface-id eni-0abc123def456789 \
  --attachment AttachmentId=eni-attach-0abc123,DeleteOnTermination=true
```

## Configuring the OS to Use Multiple Interfaces

Here's where most people run into trouble. Just attaching the ENI doesn't mean your OS will route traffic correctly. Linux, by default, sends all outbound traffic through the default gateway on eth0, even if the traffic originated on eth1. You need policy-based routing.

First, check that the OS sees the new interface:

```bash
# List all network interfaces
ip link show

# Check IP addresses assigned
ip addr show
```

Now set up a separate routing table for the second interface. Let's say eth1 got the IP 10.0.2.50 with a gateway of 10.0.2.1:

```bash
# Add a new routing table entry in rt_tables
echo "100 mgmt" | sudo tee -a /etc/iproute2/rt_tables

# Add a default route for the second interface's routing table
sudo ip route add default via 10.0.2.1 dev eth1 table mgmt

# Add a rule to use this table for traffic from the second interface's IP
sudo ip rule add from 10.0.2.50/32 table mgmt

# Add the subnet route to the secondary table
sudo ip route add 10.0.2.0/24 dev eth1 table mgmt
```

This ensures that traffic destined for eth1's IP gets responses routed back through eth1, not eth0.

## Making the Configuration Persistent

The routing rules you just set up won't survive a reboot. You need to make them persistent.

On Amazon Linux 2 or RHEL-based systems, create interface configuration files:

```bash
# Create the interface config file for eth1
sudo cat > /etc/sysconfig/network-scripts/ifcfg-eth1 << 'EOF'
DEVICE=eth1
BOOTPROTO=dhcp
ONBOOT=yes
TYPE=Ethernet
DEFROUTE=no
EOF

# Create the route file for eth1
sudo cat > /etc/sysconfig/network-scripts/route-eth1 << 'EOF'
default via 10.0.2.1 dev eth1 table mgmt
10.0.2.0/24 dev eth1 table mgmt
EOF

# Create the rule file for eth1
sudo cat > /etc/sysconfig/network-scripts/rule-eth1 << 'EOF'
from 10.0.2.50/32 table mgmt
EOF
```

On Ubuntu, you'd use netplan instead:

```yaml
# /etc/netplan/51-eth1.yaml
network:
  version: 2
  ethernets:
    eth1:
      dhcp4: true
      dhcp4-overrides:
        route-metric: 200
      routing-policy:
        - from: 10.0.2.50/32
          table: 100
      routes:
        - to: 0.0.0.0/0
          via: 10.0.2.1
          table: 100
```

Apply the netplan config with:

```bash
# Apply the netplan configuration
sudo netplan apply
```

## Using Multiple ENIs with Terraform

If you're managing infrastructure as code (and you should be), here's how to set this up with Terraform.

This Terraform configuration creates an instance with a secondary ENI:

```hcl
# Create the primary instance
resource "aws_instance" "multi_eni" {
  ami           = "ami-0abc123def456"
  instance_type = "m5.large"
  subnet_id     = aws_subnet.primary.id

  vpc_security_group_ids = [aws_security_group.app.id]

  tags = {
    Name = "multi-eni-instance"
  }
}

# Create a secondary ENI in a different subnet
resource "aws_network_interface" "secondary" {
  subnet_id       = aws_subnet.management.id
  security_groups = [aws_security_group.mgmt.id]

  tags = {
    Name = "management-eni"
  }
}

# Attach the secondary ENI to the instance
resource "aws_network_interface_attachment" "secondary_attach" {
  instance_id          = aws_instance.multi_eni.id
  network_interface_id = aws_network_interface.secondary.id
  device_index         = 1
}
```

For more on Terraform with EC2, check out our post on [creating EC2 instances with Terraform](https://oneuptime.com/blog/post/create-ec2-instance-terraform/view).

## Assigning Elastic IPs to Secondary Interfaces

Each ENI can have its own Elastic IP, which is great for running multiple services that each need a public IP.

Here's how to associate an Elastic IP with a secondary interface:

```bash
# Allocate an Elastic IP
aws ec2 allocate-address --domain vpc

# Associate it with the secondary ENI's private IP
aws ec2 associate-address \
  --allocation-id eipalloc-0abc123def456 \
  --network-interface-id eni-0abc123def456789 \
  --private-ip-address 10.0.2.50
```

## Common Pitfalls and Troubleshooting

**Traffic not reaching the secondary interface**: Check that the subnet's route table has appropriate routes and that the security group on the ENI allows the expected traffic. Also verify that source/destination check is disabled if you're using the instance as a router or NAT.

**Asymmetric routing**: This is the most common issue. Without policy-based routing, responses go out eth0 regardless of which interface received the request. The routing table setup from earlier fixes this.

**Interface not showing up in the OS**: Some instance types require a reboot after attaching an ENI. Also check that the ENI is in the same Availability Zone as the instance - you can't attach cross-AZ.

**DHCP conflicts**: When using DHCP on multiple interfaces, make sure only one interface sets the default route. Use `DEFROUTE=no` on secondary interfaces.

## Monitoring Multiple Interfaces

With multiple network interfaces, monitoring becomes more important since you need visibility into traffic patterns on each interface separately. CloudWatch metrics are reported per-instance by default, so you'll want to use VPC Flow Logs for per-interface visibility.

For a comprehensive monitoring setup, take a look at [setting up AWS infrastructure monitoring](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view) to track traffic across all your interfaces.

## Summary

Attaching multiple ENIs to EC2 instances is a powerful networking pattern that enables segmentation, failover, and multi-homed configurations. The key steps are: check your instance type's limits, create the ENI in the right subnet, attach it, and then configure policy-based routing in the OS so traffic flows correctly through each interface. Don't skip the OS-level routing configuration - it's the part that actually makes multi-ENI setups work properly.
