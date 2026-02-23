# How to Use Sentinel Mock Data for Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Testing, Mock Data, Development

Description: Learn how to create and use mock data for testing Sentinel policies including mock structures for tfplan, tfconfig, tfstate, and tfrun imports.

---

Mock data is the foundation of Sentinel policy testing. Without it, you would have to deploy your policies to HCP Terraform and trigger real Terraform runs just to see if they work. Mock data simulates the data that Sentinel imports provide, letting you test every scenario locally. This guide covers how to create mock data for all four Terraform imports and how to structure it for comprehensive test coverage.

## How Mock Data Works

When you run `sentinel test`, the CLI uses mock data files to simulate the data that would normally come from a real Terraform run. Each mock file replaces one import, providing the same data structure that import would provide.

The relationship looks like this:

1. Your policy imports `tfplan/v2`
2. In a real run, HCP Terraform provides the plan data
3. In a test, your mock file provides fake plan data
4. The policy runs the same way in both cases

## Mock Data for tfplan/v2

The `tfplan/v2` mock is the one you will create most often. Here is the complete structure:

```python
# mock-tfplan-v2.sentinel
# Complete mock for the tfplan/v2 import

# Resource changes - the most important part
resource_changes = {
    "aws_instance.web": {
        "address":        "aws_instance.web",
        "module_address": "",
        "type":           "aws_instance",
        "name":           "web",
        "provider_name":  "registry.terraform.io/hashicorp/aws",
        "change": {
            "actions": ["create"],
            "before":  null,
            "after": {
                "ami":                         "ami-0c55b159cbfafe1f0",
                "instance_type":               "t3.small",
                "availability_zone":           "us-east-1a",
                "associate_public_ip_address": false,
                "monitoring":                  true,
                "root_block_device": [
                    {
                        "encrypted":   true,
                        "volume_size": 20,
                        "volume_type": "gp3",
                    },
                ],
                "tags": {
                    "Name":        "web-server",
                    "Environment": "production",
                    "Team":        "platform",
                },
                "tags_all": {
                    "Name":        "web-server",
                    "Environment": "production",
                    "Team":        "platform",
                    "ManagedBy":   "terraform",
                },
            },
            "after_unknown": {
                "id":         true,
                "arn":        true,
                "private_ip": true,
                "public_ip":  true,
            },
        },
    },
}

# Output changes
output_changes = {
    "instance_id": {
        "name":      "instance_id",
        "sensitive": false,
        "change": {
            "actions": ["create"],
            "before":  null,
            "after":   null,
            "after_unknown": true,
        },
    },
}

# Terraform version
terraform_version = "1.7.0"
```

### Creating Mock Data for Different Scenarios

You need separate mock files for different test scenarios:

```python
# mock-tfplan-untagged.sentinel
# Instance without required tags

resource_changes = {
    "aws_instance.web": {
        "address": "aws_instance.web",
        "type":    "aws_instance",
        "name":    "web",
        "provider_name": "registry.terraform.io/hashicorp/aws",
        "change": {
            "actions": ["create"],
            "before":  null,
            "after": {
                "instance_type": "t3.small",
                "tags":          null,
            },
            "after_unknown": {},
        },
    },
}
```

```python
# mock-tfplan-update.sentinel
# Instance being updated (not created)

resource_changes = {
    "aws_instance.web": {
        "address": "aws_instance.web",
        "type":    "aws_instance",
        "name":    "web",
        "provider_name": "registry.terraform.io/hashicorp/aws",
        "change": {
            "actions": ["update"],
            "before": {
                "instance_type": "t3.micro",
                "tags": {
                    "Name": "web-server",
                    "Environment": "production",
                },
            },
            "after": {
                "instance_type": "t3.small",
                "tags": {
                    "Name": "web-server",
                    "Environment": "production",
                    "Team": "platform",
                },
            },
            "after_unknown": {},
        },
    },
}
```

```python
# mock-tfplan-delete.sentinel
# Instance being deleted

resource_changes = {
    "aws_instance.old": {
        "address": "aws_instance.old",
        "type":    "aws_instance",
        "name":    "old",
        "provider_name": "registry.terraform.io/hashicorp/aws",
        "change": {
            "actions": ["delete"],
            "before": {
                "instance_type": "t3.micro",
                "tags": {
                    "Name": "old-server",
                },
            },
            "after":         null,
            "after_unknown": {},
        },
    },
}
```

## Mock Data for tfconfig/v2

When your policy checks Terraform configuration, you need tfconfig mocks:

```python
# mock-tfconfig-v2.sentinel
# Mock for the tfconfig/v2 import

# Resources defined in configuration
resources = {
    "aws_instance.web": {
        "address":             "aws_instance.web",
        "module_address":      "",
        "type":                "aws_instance",
        "name":                "web",
        "provider_config_key": "aws",
        "config": {
            "ami": {
                "references": ["var.ami_id"],
            },
            "instance_type": {
                "constant_value": "t3.small",
            },
            "tags": {
                "references": ["var.tags"],
            },
        },
        "count":      {},
        "for_each":   {},
        "depends_on": [],
    },
}

# Module calls
module_calls = {
    "vpc": {
        "source":             "terraform-aws-modules/vpc/aws",
        "version_constraint": "~> 5.0",
        "module_address":     "",
        "name":               "vpc",
        "config": {
            "cidr": {
                "constant_value": "10.0.0.0/16",
            },
        },
    },
}

# Variables
variables = {
    "ami_id": {
        "name":           "ami_id",
        "description":    "The AMI ID for the instance",
        "default":        null,
        "sensitive":      false,
        "module_address": "",
    },
    "tags": {
        "name":           "tags",
        "description":    "Tags to apply to resources",
        "default":        null,
        "sensitive":      false,
        "module_address": "",
    },
}

# Outputs
outputs = {
    "instance_id": {
        "name":           "instance_id",
        "description":    "The ID of the created instance",
        "sensitive":      false,
        "module_address": "",
        "depends_on":     [],
    },
}

# Providers
providers = {
    "aws": {
        "provider_config_key": "aws",
        "module_address":      "",
        "config": {
            "region": {
                "constant_value": "us-east-1",
            },
        },
    },
}

# Data sources
datasources = {}
```

## Mock Data for tfstate/v2

State mocks represent existing infrastructure:

```python
# mock-tfstate-v2.sentinel
# Mock for the tfstate/v2 import

resources = {
    "aws_instance.existing": {
        "address":        "aws_instance.existing",
        "module_address": "",
        "type":           "aws_instance",
        "name":           "existing",
        "provider_name":  "registry.terraform.io/hashicorp/aws",
        "values": {
            "id":                "i-1234567890abcdef0",
            "ami":               "ami-0c55b159cbfafe1f0",
            "instance_type":     "t3.micro",
            "availability_zone": "us-east-1a",
            "public_ip":         null,
            "private_ip":        "10.0.1.50",
            "monitoring":        true,
            "tags": {
                "Name":        "existing-server",
                "Environment": "production",
            },
        },
        "depends_on":  [],
        "tainted":     false,
        "deposed_key": "",
    },
    "aws_instance.another": {
        "address":        "aws_instance.another",
        "module_address": "",
        "type":           "aws_instance",
        "name":           "another",
        "provider_name":  "registry.terraform.io/hashicorp/aws",
        "values": {
            "id":            "i-0987654321fedcba0",
            "instance_type": "t3.small",
            "tags": {
                "Name":        "another-server",
                "Environment": "staging",
            },
        },
        "depends_on":  [],
        "tainted":     false,
        "deposed_key": "",
    },
}

outputs = {
    "vpc_id": {
        "name":      "vpc_id",
        "sensitive": false,
        "value":     "vpc-12345678",
    },
}
```

## Mock Data for tfrun

The tfrun mock provides workspace and run metadata:

```python
# mock-tfrun-prod.sentinel
# Mock for the tfrun import - production workspace

workspace = {
    "name":              "myapp-prod",
    "description":       "Production workspace for myapp",
    "auto_apply":        false,
    "working_directory": "",
    "vcs_repo": {
        "identifier": "myorg/myapp-infra",
    },
}

organization = {
    "name": "my-organization",
}

source     = "tfe-vcs"
is_destroy = false

cost_estimation = {
    "prior_monthly_cost":    "2500.00",
    "proposed_monthly_cost": "2800.00",
    "delta_monthly_cost":    "300.00",
}
```

```python
# mock-tfrun-dev.sentinel
# Mock for the tfrun import - development workspace

workspace = {
    "name":              "myapp-dev",
    "description":       "Development workspace",
    "auto_apply":        true,
    "working_directory": "",
}

organization = {
    "name": "my-organization",
}

source     = "tfe-ui"
is_destroy = false

cost_estimation = {
    "prior_monthly_cost":    "200.00",
    "proposed_monthly_cost": "350.00",
    "delta_monthly_cost":    "150.00",
}
```

## Connecting Mock Data to Tests

Test files reference mock data using the `mock` block:

```hcl
# test/my-policy/pass-prod.hcl

# Mock the tfplan import
mock "tfplan/v2" {
    module {
        source = "../../testdata/mock-tfplan-tagged.sentinel"
    }
}

# Mock the tfrun import
mock "tfrun" {
    module {
        source = "../../testdata/mock-tfrun-prod.sentinel"
    }
}

# Mock the tfstate import
mock "tfstate/v2" {
    module {
        source = "../../testdata/mock-tfstate-existing.sentinel"
    }
}

test {
    rules = {
        main = true
    }
}
```

## Generating Mock Data from Real Plans

Writing mock data by hand is tedious. You can generate it from real Terraform plans:

```bash
# Generate a plan JSON
terraform plan -out=plan.bin
terraform show -json plan.bin > plan.json

# The plan JSON contains the same data structures
# that Sentinel imports use
```

You can then extract the relevant sections from the JSON and format them as Sentinel mock data. Some teams maintain scripts for this conversion.

## Best Practices for Mock Data

1. **Keep mocks minimal** - Only include the attributes your policy actually checks. Extra data adds noise.
2. **Use descriptive file names** - `mock-tfplan-unencrypted-rds.sentinel` is better than `mock-2.sentinel`.
3. **Share common mocks** - Put reusable mock data in a `testdata/` directory.
4. **Test boundary conditions** - Create mocks for null values, empty collections, and unusual attribute combinations.
5. **Version your mocks** - As your policies evolve, update your mocks to match.
6. **Document non-obvious mock structures** - If a mock represents a specific edge case, add a comment explaining why.

For more on Sentinel testing, check our posts on [testing policies locally](https://oneuptime.com/blog/post/2026-02-23-how-to-test-sentinel-policies-locally/view) and [using the Sentinel CLI](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-sentinel-cli-for-policy-development/view).
