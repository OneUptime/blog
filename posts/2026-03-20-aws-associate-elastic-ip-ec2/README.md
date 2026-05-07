# How to Associate an Elastic IP with an EC2 Instance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EC2, Elastic IP, IPv4, Networking, Cloud

Description: Allocate and associate an AWS Elastic IP address with an EC2 instance to maintain a static public IPv4 address that persists through stop/start cycles.

## Introduction

An Elastic IP (EIP) is a static public IPv4 address allocated from AWS's pool. Unlike auto-assigned public IPs (which change on every stop/start), an EIP stays with your account until you release it. This makes EIPs essential for services that need a predictable, unchanging public IP - such as DNS A records, firewall allowlists, or SSL certificates tied to an IP.

## Allocating an Elastic IP

```bash
# Allocate a new Elastic IP from the AWS pool

aws ec2 allocate-address \
  --domain vpc \
  --region us-east-1
```

This returns an `AllocationId` (e.g., `eipalloc-0123456789abcdef0`) and the public IP address. Note both for the next steps.

## Associating the EIP with an EC2 Instance

```bash
# Associate the EIP with an instance by instance ID
aws ec2 associate-address \
  --instance-id i-0123456789abcdef0 \
  --allocation-id eipalloc-0123456789abcdef0

# Alternatively, associate with a specific network interface
aws ec2 associate-address \
  --network-interface-id eni-0123456789abcdef0 \
  --allocation-id eipalloc-0123456789abcdef0 \
  --private-ip-address 10.0.1.50    # Optional: bind to a specific private IP
```

## Verifying the Association

```bash
# Describe Elastic IPs and their associations
aws ec2 describe-addresses \
  --allocation-ids eipalloc-0123456789abcdef0 \
  --query 'Addresses[*].{PublicIP:PublicIp,InstanceId:InstanceId,AssociationId:AssociationId}'
```

## Reassociating to a Different Instance

You can move an EIP to a different instance without releasing it:

```bash
# Disassociate from the current instance
aws ec2 disassociate-address \
  --association-id eipassoc-0123456789abcdef0

# Associate with the new instance
aws ec2 associate-address \
  --instance-id i-0987654321abcdef0 \
  --allocation-id eipalloc-0123456789abcdef0
```

## Using Terraform to Manage Elastic IPs

```hcl
# Allocate and associate an EIP using Terraform
resource "aws_eip" "web" {
  domain = "vpc"                        # Required for VPC instances

  tags = {
    Name = "web-server-eip"
  }
}

resource "aws_eip_association" "web" {
  instance_id   = aws_instance.web.id
  allocation_id = aws_eip.web.id
}
```

## Important Cost Considerations

AWS charges for all public IPv4 addresses, including Elastic IPs whether they are in use or idle. Always release unneeded EIPs:

```bash
# If the EIP is currently associated, disassociate it first
aws ec2 disassociate-address --association-id eipassoc-xxx

# Then release it to stop ongoing public IPv4 charges
aws ec2 release-address --allocation-id eipalloc-0123456789abcdef0
```

## Limits

By default, each AWS account can have 5 Elastic IPs per region. Request an increase via Service Quotas if you need more.

## Conclusion

Elastic IPs are the standard way to maintain a static public IP for EC2 instances. They enable reliable DNS records, firewall allowlists, and other integrations that depend on a stable public IP without worrying about IP changes during instance restarts.
