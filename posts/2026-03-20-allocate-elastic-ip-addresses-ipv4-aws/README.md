# How to Allocate Elastic IP Addresses for IPv4 in AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Elastic IP, IPv4, EC2, Networking, OpenTofu

Description: Learn how to allocate and associate Elastic IP addresses for IPv4 in AWS using the console, CLI, and OpenTofu.

---

An Elastic IP (EIP) is a static public IPv4 address that you allocate from Amazon's pool or a custom IPv4 address pool and associate with EC2 instances or network interfaces. Unlike dynamic public IPs, an EIP persists until you explicitly release it.

---

## Allocate an Elastic IP via AWS CLI

```bash
# Allocate an EIP in the VPC domain

aws ec2 allocate-address --domain vpc

# Output:
# {
#   "PublicIp": "54.213.100.5",
#   "AllocationId": "eipalloc-0abc12345",
#   "Domain": "vpc"
# }
```

---

## Associate an EIP with an EC2 Instance

```bash
# Associate EIP with an instance
aws ec2 associate-address \
  --instance-id i-0abc1234567890def \
  --allocation-id eipalloc-0abc12345

# Or associate with a network interface
aws ec2 associate-address \
  --network-interface-id eni-0abc1234567890def \
  --allocation-id eipalloc-0abc12345
```

---

## Allocate and Associate Using OpenTofu

```hcl
# Allocate an Elastic IP
resource "aws_eip" "web" {
  domain = "vpc"

  tags = {
    Name        = "web-server-eip"
    Environment = "production"
  }
}

# Associate with an EC2 instance
resource "aws_eip_association" "web" {
  instance_id   = aws_instance.web.id
  allocation_id = aws_eip.web.id
}
```

---

## Attach EIP to a NAT Gateway

```hcl
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public.id

  tags = {
    Name = "main-nat-gw"
  }
}
```

---

## List and Release Elastic IPs

```bash
# List all allocated EIPs
aws ec2 describe-addresses

# Disassociate an EIP
aws ec2 disassociate-address --association-id eipassoc-0abc123

# Release the EIP to stop charges for that allocation
aws ec2 release-address --allocation-id eipalloc-0abc12345
```

---

## Summary

Elastic IPs provide persistent static IPv4 addresses for AWS resources. Allocate them with `aws ec2 allocate-address --domain vpc`, associate them with instances or interfaces, and manage them in OpenTofu with `aws_eip` and `aws_eip_association`. AWS charges for public IPv4 addresses, including Elastic IPs, so release unused allocations when you no longer need them.
