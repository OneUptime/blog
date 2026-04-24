# How to Add Postconditions to Resources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, Postconditions, Custom Conditions, Infrastructure as Code, DevOps

Description: A guide to adding postconditions to resources in OpenTofu to validate resource attributes after creation or modification.

## Introduction

Postconditions in OpenTofu allow you to validate that a resource or data source has the characteristics you expect after it is evaluated. If a postcondition fails, OpenTofu reports an error and blocks dependent changes. Postconditions are checked after the object is evaluated and its attributes are known.

## Basic Postcondition Syntax

```hcl
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.micro"

  lifecycle {
    postcondition {
      condition     = self.public_ip != ""
      error_message = "The instance must have a public IP address assigned."
    }
  }
}
```

## Validating Resource State After Creation

```hcl
resource "aws_s3_bucket" "data" {
  bucket = var.bucket_name

  lifecycle {
    postcondition {
      # Verify the bucket region matches expected
      condition     = self.bucket_region == var.expected_region
      error_message = "Bucket was created in ${self.bucket_region} but expected ${var.expected_region}."
    }
  }
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id

  versioning_configuration {
    status = "Enabled"
  }

  lifecycle {
    postcondition {
      condition     = self.versioning_configuration[0].status == "Enabled"
      error_message = "Bucket versioning must be enabled. Got: ${self.versioning_configuration[0].status}"
    }
  }
}
```

## Postconditions on Computed Attributes

```hcl
resource "aws_lb" "web" {
  name               = "web-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids

  lifecycle {
    postcondition {
      # Verify the ALB got a DNS name
      condition     = length(self.dns_name) > 0
      error_message = "Load balancer must have a DNS name assigned."
    }

    postcondition {
      # Verify it's not internal when we specified external
      condition     = self.internal == false
      error_message = "Load balancer must be external (internet-facing)."
    }
  }
}
```

## Validating Security Requirements

```hcl
resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id

  # ... rules defined here

  lifecycle {
    postcondition {
      # Ensure description is meaningful (not empty)
      condition     = length(self.description) > 0
      error_message = "Security group must have a non-empty description."
    }

    postcondition {
      # Ensure it's attached to the right VPC
      condition     = self.vpc_id == aws_vpc.main.id
      error_message = "Security group must be in the main VPC."
    }
  }
}

resource "aws_db_instance" "main" {
  identifier                = "myapp-db"
  engine                    = "postgres"
  instance_class            = "db.t3.medium"
  allocated_storage         = 20
  publicly_accessible       = false
  deletion_protection       = var.environment == "prod"
  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "myapp-db-final" : null

  lifecycle {
    postcondition {
      # Production DBs must have deletion protection
      condition     = var.environment != "prod" || self.deletion_protection == true
      error_message = "Production database must have deletion protection enabled."
    }

    postcondition {
      # DB must not be publicly accessible
      condition     = self.publicly_accessible == false
      error_message = "Database must not be publicly accessible."
    }
  }
}
```

## Using self to Reference Resource Attributes

```hcl
resource "aws_iam_role" "lambda" {
  name               = "${var.function_name}-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json

  lifecycle {
    postcondition {
      # Verify the role ARN follows expected format
      condition     = can(regex("^arn:aws:iam::[0-9]{12}:role/", self.arn))
      error_message = "IAM role ARN does not match expected format. Got: ${self.arn}"
    }
  }
}

resource "aws_lambda_function" "app" {
  function_name = var.function_name
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = var.deployment_package

  lifecycle {
    postcondition {
      # Verify the function was created with the correct runtime
      condition     = self.runtime == "nodejs20.x"
      error_message = "Lambda function must use nodejs20.x runtime. Got: ${self.runtime}"
    }

    postcondition {
      # Verify timeout is within acceptable range
      condition     = self.timeout <= 300
      error_message = "Lambda function timeout must not exceed 300 seconds. Got: ${self.timeout}"
    }
  }
}
```

## Postconditions vs Preconditions

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  lifecycle {
    # Precondition: checked before the resource is evaluated, validates assumptions
    precondition {
      condition     = contains(["t3.micro", "t3.small", "t3.medium"], var.instance_type)
      error_message = "Instance type must be micro, small, or medium."
    }

    # Postcondition: checked after the resource is evaluated, validates guarantees
    postcondition {
      condition     = self.instance_state == "running"
      error_message = "Instance must be in running state after creation. Got: ${self.instance_state}"
    }
  }
}
```

## Data Source Postconditions

```hcl
data "aws_vpc" "selected" {
  id = var.vpc_id

  lifecycle {
    postcondition {
      # Validate the VPC has DNS support enabled
      condition     = self.enable_dns_support == true
      error_message = "The selected VPC must have DNS support enabled."
    }

    postcondition {
      # Validate CIDR range
      condition     = can(cidrhost(self.cidr_block, 0))
      error_message = "The VPC CIDR block is not valid."
    }
  }
}
```

## Conclusion

Postconditions allow you to catch misconfigurations that only become apparent after a resource is created. Unlike preconditions, which are typically used to validate assumptions before a resource is evaluated, postconditions use `self` to reference the resource's actual attributes after creation. They are particularly useful for validating computed attributes (like ARNs, DNS names, and assigned IPs), enforcing security requirements, and ensuring infrastructure meets compliance standards. Use postconditions when you need to verify the actual state of created resources, not just the intended configuration.
