# How to Create Alibaba Cloud ECS Instances with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Alibaba Cloud, ECS, Infrastructure as Code, Virtual Machine

Description: Learn how to create Alibaba Cloud ECS (Elastic Compute Service) instances with OpenTofu, including key pairs, security groups, and user data.

ECS (Elastic Compute Service) is Alibaba Cloud's virtual machine service. The `aliyun/alicloud` OpenTofu provider lets you provision ECS instances, attach them to VPCs, configure security groups, and inject cloud-init scripts as code.

## Prerequisite: VPC and VSwitch

ECS instances require a VPC and VSwitch (subnet):

```hcl
resource "alicloud_vpc" "main" {
  vpc_name   = "production-vpc"
  cidr_block = "10.0.0.0/16"
}

resource "alicloud_vswitch" "main" {
  vswitch_name = "production-vswitch"
  vpc_id       = alicloud_vpc.main.id
  cidr_block   = "10.0.1.0/24"
  zone_id      = data.alicloud_zones.available.zones[0].id
}

data "alicloud_zones" "available" {
  available_resource_creation = "VSwitch"
}
```

## Creating a Key Pair

```hcl
resource "alicloud_ecs_key_pair" "default" {
  key_pair_name = "opentofu-key"
  public_key    = file("~/.ssh/id_ed25519.pub")
}
```

## Finding the Latest Image

```hcl
data "alicloud_images" "ubuntu" {
  most_recent = true
  name_regex  = "^ubuntu_22_04"
  owners      = "system"
}
```

## Creating an ECS Instance

```hcl
resource "alicloud_instance" "web" {
  instance_name = "web-01"
  image_id      = data.alicloud_images.ubuntu.images[0].id
  instance_type = "ecs.c6.large"   # 2 vCPU, 4 GB

  security_groups  = [alicloud_security_group.web.id]
  vswitch_id       = alicloud_vswitch.main.id
  key_name         = alicloud_ecs_key_pair.default.key_pair_name

  # Allocate a public IP (classic EIP attachment is preferred for production)
  internet_max_bandwidth_out = 10  # Mbps; 0 = no public IP

  system_disk_category = "cloud_essd"
  system_disk_size     = 40  # GB

  user_data = base64encode(<<-EOT
    #!/bin/bash
    apt-get update -y
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
  EOT
  )

  tags = {
    Environment = "production"
    ManagedBy   = "opentofu"
  }
}

output "instance_public_ip" {
  value = alicloud_instance.web.public_ip
}
```

## Creating a Security Group

```hcl
resource "alicloud_security_group" "web" {
  security_group_name = "web-sg"
  vpc_id              = alicloud_vpc.main.id
}

resource "alicloud_security_group_rule" "http" {
  security_group_id = alicloud_security_group.web.id
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "80/80"
  priority          = 1
  cidr_ip           = "0.0.0.0/0"
}

resource "alicloud_security_group_rule" "https" {
  security_group_id = alicloud_security_group.web.id
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "443/443"
  priority          = 1
  cidr_ip           = "0.0.0.0/0"
}
```

## Common Instance Types

| Type | vCPU | RAM |
|---|---|---|
| ecs.t6-c1m1.large | 2 | 2 GB |
| ecs.c6.large | 2 | 4 GB |
| ecs.c6.xlarge | 4 | 8 GB |
| ecs.g6.large | 2 | 8 GB |
| ecs.r6.large | 2 | 16 GB |

## Conclusion

ECS instances in OpenTofu require a VPC, VSwitch, and security group before creation. Use the `alicloud_images` data source to find the latest image, pass cloud-init scripts via `user_data`, and use `internet_max_bandwidth_out` to control public IP allocation. For production, attach an Elastic IP (EIP) separately for a stable public address.
