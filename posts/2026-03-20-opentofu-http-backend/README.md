# How to Configure the HTTP Backend in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Backend

Description: Learn how to configure the HTTP backend in OpenTofu to store state on any server that implements the OpenTofu HTTP state protocol.

## Introduction

The HTTP backend stores OpenTofu state on a remote server via HTTP. Any server that implements the OpenTofu HTTP state API can serve as a backend. This makes it a flexible option for custom or self-hosted state storage solutions.

## Basic Configuration

```hcl
terraform {
  backend "http" {
    address        = "https://state.acme-corp.com/terraform/production"
    lock_address   = "https://state.acme-corp.com/terraform/production/lock"
    unlock_address = "https://state.acme-corp.com/terraform/production/lock"
  }
}
```

## Authentication

```hcl
terraform {
  backend "http" {
    address  = "https://state.acme-corp.com/terraform/production"
    username = "tofu"
    password = var.state_password

    # Or use client certificates
    client_certificate_pem = file("client.pem")
    client_private_key_pem = file("client-key.pem")
    client_ca_certificate_pem = file("ca.pem")
  }
}
```

## Environment Variable Authentication

```bash
export TF_HTTP_USERNAME="tofu"
export TF_HTTP_PASSWORD="your-password"
export TF_HTTP_ADDRESS="https://state.acme-corp.com/terraform/production"

tofu init
```

## HTTP Methods

The HTTP backend uses specific methods for each operation:

| Operation | Method |
|-----------|--------|
| Read state | GET |
| Write state | POST |
| Delete state | DELETE |
| Lock state | LOCK |
| Unlock state | UNLOCK |

```hcl
terraform {
  backend "http" {
    address        = "https://state.acme-corp.com/terraform/production"
    lock_address   = "https://state.acme-corp.com/terraform/production/lock"
    unlock_address = "https://state.acme-corp.com/terraform/production/lock"
    lock_method    = "PUT"    # Override default LOCK method
    unlock_method  = "DELETE" # Override default UNLOCK method
  }
}
```

## GitLab HTTP Backend

GitLab includes a built-in Terraform state backend compatible with the HTTP backend:

```hcl
terraform {
  backend "http" {
    address        = "https://gitlab.com/api/v4/projects/12345/terraform/state/production"
    lock_address   = "https://gitlab.com/api/v4/projects/12345/terraform/state/production/lock"
    unlock_address = "https://gitlab.com/api/v4/projects/12345/terraform/state/production/lock"
    lock_method    = "POST"
    unlock_method  = "DELETE"
    username       = "your-gitlab-username"
    password       = var.gitlab_token  # GitLab personal access token
    retry_wait_min = 5
  }
}
```

## Retry Configuration

```hcl
terraform {
  backend "http" {
    address        = "https://state.acme-corp.com/terraform/production"
    retry_max      = 3    # Number of retries on failure
    retry_wait_min = 1    # Minimum seconds between retries
    retry_wait_max = 5    # Maximum seconds between retries
  }
}
```

## TLS Configuration

```hcl
terraform {
  backend "http" {
    address             = "https://state.acme-corp.com/terraform/production"
    skip_cert_verification = false  # Set true only for testing

    # Client certificate auth
    client_certificate_pem    = file("/etc/ssl/client.pem")
    client_private_key_pem    = file("/etc/ssl/client-key.pem")
    client_ca_certificate_pem = file("/etc/ssl/ca.pem")
  }
}
```

## Partial Configuration for CI/CD

```hcl
# backend.tf - no credentials stored in code

terraform {
  backend "http" {}
}
```

```bash
# CI/CD pipeline - pass configuration at runtime
tofu init \
  -backend-config="address=https://state.acme-corp.com/terraform/$ENV" \
  -backend-config="username=$STATE_USER" \
  -backend-config="password=$STATE_PASSWORD"
```

## Implementing a Simple State Server

A minimal HTTP state server must implement:

```text
GET    /state        -> Return current state JSON
POST   /state        -> Accept new state JSON body
DELETE /state        -> Delete state
LOCK   /state/lock   -> Acquire lock, return lock info JSON
UNLOCK /state/lock   -> Release lock
```

When state locking is enabled, the POST request includes an `ID` query parameter containing the lock ID, so the server can verify the writer holds the current lock.

## Conclusion

The HTTP backend is the most flexible OpenTofu backend, enabling state storage on any compliant HTTP server. GitLab's built-in Terraform state API is a common use case. When implementing your own backend server, handle GET/POST/DELETE for state and LOCK/UNLOCK for concurrency control. Use environment variables or partial configuration to keep credentials out of source control.
