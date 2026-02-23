# How to Configure Linode Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Providers, Linode, Akamai Cloud, Infrastructure as Code

Description: A step-by-step guide to configuring the Linode (Akamai Cloud) provider in Terraform for managing instances, databases, Kubernetes, and networking.

---

Linode, now part of Akamai's cloud computing platform, has built a reputation for straightforward cloud computing with competitive pricing. Their Terraform provider lets you manage Linode instances, block storage, NodeBalancers, Kubernetes clusters, and more through infrastructure as code.

Whether you are migrating from the Linode web console to Terraform or building new infrastructure from scratch, this guide covers everything you need to get started with the Linode provider.

## Prerequisites

- Terraform 1.0 or later
- A Linode account
- A Linode personal access token with appropriate permissions

## Getting Your API Token

1. Log in to the Linode Cloud Manager
2. Go to your profile (click your username in the top right)
3. Select API Tokens
4. Click Create a Personal Access Token
5. Set the expiry and permissions (Read/Write for the resources you need)
6. Copy the token

## Declaring the Provider

```hcl
# versions.tf - Declare the Linode provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    linode = {
      source  = "linode/linode"
      version = "~> 2.14"
    }
  }
}
```

## Provider Configuration

```hcl
# provider.tf - Configure with API token
provider "linode" {
  token = var.linode_token
}

variable "linode_token" {
  type        = string
  sensitive   = true
  description = "Linode API personal access token"
}
```

### Using Environment Variables

```bash
# Set the token via environment variable
export LINODE_TOKEN="your-linode-token"
```

```hcl
# Provider picks up the token from LINODE_TOKEN
provider "linode" {}
```

## Managing Instances (Linodes)

```hcl
# Create a basic Linode instance
resource "linode_instance" "web" {
  label     = "web-server-01"
  region    = "us-east"
  type      = "g6-standard-2"  # 2 CPU, 4GB RAM
  image     = "linode/ubuntu22.04"

  # Root password (use SSH keys in production)
  root_pass = var.root_password

  # Authorized SSH keys
  authorized_keys = [var.ssh_public_key]

  # Assign to a group for organization
  group = "production"
  tags  = ["web", "production"]

  # Enable backups
  backups_enabled = true

  # Private IP for internal communication
  private_ip = true
}

output "instance_ip" {
  value = linode_instance.web.ip_address
}
```

### Instance with StackScript

StackScripts are Linode's equivalent of user data scripts.

```hcl
# Create a StackScript for initial configuration
resource "linode_stackscript" "web_setup" {
  label       = "web-server-setup"
  description = "Sets up a web server with Nginx"
  script      = <<-EOT
    #!/bin/bash
    # <UDF name="hostname" Label="Hostname" />
    # <UDF name="app_port" Label="Application Port" default="8080" />

    # Set hostname
    hostnamectl set-hostname $HOSTNAME

    # Install Nginx
    apt-get update
    apt-get install -y nginx

    # Configure Nginx as reverse proxy
    cat > /etc/nginx/sites-available/app <<'NGINX'
    server {
        listen 80;
        location / {
            proxy_pass http://localhost:$APP_PORT;
        }
    }
    NGINX

    ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/
    rm /etc/nginx/sites-enabled/default
    systemctl restart nginx
  EOT

  images   = ["linode/ubuntu22.04"]
  rev_note = "Initial version"
}

# Use the StackScript when creating an instance
resource "linode_instance" "app" {
  label  = "app-server"
  region = "us-east"
  type   = "g6-standard-4"
  image  = "linode/ubuntu22.04"

  stackscript_id = linode_stackscript.web_setup.id
  stackscript_data = {
    hostname = "app-server-01"
    app_port = "3000"
  }

  root_pass       = var.root_password
  authorized_keys = [var.ssh_public_key]
}
```

## Block Storage

```hcl
# Create a block storage volume
resource "linode_volume" "data" {
  label  = "app-data"
  region = "us-east"
  size   = 100  # 100 GB

  tags = ["production", "data"]
}

# Attach the volume to an instance
resource "linode_instance" "db" {
  label  = "db-server"
  region = "us-east"
  type   = "g6-standard-4"
  image  = "linode/ubuntu22.04"

  root_pass       = var.root_password
  authorized_keys = [var.ssh_public_key]
}

resource "linode_volume" "db_data" {
  label     = "db-data"
  region    = "us-east"
  size      = 200
  linode_id = linode_instance.db.id

  tags = ["production", "database"]
}
```

## NodeBalancers (Load Balancers)

```hcl
# Create a NodeBalancer
resource "linode_nodebalancer" "web" {
  label  = "web-lb"
  region = "us-east"

  tags = ["production"]
}

# Configure a NodeBalancer port
resource "linode_nodebalancer_config" "https" {
  nodebalancer_id = linode_nodebalancer.web.id
  port            = 443
  protocol        = "https"
  algorithm       = "roundrobin"
  stickiness      = "table"

  check          = "http"
  check_path     = "/health"
  check_interval = 10
  check_timeout  = 5
  check_attempts = 3

  ssl_cert = tls_locally_signed_cert.web.cert_pem
  ssl_key  = tls_private_key.web.private_key_pem
}

# Add backend nodes
resource "linode_nodebalancer_node" "web" {
  count = length(linode_instance.web_cluster)

  nodebalancer_id = linode_nodebalancer.web.id
  config_id       = linode_nodebalancer_config.https.id

  label   = "web-${count.index}"
  address = "${linode_instance.web_cluster[count.index].private_ip_address}:8080"
  mode    = "accept"
  weight  = 100
}
```

## Kubernetes (LKE)

```hcl
# Create a managed Kubernetes cluster
resource "linode_lke_cluster" "production" {
  label       = "production"
  k8s_version = "1.28"
  region      = "us-east"

  tags = ["production", "kubernetes"]

  # Default node pool
  pool {
    type  = "g6-standard-4"
    count = 3

    autoscaler {
      min = 2
      max = 5
    }
  }

  # High-memory pool for data workloads
  pool {
    type  = "g6-highmem-2"
    count = 2

    autoscaler {
      min = 1
      max = 4
    }
  }
}

# Output the kubeconfig
output "kubeconfig" {
  value     = linode_lke_cluster.production.kubeconfig
  sensitive = true
}
```

## Networking

### VLANs

```hcl
# Create instances connected to a VLAN
resource "linode_instance" "app_1" {
  label  = "app-1"
  region = "us-east"
  type   = "g6-standard-2"
  image  = "linode/ubuntu22.04"

  root_pass = var.root_password

  interface {
    purpose = "public"
  }

  interface {
    purpose      = "vlan"
    label        = "app-vlan"
    ipam_address = "10.0.0.1/24"
  }
}

resource "linode_instance" "app_2" {
  label  = "app-2"
  region = "us-east"
  type   = "g6-standard-2"
  image  = "linode/ubuntu22.04"

  root_pass = var.root_password

  interface {
    purpose = "public"
  }

  interface {
    purpose      = "vlan"
    label        = "app-vlan"
    ipam_address = "10.0.0.2/24"
  }
}
```

### Firewalls

```hcl
# Create a Cloud Firewall
resource "linode_firewall" "web" {
  label = "web-firewall"

  # Allow HTTP from anywhere
  inbound {
    label    = "allow-http"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "80"
    ipv4     = ["0.0.0.0/0"]
    ipv6     = ["::/0"]
  }

  # Allow HTTPS from anywhere
  inbound {
    label    = "allow-https"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "443"
    ipv4     = ["0.0.0.0/0"]
    ipv6     = ["::/0"]
  }

  # Allow SSH from admin IP only
  inbound {
    label    = "allow-ssh"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "22"
    ipv4     = ["${var.admin_ip}/32"]
  }

  # Default inbound policy: drop everything else
  inbound_policy = "DROP"

  # Allow all outbound traffic
  outbound_policy = "ACCEPT"

  linodes = [
    linode_instance.web.id,
  ]
}
```

## DNS (Domains)

```hcl
# Manage a domain
resource "linode_domain" "main" {
  domain    = "example.com"
  type      = "master"
  soa_email = "admin@example.com"
}

# Create DNS records
resource "linode_domain_record" "www" {
  domain_id   = linode_domain.main.id
  record_type = "A"
  name        = "www"
  target      = linode_nodebalancer.web.ipv4
  ttl_sec     = 300
}

resource "linode_domain_record" "api" {
  domain_id   = linode_domain.main.id
  record_type = "A"
  name        = "api"
  target      = linode_instance.app.ip_address
  ttl_sec     = 300
}

resource "linode_domain_record" "mx" {
  domain_id   = linode_domain.main.id
  record_type = "MX"
  name        = ""
  target      = "mail.example.com"
  priority    = 10
  ttl_sec     = 3600
}
```

## Object Storage

```hcl
# Create an Object Storage key
resource "linode_object_storage_key" "app" {
  label = "app-storage-key"

  bucket_access {
    bucket_name = linode_object_storage_bucket.assets.label
    cluster     = "us-east-1"
    permissions = "read_write"
  }
}

# Create an Object Storage bucket
resource "linode_object_storage_bucket" "assets" {
  label   = "app-assets"
  cluster = "us-east-1"
}
```

## Data Sources

```hcl
# Look up available images
data "linode_images" "ubuntu" {
  filter {
    name   = "label"
    values = ["Linode 22.04"]
  }
}

# Look up instance types
data "linode_instance_type" "standard" {
  id = "g6-standard-2"
}

# Look up the current account
data "linode_account" "current" {}

# Look up available regions
data "linode_regions" "available" {
  filter {
    name   = "status"
    values = ["ok"]
  }
}
```

## Best Practices

1. Use private IPs and VLANs for inter-instance communication. Public traffic incurs bandwidth charges.

2. Enable backups for any instance with important data. It is a small percentage of the instance cost.

3. Use Cloud Firewalls to restrict access. Default configurations leave all ports open.

4. Store your Linode token securely. Use environment variables in CI/CD and never commit tokens to version control.

5. Use LKE for containerized workloads. The managed Kubernetes service handles control plane management and integrates well with other Linode services.

## Wrapping Up

The Linode Terraform provider gives you full control over your Akamai cloud infrastructure as code. From individual instances to managed Kubernetes clusters, everything can be defined, versioned, and deployed through Terraform. The provider's simplicity mirrors Linode's own platform, making it easy to get started and maintain.

For monitoring your Linode infrastructure, [OneUptime](https://oneuptime.com) provides server monitoring, uptime checks, and alerting that works across any cloud platform.
