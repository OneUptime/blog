# How to Use JSON Configuration Syntax in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, JSON, HCL, Configuration, Infrastructure as Code, DevOps

Description: A guide to writing OpenTofu configurations using JSON syntax as an alternative to HCL.

## Introduction

OpenTofu supports two configuration syntaxes: its HCL-based native syntax in `.tf` and `.tofu` files, and JSON syntax in `.tf.json` and `.tofu.json` files. JSON syntax is useful when generating configurations programmatically or when integrating with tools that produce JSON output. This guide covers how to write valid OpenTofu configurations in JSON.

## JSON vs HCL

```hcl
# HCL syntax (main.tf)

variable "environment" {
  type    = string
  default = "dev"
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"

  tags = {
    Name = "web-server"
  }
}
```

```json
{
  "//": "JSON equivalent (main.tf.json)",
  "variable": {
    "environment": {
      "type": "string",
      "default": "dev"
    }
  },
  "resource": {
    "aws_instance": {
      "web": {
        "ami": "ami-0c55b159cbfafe1f0",
        "instance_type": "t2.micro",
        "tags": {
          "Name": "web-server"
        }
      }
    }
  }
}
```

## JSON Configuration Structure

### terraform Block

```json
{
  "terraform": {
    "required_version": ">= 1.6.0",
    "required_providers": {
      "aws": {
        "source": "hashicorp/aws",
        "version": "~> 5.0"
      }
    },
    "backend": {
      "s3": {
        "bucket": "my-state-bucket",
        "key": "terraform.tfstate",
        "region": "us-east-1"
      }
    }
  }
}
```

### provider Block

```json
{
  "provider": {
    "aws": {
      "region": "us-east-1"
    }
  }
}
```

### resource Block

```json
{
  "resource": {
    "aws_s3_bucket": {
      "my_bucket": {
        "bucket": "my-unique-bucket-name",
        "tags": {
          "Environment": "dev",
          "ManagedBy": "OpenTofu"
        }
      }
    }
  }
}
```

### variable Block

```json
{
  "variable": {
    "region": {
      "type": "string",
      "description": "AWS region",
      "default": "us-east-1"
    },
    "instance_count": {
      "type": "number",
      "description": "Number of instances",
      "default": 1
    }
  }
}
```

### output Block

```json
{
  "output": {
    "bucket_id": {
      "description": "The S3 bucket ID",
      "value": "${aws_s3_bucket.my_bucket.id}"
    }
  }
}
```

### locals Block

```json
{
  "locals": {
    "name_prefix": "${var.environment}-${var.project}",
    "common_tags": {
      "Environment": "${var.environment}",
      "ManagedBy": "OpenTofu"
    }
  }
}
```

## Generating JSON Configurations Programmatically

```python
# Python example: generate OpenTofu JSON config
import json

def generate_ec2_config(name, instance_type, ami, environment):
    config = {
        "resource": {
            "aws_instance": {
                name: {
                    "ami": ami,
                    "instance_type": instance_type,
                    "tags": {
                        "Name": name,
                        "Environment": environment,
                        "ManagedBy": "OpenTofu"
                    }
                }
            }
        }
    }
    return config

# Generate and write the config
instances = [
    ("web-1", "t3.micro", "ami-0c55b159cbfafe1f0", "dev"),
    ("web-2", "t3.micro", "ami-0c55b159cbfafe1f0", "dev"),
]

config = {"resource": {"aws_instance": {}}}
for name, itype, ami, env in instances:
    config["resource"]["aws_instance"][name] = {
        "ami": ami,
        "instance_type": itype,
        "tags": {"Name": name, "Environment": env}
    }

with open("instances.tf.json", "w") as f:
    json.dump(config, f, indent=2)

print("Generated instances.tf.json")
```

## Mixing JSON and HCL

You can mix native syntax and JSON files in the same directory, including `.tf`, `.tofu`, `.tf.json`, and `.tofu.json` files:

```bash
# These can coexist in the same directory
ls -la
# main.tf          <- HCL configuration
# variables.tf     <- HCL variables
# auto-generated.tf.json  <- Machine-generated JSON
```

## Conclusion

JSON configuration syntax in OpenTofu is primarily used for machine-generated configurations, tool integrations, and scenarios where HCL is impractical. While HCL is more human-friendly and should be preferred for manually-written configurations, JSON provides programmatic flexibility. Both formats are fully supported and can coexist in the same project.
