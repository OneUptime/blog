# How to Deploy Portainer on AWS EC2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, AWS, EC2, Docker, Self-Hosted, DevOps

Description: Learn how to launch an AWS EC2 instance and deploy Portainer CE for managing Docker containers on AWS infrastructure.

---

Portainer can be deployed on any Docker host, including AWS EC2 instances. This guide walks through provisioning an EC2 instance and deploying Portainer with persistent storage.

---

## Launch an EC2 Instance (OpenTofu)

```hcl
resource "aws_instance" "portainer" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.small"
  key_name      = aws_key_pair.portainer.key_name
  subnet_id     = aws_subnet.public.id
  associate_public_ip_address = true

  vpc_security_group_ids = [aws_security_group.portainer.id]

  user_data = <<-EOF
    #!/bin/bash
    set -e

    if command -v amazon-linux-extras >/dev/null 2>&1; then
      yum update -y
      amazon-linux-extras install docker -y
    else
      dnf update -y
      dnf install -y docker
    fi

    systemctl enable --now docker
    usermod -aG docker ec2-user

    docker volume create portainer_data

    docker run -d \
      --name portainer \
      --restart=always \
      -p 9443:9443 \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v portainer_data:/data \
      portainer/portainer-ce:sts
  EOF

  tags = {
    Name = "portainer-host"
  }
}
```

---

## Security Group for Portainer

```hcl
resource "aws_security_group" "portainer" {
  name   = "portainer-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 9443
    to_port     = 9443
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]  # Your IP only
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
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

## Access Portainer

```bash
# Get the public IP

tofu output portainer_ip

# Access the UI
https://<public-ip>:9443
```

Create the admin user within 5 minutes of installation. If you do not, Portainer stops listening until the container is restarted.

---

## Persist Portainer Data with EBS

Because `portainer_data` is a Docker volume on the host, it is stored on the instance's EBS-backed root volume. Size that root volume appropriately:

```hcl
resource "aws_instance" "portainer" {
  # ...

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }
}
```

---

## Summary

Use EC2 `user_data` to install Docker and launch the Portainer container automatically on instance creation. Restrict the security group to allow HTTPS (port 9443) only from trusted CIDRs. Because the Portainer Docker volume is stored on the EC2 host, size the instance's EBS-backed root volume appropriately. Access the UI at `https://<ec2-ip>:9443` and create the admin user within 5 minutes of installation.
