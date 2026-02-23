# How to Use .tf.json Files for Machine-Generated Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, JSON, HCL, Code Generation, Infrastructure as Code

Description: Learn how to use .tf.json files to write Terraform configuration in JSON format, useful for machine-generated configs, templating systems, and programmatic infrastructure.

---

Terraform's native language is HCL (HashiCorp Configuration Language), but it also supports an equivalent JSON syntax. Any `.tf.json` file is loaded alongside regular `.tf` files and contributes to the same configuration. This JSON format is designed for tools and scripts that generate Terraform configuration programmatically.

This post covers the JSON syntax, how it maps to HCL, and practical patterns for using machine-generated Terraform.

## Why JSON Configuration?

HCL is great for humans. It is readable, concise, and supports comments. But when a program needs to generate Terraform configuration, producing valid HCL strings is awkward. JSON, on the other hand, is easy for any programming language to produce.

Common use cases for `.tf.json` files:
- CI/CD pipelines that generate infrastructure definitions
- Internal tools that produce Terraform config from a UI or API
- Migration scripts that convert from other formats to Terraform
- Template engines that stamp out standardized configurations
- Inventory systems that export infrastructure as code

## Basic JSON Syntax

Here is how HCL blocks translate to JSON:

### HCL Version

```hcl
# main.tf
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = "web-server"
  }
}
```

### JSON Equivalent

```json
{
  "resource": {
    "aws_instance": {
      "web": {
        "ami": "ami-0c55b159cbfafe1f0",
        "instance_type": "t3.micro",
        "tags": {
          "Name": "web-server"
        }
      }
    }
  }
}
```

The structure follows the pattern: `block_type -> type_label -> name_label -> arguments`.

## Variables in JSON

```json
{
  "variable": {
    "instance_type": {
      "type": "string",
      "default": "t3.micro",
      "description": "The EC2 instance type"
    },
    "environment": {
      "type": "string",
      "description": "Deployment environment name"
    },
    "tags": {
      "type": "map(string)",
      "default": {}
    }
  }
}
```

Note that type constraints are specified as strings in JSON: `"string"`, `"number"`, `"bool"`, `"list(string)"`, `"map(string)"`, etc.

## Outputs in JSON

```json
{
  "output": {
    "instance_id": {
      "description": "The ID of the created instance",
      "value": "${aws_instance.web.id}"
    },
    "public_ip": {
      "description": "The public IP address",
      "value": "${aws_instance.web.public_ip}"
    }
  }
}
```

## Expressions in JSON

In HCL, you write expressions directly. In JSON, expressions are embedded in strings using the `${}` interpolation syntax:

```json
{
  "resource": {
    "aws_instance": {
      "web": {
        "ami": "ami-0c55b159cbfafe1f0",
        "instance_type": "${var.instance_type}",
        "subnet_id": "${aws_subnet.public[0].id}",
        "tags": {
          "Name": "${var.project_name}-web",
          "Environment": "${var.environment}"
        }
      }
    }
  }
}
```

For non-string expressions (numbers, booleans, lists), you can use native JSON types when the value is literal, or interpolation when it references other values:

```json
{
  "resource": {
    "aws_instance": {
      "web": {
        "ami": "ami-0c55b159cbfafe1f0",
        "instance_type": "t3.micro",
        "monitoring": true,
        "count": 3,
        "vpc_security_group_ids": ["${aws_security_group.web.id}"]
      }
    }
  }
}
```

## Data Sources in JSON

```json
{
  "data": {
    "aws_ami": {
      "amazon_linux": {
        "most_recent": true,
        "owners": ["amazon"],
        "filter": [
          {
            "name": "name",
            "values": ["amzn2-ami-hvm-*-x86_64-gp2"]
          }
        ]
      }
    }
  }
}
```

Nested blocks that can appear multiple times (like `filter`) are represented as JSON arrays.

## Locals in JSON

```json
{
  "locals": {
    "name_prefix": "${var.project_name}-${var.environment}",
    "common_tags": {
      "Project": "${var.project_name}",
      "Environment": "${var.environment}",
      "ManagedBy": "terraform"
    }
  }
}
```

## Terraform and Provider Blocks in JSON

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
        "bucket": "my-terraform-state",
        "key": "terraform.tfstate",
        "region": "us-east-1"
      }
    }
  },
  "provider": {
    "aws": {
      "region": "${var.aws_region}"
    }
  }
}
```

## Generating JSON from Python

Here is a practical example of generating Terraform configuration from a Python script:

```python
#!/usr/bin/env python3
# generate_terraform.py - Generate Terraform config from a service catalog

import json

# Service definitions from your internal catalog
services = [
    {"name": "web", "port": 80, "instance_type": "t3.small", "count": 3},
    {"name": "api", "port": 8080, "instance_type": "t3.medium", "count": 2},
    {"name": "worker", "port": 9090, "instance_type": "t3.large", "count": 1},
]

# Build the Terraform configuration
config = {
    "resource": {
        "aws_instance": {},
        "aws_security_group_rule": {},
    }
}

for svc in services:
    # Generate instance resources
    config["resource"]["aws_instance"][svc["name"]] = {
        "ami": "ami-0c55b159cbfafe1f0",
        "instance_type": svc["instance_type"],
        "count": svc["count"],
        "tags": {
            "Name": f"{svc['name']}-server",
            "Service": svc["name"],
        },
    }

    # Generate security group rules
    config["resource"]["aws_security_group_rule"][f"{svc['name']}_ingress"] = {
        "type": "ingress",
        "from_port": svc["port"],
        "to_port": svc["port"],
        "protocol": "tcp",
        "cidr_blocks": ["10.0.0.0/8"],
        "security_group_id": "${aws_security_group.main.id}",
    }

# Write the JSON file
with open("generated.tf.json", "w") as f:
    json.dump(config, f, indent=2)

print("Generated generated.tf.json")
```

Run it:

```bash
python3 generate_terraform.py
terraform init
terraform plan
```

## Generating JSON from a Shell Script

```bash
#!/bin/bash
# generate_buckets.sh - Generate S3 bucket configs from a list

# Read bucket names from a file
BUCKETS=("data" "logs" "backups" "artifacts")

# Start building JSON
cat > buckets.tf.json <<EOF
{
  "resource": {
    "aws_s3_bucket": {
EOF

# Generate a resource for each bucket
FIRST=true
for bucket in "${BUCKETS[@]}"; do
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> buckets.tf.json
  fi
  cat >> buckets.tf.json <<EOF
      "${bucket}": {
        "bucket": "mycompany-${bucket}",
        "tags": {
          "Name": "mycompany-${bucket}",
          "ManagedBy": "terraform"
        }
      }
EOF
done

cat >> buckets.tf.json <<EOF
    }
  }
}
EOF

echo "Generated buckets.tf.json"
```

## Mixing HCL and JSON Files

You can have both `.tf` and `.tf.json` files in the same directory. Terraform merges them all:

```
project/
  versions.tf           # hand-written HCL
  providers.tf          # hand-written HCL
  variables.tf          # hand-written HCL
  outputs.tf            # hand-written HCL
  networking.tf         # hand-written HCL
  generated.tf.json     # machine-generated JSON
```

This is a good pattern: keep human-maintained configuration in HCL and let tools generate the parts that change frequently or come from external sources.

## JSON Override Files

Override files work in JSON too. Name them `override.tf.json` or `*_override.tf.json`:

```json
{
  "resource": {
    "aws_instance": {
      "web": {
        "instance_type": "t3.micro"
      }
    }
  }
}
```

## Limitations of JSON Format

JSON has some downsides compared to HCL:
- No comments (JSON does not support them)
- More verbose - lots of braces and quotes
- Harder for humans to read and edit
- Expression syntax requires string interpolation for everything

That is why JSON is recommended for machine-generated config, not hand-written config.

## Converting Between Formats

You can convert HCL to JSON (and back) using the `terraform` CLI or third-party tools:

```bash
# Use terraform show to output JSON
terraform show -json

# Use hcl2json tool for file conversion
# (third-party tool, install separately)
hcl2json < main.tf > main.tf.json
```

## Wrapping Up

The `.tf.json` format lets programs generate valid Terraform configuration using standard JSON. It is loaded alongside `.tf` files and merged into the same configuration. Use it when you have tools, scripts, or pipelines that need to produce infrastructure code programmatically. Keep your human-edited configuration in HCL and reserve JSON for the machine-generated parts.

For more on Terraform file organization, see [How to Split Terraform Configuration Across Multiple Files](https://oneuptime.com/blog/post/2026-02-23-terraform-split-configuration-multiple-files/view) and [How to Understand Terraform File Loading Order](https://oneuptime.com/blog/post/2026-02-23-terraform-file-loading-order/view).
