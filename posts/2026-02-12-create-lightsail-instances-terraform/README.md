# How to Create Lightsail Instances with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lightsail, Terraform

Description: Guide to provisioning AWS Lightsail instances with Terraform, including blueprints, static IPs, firewall rules, load balancers, and database instances.

---

AWS Lightsail is the simplified compute service for people who want a VPS without dealing with the full complexity of EC2. It bundles compute, storage, networking, and a fixed monthly price into simple plans. Think of it as AWS's answer to DigitalOcean or Linode - straightforward pricing, pre-configured images, and enough features for most web applications.

While Lightsail has its own console that's intentionally simplified, you can manage everything through Terraform. This is especially useful when you've got multiple Lightsail instances, need consistent configurations across environments, or want to keep your infrastructure reproducible.

## Basic Lightsail Instance

The simplest Lightsail instance needs a name, an availability zone, a blueprint (OS or application image), and a bundle (instance size).

This creates a Lightsail instance running Ubuntu with the small plan:

```hcl
resource "aws_lightsail_instance" "web" {
  name              = "web-server"
  availability_zone = "us-east-1a"
  blueprint_id      = "ubuntu_22_04"
  bundle_id         = "small_3_0"  # 2 GB RAM, 1 vCPU, 60 GB SSD

  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
  EOF

  tags = {
    Environment = "production"
    Role        = "webserver"
  }
}
```

## Available Blueprints and Bundles

Lightsail offers two types of blueprints: OS-only (like Ubuntu, Amazon Linux, Debian) and app-based (like WordPress, Node.js, LAMP stack). Here are the common ones:

```hcl
# OS Blueprints
# ubuntu_22_04    - Ubuntu 22.04 LTS
# amazon_linux_2  - Amazon Linux 2
# debian_11       - Debian 11

# Application Blueprints
# wordpress        - WordPress on Amazon Linux
# nodejs           - Node.js on Amazon Linux
# lamp_8           - LAMP stack on Amazon Linux
# nginx            - Nginx on Amazon Linux

# Bundle IDs (pricing as of 2024)
# nano_3_0    - 512 MB RAM, 1 vCPU, 20 GB SSD  ($3.50/mo)
# micro_3_0   - 1 GB RAM, 1 vCPU, 40 GB SSD    ($5/mo)
# small_3_0   - 2 GB RAM, 1 vCPU, 60 GB SSD    ($10/mo)
# medium_3_0  - 4 GB RAM, 2 vCPU, 80 GB SSD    ($20/mo)
# large_3_0   - 8 GB RAM, 2 vCPU, 160 GB SSD   ($40/mo)
# xlarge_3_0  - 16 GB RAM, 4 vCPU, 320 GB SSD  ($80/mo)
```

You can look up the full list:

```bash
# List all available blueprints
aws lightsail get-blueprints --query 'blueprints[].blueprintId'

# List all available bundles
aws lightsail get-bundles --query 'bundles[].bundleId'
```

## Static IP Address

Lightsail instances get a public IP that changes when you stop and start the instance. For production, attach a static IP.

This creates a static IP and attaches it to your instance:

```hcl
resource "aws_lightsail_static_ip" "web" {
  name = "web-server-ip"
}

resource "aws_lightsail_static_ip_attachment" "web" {
  static_ip_name = aws_lightsail_static_ip.web.name
  instance_name  = aws_lightsail_instance.web.name
}

output "static_ip" {
  value = aws_lightsail_static_ip.web.ip_address
}
```

## Firewall Rules

Lightsail instances come with a built-in firewall. By default, SSH (22) and HTTP (80) are open. You'll want to customize this for your use case.

This configures the firewall to allow only specific ports:

```hcl
resource "aws_lightsail_instance_public_ports" "web" {
  instance_name = aws_lightsail_instance.web.name

  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
    cidrs     = ["203.0.113.0/24"]  # Restrict SSH to your office IP
  }

  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
    cidrs     = ["0.0.0.0/0"]
  }

  port_info {
    protocol  = "tcp"
    from_port = 443
    to_port   = 443
    cidrs     = ["0.0.0.0/0"]
  }
}
```

## Key Pair

For SSH access, you can use a Lightsail key pair or import your own public key.

This creates a key pair and associates it with the instance:

```hcl
resource "aws_lightsail_key_pair" "main" {
  name       = "my-lightsail-key"
  public_key = file("~/.ssh/id_rsa.pub")
}

resource "aws_lightsail_instance" "web" {
  name              = "web-server"
  availability_zone = "us-east-1a"
  blueprint_id      = "ubuntu_22_04"
  bundle_id         = "small_3_0"
  key_pair_name     = aws_lightsail_key_pair.main.name
}
```

## Lightsail Load Balancer

For high availability, put multiple instances behind a Lightsail load balancer. The load balancer includes a free SSL certificate.

This creates a load balancer with SSL and attaches two instances:

```hcl
resource "aws_lightsail_lb" "web" {
  name              = "web-lb"
  health_check_path = "/health"
  instance_port     = 80

  tags = {
    Environment = "production"
  }
}

# Attach SSL certificate
resource "aws_lightsail_lb_certificate" "web" {
  name        = "web-lb-cert"
  lb_name     = aws_lightsail_lb.web.name
  domain_name = "app.example.com"
}

resource "aws_lightsail_lb_certificate_attachment" "web" {
  lb_name          = aws_lightsail_lb.web.name
  certificate_name = aws_lightsail_lb_certificate.web.name
}

# Create two instances
resource "aws_lightsail_instance" "web_nodes" {
  for_each = toset(["web-1", "web-2"])

  name              = each.value
  availability_zone = "us-east-1a"
  blueprint_id      = "ubuntu_22_04"
  bundle_id         = "small_3_0"
  key_pair_name     = aws_lightsail_key_pair.main.name

  user_data = <<-EOF
    #!/bin/bash
    apt-get update && apt-get install -y nginx
    systemctl enable nginx && systemctl start nginx
  EOF
}

# Attach instances to the load balancer
resource "aws_lightsail_lb_attachment" "web_nodes" {
  for_each = aws_lightsail_instance.web_nodes

  lb_name       = aws_lightsail_lb.web.name
  instance_name = each.value.name
}
```

## Lightsail Database

Lightsail also offers managed databases (MySQL and PostgreSQL) with predictable pricing.

This creates a managed PostgreSQL database:

```hcl
resource "aws_lightsail_database" "main" {
  relational_database_name         = "app-database"
  availability_zone                = "us-east-1a"
  master_database_name             = "myapp"
  master_username                  = "dbadmin"
  master_password                  = "change-this-password"
  blueprint_id                     = "postgres_14"
  bundle_id                        = "micro_2_0"  # 1 GB RAM, 1 vCPU, 40 GB SSD
  preferred_backup_window          = "03:00-04:00"
  preferred_maintenance_window     = "sun:05:00-sun:06:00"
  publicly_accessible              = false
  backup_retention_enabled         = true
  apply_immediately                = true

  tags = {
    Environment = "production"
  }
}
```

## Disk (Block Storage)

Need more storage than your instance bundle includes? Attach additional disks.

This creates and attaches a 64 GB SSD to a Lightsail instance:

```hcl
resource "aws_lightsail_disk" "data" {
  name              = "data-disk"
  size_in_gb        = 64
  availability_zone = "us-east-1a"
}

resource "aws_lightsail_disk_attachment" "data" {
  disk_name     = aws_lightsail_disk.data.name
  instance_name = aws_lightsail_instance.web.name
  disk_path     = "/dev/xvdf"
}
```

After attaching, you'll need to format and mount the disk from within the instance:

```bash
# Format and mount the attached disk
sudo mkfs -t ext4 /dev/xvdf
sudo mkdir /data
sudo mount /dev/xvdf /data

# Add to fstab for persistence across reboots
echo '/dev/xvdf /data ext4 defaults,nofail 0 2' | sudo tee -a /etc/fstab
```

## Domain and DNS

Lightsail includes DNS management, though most teams use Route 53 instead.

This creates a Lightsail DNS zone and records:

```hcl
resource "aws_lightsail_domain" "main" {
  domain_name = "example.com"
}

resource "aws_lightsail_domain_entry" "www" {
  domain_name = aws_lightsail_domain.main.domain_name
  name        = "www"
  type        = "A"
  target      = aws_lightsail_static_ip.web.ip_address
}
```

## Multiple Instances with Different Roles

This creates a set of instances for different purposes:

```hcl
variable "instances" {
  type = map(object({
    blueprint = string
    bundle    = string
    ports     = list(number)
  }))
  default = {
    web = {
      blueprint = "nginx"
      bundle    = "small_3_0"
      ports     = [80, 443]
    }
    api = {
      blueprint = "nodejs"
      bundle    = "medium_3_0"
      ports     = [80, 443, 3000]
    }
    db = {
      blueprint = "ubuntu_22_04"
      bundle    = "large_3_0"
      ports     = [5432]
    }
  }
}

resource "aws_lightsail_instance" "fleet" {
  for_each = var.instances

  name              = each.key
  availability_zone = "us-east-1a"
  blueprint_id      = each.value.blueprint
  bundle_id         = each.value.bundle

  tags = {
    Role = each.key
  }
}
```

## When to Use Lightsail vs EC2

Lightsail makes sense when you want simple, predictable pricing and don't need fine-grained control over networking. EC2 is better when you need VPC peering, detailed security group rules, auto-scaling groups, or specific instance types.

For monitoring your Lightsail instances, check out our guide on [CloudWatch alarms with Terraform](https://oneuptime.com/blog/post/create-cloudwatch-alarms-terraform/view) - Lightsail publishes basic metrics to CloudWatch that you can alarm on.

## Wrapping Up

Lightsail in Terraform gives you the simplicity of a VPS provider with the reproducibility of infrastructure as code. It's particularly well-suited for development environments, simple web applications, and small projects where EC2's complexity isn't justified. The configurations in this guide cover the most common patterns, from single instances to load-balanced setups with managed databases.
