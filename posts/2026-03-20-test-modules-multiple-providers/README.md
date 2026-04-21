# How to Test OpenTofu Modules with Multiple Providers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Testing, IaC, DevOps, Terraform

Description: Learn how to write OpenTofu tests for modules that use multiple providers or provider aliases, including mocking multiple providers simultaneously.

## Introduction

Some modules use multiple providers - for example, deploying resources in multiple AWS regions, using both AWS and Cloudflare, or configuring a primary and replica provider with aliases. OpenTofu's testing framework supports mocking multiple providers and provider aliases in test files.

## Mocking Multiple Different Providers

```hcl
# tests/multi_provider.tftest.hcl

# Mock both AWS and Cloudflare providers

mock_provider "aws" {
  mock_resource "aws_lb" {
    defaults = {
      dns_name = "my-alb.us-east-1.elb.amazonaws.com"
      zone_id  = "Z35SXDOTRQ7X7K"
    }
  }
}

mock_provider "cloudflare" {
  mock_resource "cloudflare_dns_record" {
    defaults = {
      id = "mock-record-id"
    }
  }
}

variables {
  domain     = "example.com"
  subdomain  = "api"
}

run "dns_record_points_to_alb" {
  command = plan

  assert {
    condition     = cloudflare_dns_record.api.content == aws_lb.main.dns_name
    error_message = "Cloudflare record should point to the ALB DNS name"
  }
}
```

## Mocking Provider Aliases (Multi-Region)

```hcl
# main.tf - module using provider aliases
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.primary, aws.replica]
    }
  }
}

resource "aws_instance" "primary" {
  provider      = aws.primary
  ami           = data.aws_ami.primary.id
  instance_type = var.instance_type
}

resource "aws_instance" "replica" {
  provider      = aws.replica
  ami           = data.aws_ami.replica.id
  instance_type = var.instance_type
}
```

```hcl
# tests/multi_region.tftest.hcl

mock_provider "aws" {
  alias = "primary"

  mock_resource "aws_instance" {
    defaults = {
      id                = "i-primary-mock"
      availability_zone = "us-east-1a"
    }
  }

  mock_data "aws_ami" {
    defaults = {
      id = "ami-primary-mock"
    }
  }
}

mock_provider "aws" {
  alias = "replica"

  mock_resource "aws_instance" {
    defaults = {
      id                = "i-replica-mock"
      availability_zone = "us-west-2a"
    }
  }

  mock_data "aws_ami" {
    defaults = {
      id = "ami-replica-mock"
    }
  }
}

variables {
  instance_type = "t3.micro"
}

run "both_regions_get_instances" {
  command = plan

  assert {
    condition     = aws_instance.primary.id == "i-primary-mock"
    error_message = "Primary region instance should be created"
  }

  assert {
    condition     = aws_instance.replica.id == "i-replica-mock"
    error_message = "Replica region instance should be created"
  }
}
```

## Testing AWS Multi-Account Modules

```hcl
# Module using different AWS accounts
terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.shared_services, aws.workload]
    }
  }
}
```

```hcl
# tests/multi_account.tftest.hcl

# Override provider configuration for tests
provider "aws" {
  alias  = "shared_services"
  region = "us-east-1"
  # Test environment - use test credentials, skip assume_role
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  access_key                  = "mock-access-key"
  secret_key                  = "mock-secret-key"
}

mock_provider "aws" {
  alias = "workload"

  mock_resource "aws_instance" {
    defaults = {
      id = "i-workload-mock"
    }
  }
}

run "cross_account_resources_created" {
  command = plan

  assert {
    condition     = aws_instance.workload.id == "i-workload-mock"
    error_message = "Workload account instance should be created"
  }
}
```

## Testing Kubernetes + AWS Provider Combination

```hcl
# tests/aws_and_k8s.tftest.hcl

mock_provider "aws" {
  mock_resource "aws_eks_cluster" {
    defaults = {
      id       = "my-cluster"
      endpoint = "https://mock-eks-endpoint.eks.amazonaws.com"
      certificate_authority = [{
        data = "bW9jay1jYQ=="
      }]
    }
  }
}

mock_provider "kubernetes" {
  mock_resource "kubernetes_namespace_v1" {
    defaults = {
      id = "my-namespace"
    }
  }
}

variables {
  cluster_name = "my-cluster"
  namespace    = "my-app"
}

run "eks_and_namespace_planned" {
  command = plan

  assert {
    condition     = aws_eks_cluster.main.endpoint != ""
    error_message = "EKS cluster should have endpoint"
  }

  assert {
    condition     = kubernetes_namespace_v1.app.id == "my-namespace"
    error_message = "Kubernetes namespace should be planned"
  }
}
```

## Conclusion

Testing modules with multiple providers or provider aliases requires declaring a `mock_provider` block for each provider alias you want to mock, or a matching `provider` block for any alias you want to use with a real provider configuration. Use `alias` in those test blocks to match the aliases declared in your module. This pattern works for multi-region AWS, multi-cloud (AWS + Cloudflare), and mixed provider scenarios (AWS + Kubernetes). All providers can be mocked independently, giving you full control over each provider's simulated behavior.
