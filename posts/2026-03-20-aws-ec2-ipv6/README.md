# How to Configure IPv6 on AWS EC2 Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IPv6, EC2, Dual-Stack, Instance Configuration, Cloud

Description: Assign IPv6 addresses to EC2 instances, configure network interfaces for IPv6, verify IPv6 connectivity, and launch dual-stack EC2 instances automatically.

## Introduction

AWS EC2 instances can be launched with IPv6 addresses automatically or have IPv6 assigned after launch. IPv6 addresses on EC2 are persistent (unlike some cloud providers) and don't change when the instance stops and starts. This guide covers assigning IPv6 to new and existing instances.

## Assign IPv6 at Launch

```bash
# Launch EC2 instance with IPv6 address
# Requires a subnet with an associated IPv6 CIDR block

aws ec2 run-instances \
    --image-id ami-12345678 \
    --instance-type t3.micro \
    --subnet-id subnet-12345678 \
    --ipv6-address-count 1 \
    --security-group-ids sg-12345678 \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=ipv6-instance}]"

# Verify the instance got an IPv6 address
INSTANCE_ID="i-1234567890abcdef0"
aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query "Reservations[0].Instances[0].NetworkInterfaces[0].Ipv6Addresses"
```

## Assign IPv6 to Existing Instance

```bash
# Get the network interface ID of the instance
ENI_ID=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query "Reservations[0].Instances[0].NetworkInterfaces[0].NetworkInterfaceId" \
    --output text)

echo "ENI: $ENI_ID"

# Assign IPv6 address to the network interface
aws ec2 assign-ipv6-addresses \
    --network-interface-id "$ENI_ID" \
    --ipv6-address-count 1

# Verify assignment
aws ec2 describe-network-interfaces \
    --network-interface-ids "$ENI_ID" \
    --query "NetworkInterfaces[0].Ipv6Addresses"
```

## Terraform: EC2 with IPv6

```hcl
# ec2_ipv6.tf

resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public_a.id

  # Assign IPv6 address
  ipv6_address_count = 1

  vpc_security_group_ids = [aws_security_group.web.id]

  tags = { Name = "web-dual-stack" }
}

# Security group allowing IPv6 traffic
resource "aws_security_group" "web" {
  vpc_id = aws_vpc.main.id
  name   = "web-sg"

  # HTTP/HTTPS from anywhere (IPv4 + IPv6)
  ingress {
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  # SSH from specific IPv6 prefix
  ingress {
    from_port        = 22
    to_port          = 22
    protocol         = "tcp"
    ipv6_cidr_blocks = ["2001:db8:1234::/48"]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

output "instance_ipv6" {
  value = aws_instance.web.ipv6_addresses
}
```

## Configure IPv6 Inside the Instance

```bash
# After launch, verify IPv6 is configured in the OS
# (On Amazon Linux 2023, this usually happens automatically)

# Check current IPv6 addresses
ip -6 addr show

# If IPv6 address is assigned in AWS but not in OS:
# Check which network manager is controlling the interface
systemctl --no-pager status systemd-networkd 2>/dev/null || \
    systemctl --no-pager status NetworkManager 2>/dev/null

# On Amazon Linux 2: modify network config
# /etc/sysconfig/network-scripts/ifcfg-eth0
# Add: IPV6INIT=yes
# Add: DHCPV6C=yes
#
# On Amazon Linux 2023, amazon-ec2-net-utils uses systemd-networkd
# and configures IPv4/IPv6 automatically.

# On Ubuntu/Debian with netplan:
IFACE=$(ip -o route show default | awk '{print $5; exit}')
sudo tee /etc/netplan/60-ipv6.yaml > /dev/null <<EOF
network:
  version: 2
  ethernets:
    ${IFACE}:
      dhcp4: true
      dhcp6: true
EOF
sudo netplan apply

# Verify connectivity
ping -6 -c 3 2001:4860:4860::8888
curl -6 -s https://ipv6.icanhazip.com
```

## Get Instance Metadata for IPv6

```bash
# Get IPv6 address from instance metadata (within the instance)
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
    -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

MAC=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
    http://169.254.169.254/latest/meta-data/network/interfaces/macs/ | head -1)

IPV6=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
    "http://169.254.169.254/latest/meta-data/network/interfaces/macs/${MAC}ipv6s")

echo "My IPv6 address: $IPV6"
```

## Conclusion

EC2 instances get IPv6 addresses from their subnet's IPv6 CIDR block, either because the subnet is configured to auto-assign them at launch or because you explicitly request them at launch or assign them later. Public IPv6 addresses don't require NAT. Ensure security groups have explicit IPv6 rules (`ipv6_cidr_blocks = ["::/0"]`) since IPv4 and IPv6 rules are independent. Inside the instance, verify the OS networking stack is configured for IPv6/DHCPv6.
