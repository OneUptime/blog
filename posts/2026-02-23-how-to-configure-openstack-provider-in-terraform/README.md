# How to Configure OpenStack Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, OpenStack, Private Cloud, Infrastructure as Code

Description: A comprehensive guide to configuring the OpenStack provider in Terraform for managing compute instances, networks, storage, and other cloud resources.

---

OpenStack powers a significant number of private clouds and some public cloud offerings around the world. If your organization runs OpenStack, the Terraform provider for it lets you manage compute instances, networks, block storage, object storage, and other resources through infrastructure as code. This is the same workflow cloud teams use with AWS or GCP, applied to your private cloud.

The OpenStack provider works with any OpenStack deployment that exposes the standard APIs, whether it is a DevStack development instance, a small private cloud, or a large multi-tenant production environment.

## Prerequisites

- Terraform 1.0 or later
- An OpenStack environment with API access
- Valid OpenStack credentials (username/password, application credentials, or token)
- The OpenStack RC file or equivalent authentication details

## Getting Your Credentials

The easiest way to get your credentials is to download the OpenStack RC file from the Horizon dashboard:

1. Log in to the Horizon dashboard
2. Go to Project > API Access
3. Click "Download OpenStack RC File"

This gives you a shell script with your authentication details.

## Declaring the Provider

```hcl
# versions.tf - Declare the OpenStack provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "~> 1.54"
    }
  }
}
```

## Provider Configuration

### Direct Configuration

```hcl
# provider.tf - Configure with explicit credentials
provider "openstack" {
  auth_url    = "https://keystone.example.com:5000/v3"
  region      = "RegionOne"
  tenant_name = "my-project"
  user_name   = var.os_username
  password    = var.os_password

  # Domain configuration (required for Keystone v3)
  user_domain_name    = "Default"
  project_domain_name = "Default"
}

variable "os_username" {
  type = string
}

variable "os_password" {
  type      = string
  sensitive = true
}
```

### Environment Variables

Source the OpenStack RC file or set the variables manually.

```bash
# Source the RC file
source openrc.sh

# Or set variables manually
export OS_AUTH_URL="https://keystone.example.com:5000/v3"
export OS_REGION_NAME="RegionOne"
export OS_PROJECT_NAME="my-project"
export OS_USERNAME="myuser"
export OS_PASSWORD="mypassword"
export OS_USER_DOMAIN_NAME="Default"
export OS_PROJECT_DOMAIN_NAME="Default"
```

```hcl
# When environment variables are set, the provider block can be empty
provider "openstack" {}
```

### Application Credentials

Application credentials are the recommended authentication method for automation.

```hcl
# Authentication with application credentials
provider "openstack" {
  auth_url                      = "https://keystone.example.com:5000/v3"
  application_credential_id     = var.app_cred_id
  application_credential_secret = var.app_cred_secret
}
```

### clouds.yaml

OpenStack supports a `clouds.yaml` configuration file.

```yaml
# ~/.config/openstack/clouds.yaml
clouds:
  production:
    auth:
      auth_url: https://keystone.example.com:5000/v3
      project_name: my-project
      username: myuser
      password: mypassword
      user_domain_name: Default
      project_domain_name: Default
    region_name: RegionOne
```

```hcl
# Reference the cloud from clouds.yaml
provider "openstack" {
  cloud = "production"
}
```

## Networking

### Network and Subnet

```hcl
# Create a network
resource "openstack_networking_network_v2" "app" {
  name           = "app-network"
  admin_state_up = true
}

# Create a subnet
resource "openstack_networking_subnet_v2" "app" {
  name       = "app-subnet"
  network_id = openstack_networking_network_v2.app.id
  cidr       = "10.0.1.0/24"
  ip_version = 4

  dns_nameservers = ["8.8.8.8", "8.8.4.4"]

  allocation_pool {
    start = "10.0.1.100"
    end   = "10.0.1.250"
  }
}
```

### Router

```hcl
# Look up the external network
data "openstack_networking_network_v2" "external" {
  name = "external"
}

# Create a router
resource "openstack_networking_router_v2" "main" {
  name                = "main-router"
  admin_state_up      = true
  external_network_id = data.openstack_networking_network_v2.external.id
}

# Connect the subnet to the router
resource "openstack_networking_router_interface_v2" "app" {
  router_id = openstack_networking_router_v2.main.id
  subnet_id = openstack_networking_subnet_v2.app.id
}
```

### Security Groups

```hcl
# Create a security group
resource "openstack_networking_secgroup_v2" "web" {
  name        = "web-servers"
  description = "Security group for web servers"
}

# Allow HTTP
resource "openstack_networking_secgroup_rule_v2" "http" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 80
  port_range_max    = 80
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.web.id
}

# Allow HTTPS
resource "openstack_networking_secgroup_rule_v2" "https" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 443
  port_range_max    = 443
  remote_ip_prefix  = "0.0.0.0/0"
  security_group_id = openstack_networking_secgroup_v2.web.id
}

# Allow SSH from admin network
resource "openstack_networking_secgroup_rule_v2" "ssh" {
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = var.admin_cidr
  security_group_id = openstack_networking_secgroup_v2.web.id
}
```

### Floating IPs

```hcl
# Allocate a floating IP
resource "openstack_networking_floatingip_v2" "web" {
  pool = "external"
}

# Associate the floating IP with an instance
resource "openstack_compute_floatingip_associate_v2" "web" {
  floating_ip = openstack_networking_floatingip_v2.web.address
  instance_id = openstack_compute_instance_v2.web.id
}
```

## Compute Instances

```hcl
# Look up a flavor
data "openstack_compute_flavor_v2" "medium" {
  name = "m1.medium"
}

# Look up an image
data "openstack_images_image_v2" "ubuntu" {
  name        = "Ubuntu 22.04"
  most_recent = true
}

# Create a key pair
resource "openstack_compute_keypair_v2" "deploy" {
  name       = "deploy-key"
  public_key = var.ssh_public_key
}

# Create a compute instance
resource "openstack_compute_instance_v2" "web" {
  name            = "web-server-01"
  flavor_id       = data.openstack_compute_flavor_v2.medium.id
  image_id        = data.openstack_images_image_v2.ubuntu.id
  key_pair        = openstack_compute_keypair_v2.deploy.name
  security_groups = [openstack_networking_secgroup_v2.web.name]

  network {
    uuid = openstack_networking_network_v2.app.id
  }

  user_data = <<-EOT
    #!/bin/bash
    apt-get update
    apt-get install -y nginx
    systemctl enable nginx
  EOT

  metadata = {
    environment = "production"
    role        = "web"
  }
}
```

### Multiple Instances

```hcl
# Create multiple instances
resource "openstack_compute_instance_v2" "web_cluster" {
  count = 3

  name            = "web-${count.index + 1}"
  flavor_id       = data.openstack_compute_flavor_v2.medium.id
  image_id        = data.openstack_images_image_v2.ubuntu.id
  key_pair        = openstack_compute_keypair_v2.deploy.name
  security_groups = [openstack_networking_secgroup_v2.web.name]

  network {
    uuid = openstack_networking_network_v2.app.id
  }
}
```

## Block Storage

```hcl
# Create a volume
resource "openstack_blockstorage_volume_v3" "data" {
  name        = "app-data"
  size        = 100  # GB
  description = "Data volume for application"

  metadata = {
    environment = "production"
  }
}

# Attach the volume to an instance
resource "openstack_compute_volume_attach_v2" "data" {
  instance_id = openstack_compute_instance_v2.web.id
  volume_id   = openstack_blockstorage_volume_v3.data.id
}
```

## Load Balancers (Octavia)

```hcl
# Create a load balancer
resource "openstack_lb_loadbalancer_v2" "web" {
  name          = "web-lb"
  vip_subnet_id = openstack_networking_subnet_v2.app.id
}

# Create a listener
resource "openstack_lb_listener_v2" "http" {
  name            = "http-listener"
  protocol        = "HTTP"
  protocol_port   = 80
  loadbalancer_id = openstack_lb_loadbalancer_v2.web.id
}

# Create a pool
resource "openstack_lb_pool_v2" "web" {
  name        = "web-pool"
  protocol    = "HTTP"
  lb_method   = "ROUND_ROBIN"
  listener_id = openstack_lb_listener_v2.http.id
}

# Add members to the pool
resource "openstack_lb_member_v2" "web" {
  count = length(openstack_compute_instance_v2.web_cluster)

  pool_id       = openstack_lb_pool_v2.web.id
  address       = openstack_compute_instance_v2.web_cluster[count.index].access_ip_v4
  protocol_port = 8080
  subnet_id     = openstack_networking_subnet_v2.app.id
}

# Create a health monitor
resource "openstack_lb_monitor_v2" "web" {
  pool_id     = openstack_lb_pool_v2.web.id
  type        = "HTTP"
  url_path    = "/health"
  delay       = 10
  timeout     = 5
  max_retries = 3
}
```

## Object Storage (Swift)

```hcl
# Create a container (bucket)
resource "openstack_objectstorage_container_v1" "assets" {
  name = "app-assets"

  metadata = {
    environment = "production"
  }

  content_type = "application/json"
}

# Upload an object
resource "openstack_objectstorage_object_v1" "config" {
  container_name = openstack_objectstorage_container_v1.assets.name
  name           = "config.json"
  content        = jsonencode({ version = "1.0" })
  content_type   = "application/json"
}
```

## Best Practices

1. Use application credentials for automation. They can be scoped to a specific project and revoked independently.

2. Use `clouds.yaml` to manage multiple OpenStack environments cleanly.

3. Always create security groups with explicit rules. Do not rely on the default security group.

4. Use floating IPs sparingly. They are a limited resource in most OpenStack deployments.

5. Look up flavors and images by name using data sources instead of hardcoding IDs. IDs can differ between environments.

6. Use metadata and tags to organize your instances for easy identification.

## Wrapping Up

The OpenStack Terraform provider gives you full infrastructure-as-code control over your private cloud. From networks and security groups to compute instances and load balancers, everything can be defined in Terraform. This brings the same DevOps practices to your on-premises OpenStack environment that public cloud teams take for granted.

For monitoring your OpenStack infrastructure and the applications running on it, [OneUptime](https://oneuptime.com) provides monitoring and alerting that works across private and public cloud environments.
