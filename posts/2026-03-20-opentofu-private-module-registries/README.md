# How to Use Private Module Registries with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Module, Registry

Description: Learn how to configure and use private module registries with OpenTofu for distributing internal modules securely within your organization.

## Introduction

Private module registries let organizations distribute internal OpenTofu modules with the same versioning and discoverability features as the public registry, but with access control. Options include self-hosted registries, HCP Terraform (formerly Terraform Cloud), and Spacelift.

## Referencing a Private Registry Module

The source format for private registry modules mirrors the public registry but uses your registry's hostname:

```hcl
module "vpc" {
  source  = "registry.acme-corp.com/networking/vpc/aws"
  version = "~> 2.0"

  name       = "production"
  cidr_block = "10.0.0.0/16"
}
```

## Configuring Registry Credentials

Add credentials in your `.tofurc` (or `.terraformrc`) file:

```hcl
# ~/.tofurc

credentials "registry.acme-corp.com" {
  token = "YOUR_REGISTRY_TOKEN"
}
```

Or use an environment variable:

```bash
export TF_TOKEN_registry_acme__corp_com="YOUR_REGISTRY_TOKEN"
```

The environment variable name is `TF_TOKEN_` followed by the hostname, with `.` encoded as a single underscore (`_`) and `-` encoded as a double underscore (`__`). So `registry.acme-corp.com` becomes `registry_acme__corp_com`.

## Using HCP Terraform as a Private Registry

HCP Terraform provides a built-in private registry at `app.terraform.io`:

```hcl
# Configure credentials for HCP Terraform registry
# ~/.tofurc
credentials "app.terraform.io" {
  token = "YOUR_HCP_TOKEN"
}
```

```hcl
# Use a module from the HCP Terraform private registry
module "vpc" {
  source  = "app.terraform.io/acme-corp/vpc/aws"
  version = "~> 2.0"
}
```

## Setting Up a Self-Hosted Registry

The OpenTofu Registry Protocol is documented and implementable. A minimal registry needs:

1. An HTTPS endpoint serving the registry discovery document
2. Module download URLs following the standard API
3. Authentication via bearer tokens

Popular self-hosted options:
- **Terrareg** - open-source Terraform/OpenTofu module registry
- **Tapir** - lightweight self-hosted registry
- **Spacelift** - SaaS with private registry included

## CI/CD Configuration

```bash
# GitHub Actions: configure registry credentials before tofu init
- name: Configure registry credentials
  run: |
    cat > ~/.tofurc << EOF
    credentials "registry.acme-corp.com" {
      token = "${{ secrets.REGISTRY_TOKEN }}"
    }
    EOF

- name: Initialize OpenTofu
  run: tofu init
```

## Network Configuration for Air-Gapped Environments

For environments without internet access, you can override service discovery to point at an internal registry serving modules locally:

```hcl
# ~/.tofurc
host "registry.acme-corp.com" {
  services = {
    "modules.v1" = "https://registry.acme-corp.com/v1/modules/"
  }
}
```

## Module Discovery

Private registries typically provide a web UI for browsing available modules. Team members can search by provider or namespace without needing to know exact source strings.

## Conclusion

Private module registries provide organizations with a secure, versioned distribution system for internal OpenTofu modules. Configure credentials in `.tofurc` or via environment variables, reference private modules with the `hostname/namespace/module/provider` source format, and use semantic versioning tags to communicate compatibility. Self-hosted options like Terrareg offer full control for security-conscious environments.
