# How to Configure HCP Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP, HashiCorp Cloud Platform, Provider, Infrastructure as Code

Description: Learn how to configure the HCP (HashiCorp Cloud Platform) provider in Terraform to manage Vault clusters, Consul clusters, HCP Packer, and other cloud services programmatically.

---

HashiCorp Cloud Platform (HCP) gives you managed versions of HashiCorp tools like Vault, Consul, Packer, and Boundary. Instead of clicking through the HCP portal every time you need a new cluster, you can manage everything through Terraform using the HCP provider. This guide walks you through configuring the HCP provider from scratch, covering authentication, resource creation, and practical patterns.

## Prerequisites

Before you start, you need a few things in place:

- A HashiCorp Cloud Platform account (sign up at portal.cloud.hashicorp.com)
- Terraform 1.0 or later installed on your machine
- An HCP service principal with appropriate permissions

If you have not created a service principal yet, head to the HCP portal, navigate to your organization's settings, and create one under the "Service Principals" section. You will get a client ID and client secret that Terraform uses to authenticate.

## Basic Provider Configuration

Start by declaring the HCP provider in your Terraform configuration. Create a file called `main.tf`:

```hcl
# main.tf - Basic HCP provider setup

terraform {
  required_providers {
    hcp = {
      # Official HashiCorp HCP provider from the Terraform registry
      source  = "hashicorp/hcp"
      version = "~> 0.78"
    }
  }

  required_version = ">= 1.0"
}

# Configure the HCP provider with credentials
provider "hcp" {
  client_id     = var.hcp_client_id
  client_secret = var.hcp_client_secret
}
```

Define the variables in a separate file:

```hcl
# variables.tf - HCP credential variables

variable "hcp_client_id" {
  type        = string
  description = "The client ID for the HCP service principal"
  sensitive   = true
}

variable "hcp_client_secret" {
  type        = string
  description = "The client secret for the HCP service principal"
  sensitive   = true
}
```

## Authentication Methods

The HCP provider supports several ways to authenticate. You can pick whichever fits your workflow best.

### Environment Variables

The cleanest approach for CI/CD pipelines is environment variables. Set them before running Terraform:

```bash
# Export HCP credentials as environment variables
export HCP_CLIENT_ID="your-client-id-here"
export HCP_CLIENT_SECRET="your-client-secret-here"

# Now run Terraform without specifying credentials in the config
terraform init
terraform plan
```

When using environment variables, your provider block simplifies to:

```hcl
# The provider will pick up credentials from environment variables automatically
provider "hcp" {}
```

### Using a Credentials File

For local development, you can also use the HCP CLI to log in, and the provider picks up the token automatically:

```bash
# Log in to HCP via the CLI
hcp auth login

# The provider will use the cached token
terraform plan
```

### Project-Level Configuration

If your organization has multiple HCP projects, specify the project ID in the provider:

```hcl
provider "hcp" {
  client_id     = var.hcp_client_id
  client_secret = var.hcp_client_secret

  # Pin the provider to a specific HCP project
  project_id = var.hcp_project_id
}
```

## Creating an HVN (HashiCorp Virtual Network)

Most HCP services require a HashiCorp Virtual Network. Think of it as the networking layer that connects HCP services to your cloud environment:

```hcl
# Create an HVN in AWS us-west-2
resource "hcp_hvn" "main" {
  hvn_id         = "main-hvn"
  cloud_provider = "aws"
  region         = "us-west-2"

  # CIDR block for the HVN - must not overlap with your VPC
  cidr_block = "172.25.16.0/20"
}
```

## Deploying an HCP Vault Cluster

With the HVN in place, you can spin up a managed Vault cluster:

```hcl
# Deploy a development-tier HCP Vault cluster
resource "hcp_vault_cluster" "example" {
  cluster_id = "vault-dev"
  hvn_id     = hcp_hvn.main.hvn_id

  # Development tier is good for testing
  # Use "standard_small" or higher for production
  tier = "dev"

  # Enable public access for development (disable in production)
  public_endpoint = true
}

# Create an admin token for the Vault cluster
resource "hcp_vault_cluster_admin_token" "example" {
  cluster_id = hcp_vault_cluster.example.cluster_id
}

# Output the Vault address and token
output "vault_public_url" {
  value = hcp_vault_cluster.example.vault_public_endpoint_url
}

output "vault_admin_token" {
  value     = hcp_vault_cluster_admin_token.example.token
  sensitive = true
}
```

## Deploying an HCP Consul Cluster

Similarly, you can set up managed Consul:

```hcl
# Deploy a development-tier HCP Consul cluster
resource "hcp_consul_cluster" "example" {
  cluster_id      = "consul-dev"
  hvn_id          = hcp_hvn.main.hvn_id
  tier            = "development"

  # Connect clients from outside the HVN
  connect_enabled     = true
  public_endpoint     = true

  # Minimum Consul version
  min_consul_version = "v1.16.0"
}

# Generate a root token for initial setup
resource "hcp_consul_cluster_root_token" "example" {
  cluster_id = hcp_consul_cluster.example.cluster_id
}
```

## Peering with AWS VPC

To connect HCP services to your existing AWS infrastructure, set up VPC peering:

```hcl
# Peer the HVN with an existing AWS VPC
resource "hcp_aws_network_peering" "peer" {
  hvn_id          = hcp_hvn.main.hvn_id
  peering_id      = "hvn-to-vpc"
  peer_vpc_id     = "vpc-0abc123def456"
  peer_account_id = "123456789012"
  peer_vpc_region = "us-west-2"
}

# Add a route from the HVN to the peered VPC
resource "hcp_hvn_route" "peer_route" {
  hvn_link         = hcp_hvn.main.self_link
  hvn_route_id     = "peer-route"
  destination_cidr = "10.0.0.0/16"

  target_link = hcp_aws_network_peering.peer.self_link
}
```

## Working with HCP Packer

HCP Packer provides a registry for your machine images. You can reference Packer images in Terraform:

```hcl
# Look up the latest image from an HCP Packer channel
data "hcp_packer_version" "ubuntu" {
  bucket_name  = "ubuntu-base"
  channel_name = "latest"
}

# Get the specific artifact for your region
data "hcp_packer_artifact" "ubuntu_us_west_2" {
  bucket_name         = "ubuntu-base"
  version_fingerprint = data.hcp_packer_version.ubuntu.fingerprint
  platform            = "aws"
  region              = "us-west-2"
}

# Use the AMI in an EC2 instance
resource "aws_instance" "web" {
  ami           = data.hcp_packer_artifact.ubuntu_us_west_2.external_identifier
  instance_type = "t3.micro"

  tags = {
    Name = "web-server"
  }
}
```

## Organizing Configuration with Modules

For larger setups, wrap your HCP resources into modules:

```hcl
# modules/hcp-vault/main.tf

variable "hvn_id" {
  type = string
}

variable "cluster_name" {
  type = string
}

variable "tier" {
  type    = string
  default = "dev"
}

resource "hcp_vault_cluster" "this" {
  cluster_id      = var.cluster_name
  hvn_id          = var.hvn_id
  tier            = var.tier
  public_endpoint = var.tier == "dev" ? true : false
}

output "vault_url" {
  value = hcp_vault_cluster.this.vault_public_endpoint_url
}
```

Then call it from your root module:

```hcl
module "vault_dev" {
  source       = "./modules/hcp-vault"
  hvn_id       = hcp_hvn.main.hvn_id
  cluster_name = "vault-dev"
  tier         = "dev"
}

module "vault_prod" {
  source       = "./modules/hcp-vault"
  hvn_id       = hcp_hvn.main.hvn_id
  cluster_name = "vault-prod"
  tier         = "standard_small"
}
```

## Best Practices

A few things to keep in mind when working with the HCP provider:

**Pin your provider version.** The HCP provider moves fast. Use version constraints like `~> 0.78` to avoid surprises during `terraform init`.

**Never hardcode credentials.** Always use environment variables or a secrets manager. Mark credential variables as `sensitive = true` so they do not appear in logs.

**Use separate HVNs for different environments.** Keep production and development traffic isolated by running separate HVNs.

**Plan your CIDR blocks carefully.** The HVN CIDR must not overlap with any VPC you plan to peer with. Document your CIDR allocations somewhere central.

**Monitor your HCP resources.** HCP provides built-in monitoring, but you can also pull metrics into your own observability stack using the HCP APIs.

## Conclusion

The HCP provider lets you treat HashiCorp's managed services as code, just like any other infrastructure. You can version your Vault and Consul clusters, peer them with your cloud networks, and manage the whole lifecycle through Terraform. Start with a development-tier cluster to get familiar with the resources, then scale up to production when you are ready. For related guides on Terraform providers, check out our post on [configuring multiple provider instances](https://oneuptime.com/blog/post/2026-02-23-how-to-use-multiple-provider-instances-in-a-single-configuration/view).
