# How to Deploy Bastion Hosts with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Bastion Host, Security, SSH, Infrastructure as Code

Description: Learn how to provision a secure bastion host (jump server) in AWS using OpenTofu to enable SSH access to private instances.

---

A bastion host (jump server) sits in a public subnet and acts as the sole SSH entry point to instances in private subnets. OpenTofu lets you define the bastion, security groups, and access rules as version-controlled infrastructure.

---

## Security Group for the Bastion

```hcl
resource "aws_security_group" "bastion" {
  name        = "bastion-sg"
  description = "Allow SSH from trusted IPs only"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_cidr]  # Your office/home IP
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

---

## Security Group for Private Instances

```hcl
resource "aws_security_group" "private" {
  name   = "private-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]  # Only from bastion
  }
}
```

---

## Deploy the Bastion Instance

```hcl
resource "aws_instance" "bastion" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t3.micro"
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.bastion.id]
  associate_public_ip_address = true
  key_name                    = aws_key_pair.bastion.key_name

  tags = {
    Name = "bastion-host"
  }
}

output "bastion_ip" {
  value = aws_instance.bastion.public_ip
}
```

---

## SSH Through the Bastion

```bash
# Configure in ~/.ssh/config
Host bastion
  HostName <bastion-ip>
  User ec2-user
  IdentityFile ~/.ssh/bastion.pem

Host private-instance
  HostName <private-instance-private-ip>
  User ec2-user
  IdentityFile ~/.ssh/private.pem
  ProxyJump bastion

# SSH to the private instance through the bastion
ssh private-instance
```

---

## Summary

Deploy a bastion host in a public subnet with SSH access restricted to trusted CIDRs only. Allow private instances to accept SSH only from the bastion's security group. Use SSH ProxyJump (`ProxyJump` in `~/.ssh/config`) to tunnel through the bastion without exposing private instances directly to the internet. Manage the entire setup with OpenTofu for auditable, repeatable deployments.
