# How to Use Lifecycle Customizations with Data Sources in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Data Source, Lifecycle, Custom Conditions, Infrastructure as Code, DevOps

Description: A guide to using lifecycle customizations with data sources in OpenTofu to add preconditions, postconditions, and control refresh behavior.

## Introduction

Data sources in OpenTofu support lifecycle customizations such as `precondition` and `postcondition` blocks. These allow you to validate assumptions about both the query inputs and the fetched data. Note that `ignore_changes` and `prevent_destroy` are not supported on data sources. In current OpenTofu releases, data source lifecycle blocks support `enabled`, `precondition`, and `postcondition`.

## Preconditions on Data Sources

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  lifecycle {
    precondition {
      condition     = var.aws_region != ""
      error_message = "AWS region must be specified before querying AMI data."
    }
  }
}
```

## Postconditions on Data Sources

```hcl
data "aws_vpc" "main" {
  id = var.vpc_id

  lifecycle {
    postcondition {
      # Verify the VPC has DNS support enabled
      condition     = self.enable_dns_support == true
      error_message = "The VPC must have DNS support enabled. Got: ${self.enable_dns_support}"
    }

    postcondition {
      # Verify the VPC CIDR block is valid
      condition     = can(cidrsubnet(self.cidr_block, 0, 0))
      error_message = "The VPC CIDR block is not valid: ${self.cidr_block}"
    }
  }
}
```

## Validating Data Source Results

```hcl
data "aws_eks_cluster" "main" {
  name = var.cluster_name

  lifecycle {
    postcondition {
      # Ensure cluster is in ACTIVE state
      condition     = self.status == "ACTIVE"
      error_message = "EKS cluster ${var.cluster_name} is not in ACTIVE state. Current state: ${self.status}"
    }

    postcondition {
      # Verify Kubernetes version meets minimum requirement
      condition = tonumber(split(".", self.version)[0]) > 1 || (
        tonumber(split(".", self.version)[0]) == 1 &&
        tonumber(split(".", self.version)[1]) >= 28
      )
      error_message = "EKS cluster must run Kubernetes 1.28 or higher. Current version: ${self.version}"
    }
  }
}
```

## Validating Secret Existence and Format

```hcl
data "aws_secretsmanager_secret_version" "app_config" {
  secret_id = "myapp/config"

  lifecycle {
    postcondition {
      # Verify the secret contains valid JSON
      condition     = can(jsondecode(self.secret_string))
      error_message = "The secret myapp/config must contain valid JSON."
    }
  }
}

locals {
  app_config = jsondecode(data.aws_secretsmanager_secret_version.app_config.secret_string)
}

data "aws_secretsmanager_secret_version" "db_creds" {
  secret_id = "myapp/db-credentials"

  lifecycle {
    postcondition {
      # Verify required keys exist
      condition     = can(jsondecode(self.secret_string).username) && can(jsondecode(self.secret_string).password)
      error_message = "The db-credentials secret must contain 'username' and 'password' keys."
    }
  }
}
```

## AMI Age Validation

```hcl
data "aws_ami" "app" {
  most_recent = true
  owners      = ["self"]

  filter {
    name   = "name"
    values = ["myapp-*"]
  }

  filter {
    name   = "tag:Environment"
    values = [var.environment]
  }

  lifecycle {
    postcondition {
      # Ensure AMI is not too old (30 days)
      condition     = timecmp(self.creation_date, timeadd(plantimestamp(), "-720h")) > 0
      error_message = "The selected AMI is more than 30 days old and may be outdated. Creation date: ${self.creation_date}"
    }

    postcondition {
      # Ensure AMI is in available state
      condition     = self.state == "available"
      error_message = "The AMI must be in 'available' state. Got: ${self.state}"
    }
  }
}
```

## Controlling When Data Sources Are Read

```hcl
# OpenTofu reads data sources during planning when possible

# Direct references already create dependencies. Use depends_on
# when you need to defer a read because of a hidden dependency.

data "aws_s3_objects" "configs" {
  bucket = var.config_bucket_name
  prefix = "configs/"

  # If aws_s3_bucket.configs has planned changes, OpenTofu
  # reads this data source after those changes are applied.
  depends_on = [aws_s3_bucket.configs]
}
```

## Combining Pre and Post Conditions

```hcl
data "aws_iam_role" "existing" {
  name = var.existing_role_name

  lifecycle {
    precondition {
      # Validate the role name format before querying
      condition     = can(regex("^[a-zA-Z0-9+=,.@_-]+$", var.existing_role_name))
      error_message = "IAM role name contains invalid characters: ${var.existing_role_name}"
    }

    postcondition {
      # Verify the role has the expected path
      condition     = startswith(self.path, "/service-roles/")
      error_message = "The IAM role must be under /service-roles/ path. Got path: ${self.path}"
    }
  }
}
```

## Error Messages with Context

```hcl
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [var.vpc_id]
  }

  tags = {
    Type = "private"
  }

  lifecycle {
    postcondition {
      condition     = length(self.ids) >= 2
      error_message = "Expected at least 2 private subnets in VPC ${var.vpc_id}, but found ${length(self.ids)}. Ensure private subnets are tagged with Type=private."
    }
  }
}
```

## Conclusion

Lifecycle customizations on data sources provide validation at the data layer - before those values are used to configure resources. Preconditions validate inputs to data source queries (such as variable formats), while postconditions validate the data returned (such as ensuring a cluster is active or a secret contains required keys). OpenTofu evaluates these checks as early as it can: often during planning, and during apply when values are not yet known. Use lifecycle customizations on data sources when working with data that must meet specific requirements for your infrastructure to function correctly.
