# How to Create DigitalOcean VPCs with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, DigitalOcean, VPC, Networking, Infrastructure as Code

Description: Learn how to create DigitalOcean Virtual Private Clouds (VPCs) with OpenTofu and place resources like Droplets and databases within them.

DigitalOcean VPCs provide private network isolation for your cloud resources. Resources in the same VPC can communicate over private IP addresses without traffic leaving DigitalOcean's network. OpenTofu lets you define VPCs and associate resources with them as code.

## Creating a VPC

```hcl
resource "digitalocean_vpc" "production" {
  name        = "production-vpc"
  region      = "nyc3"
  ip_range    = "10.10.0.0/16"
  description = "Production network for application resources"
}

output "vpc_id" {
  value = digitalocean_vpc.production.id
}

output "vpc_urn" {
  value = digitalocean_vpc.production.urn
}
```

## Placing Droplets in a VPC

```hcl
resource "digitalocean_droplet" "app" {
  name     = "app-01"
  region   = digitalocean_vpc.production.region  # Must match VPC region
  size     = "s-2vcpu-4gb"
  image    = "ubuntu-22-04-x64"
  vpc_uuid = digitalocean_vpc.production.id

  ssh_keys = [var.ssh_key_fingerprint]
}

output "app_private_ip" {
  value = digitalocean_droplet.app.ipv4_address_private
}
```

## Placing Databases in a VPC

```hcl
resource "digitalocean_database_cluster" "postgres" {
  name       = "production-db"
  engine     = "pg"
  version    = "16"
  size       = "db-s-1vcpu-1gb"
  region     = "nyc3"
  node_count = 1

  # Place in the same VPC as the application Droplets
  private_network_uuid = digitalocean_vpc.production.id
}
```

## Placing Kubernetes Clusters in a VPC

```hcl
resource "digitalocean_kubernetes_cluster" "main" {
  name     = "production-k8s"
  region   = "nyc3"
  version  = "1.32.2-do.0"
  vpc_uuid = digitalocean_vpc.production.id

  node_pool {
    name       = "worker"
    size       = "s-2vcpu-4gb"
    node_count = 3
  }
}
```

## Multi-Region VPC Architecture

Create VPCs in multiple regions for geographically distributed deployments:

```hcl
variable "regions" {
  type    = list(string)
  default = ["nyc3", "sfo3", "lon1"]
}

resource "digitalocean_vpc" "regional" {
  for_each    = toset(var.regions)
  name        = "production-${each.key}"
  region      = each.key
  ip_range    = {
    "nyc3" = "10.10.0.0/16"
    "sfo3" = "10.20.0.0/16"
    "lon1" = "10.30.0.0/16"
  }[each.key]
}
```

## Referencing the Default VPC

If you don't specify a VPC, resources are placed in the region's default VPC. You can reference it:

```hcl
data "digitalocean_vpc" "default" {
  region = "nyc3"
}

resource "digitalocean_droplet" "dev" {
  name     = "dev-server"
  region   = "nyc3"
  size     = "s-1vcpu-1gb"
  image    = "ubuntu-22-04-x64"
  vpc_uuid = data.digitalocean_vpc.default.id
}
```

## Conclusion

DigitalOcean VPCs give your resources private network isolation with minimal configuration - just a name, region, and CIDR block. Place Droplets, databases, and Kubernetes clusters in the same VPC to enable private communication, and use separate VPCs for different environments to enforce network-level isolation.
