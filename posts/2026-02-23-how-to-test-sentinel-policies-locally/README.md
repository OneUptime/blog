# How to Test Sentinel Policies Locally

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Testing, CLI, Development Workflow

Description: Learn how to test Sentinel policies locally using the Sentinel CLI with mock data, test cases, and debugging techniques before deploying to HCP Terraform.

---

Writing Sentinel policies without testing them locally is like writing application code without running it. You end up deploying something, watching it fail in production, tweaking it, redeploying, and repeating until it works. The Sentinel CLI lets you test policies on your local machine with mock data, giving you fast feedback loops and much more confidence in your policies.

## Installing the Sentinel CLI

The Sentinel CLI is a standalone binary that you can download from the HashiCorp releases page:

```bash
# Download for Linux
wget https://releases.hashicorp.com/sentinel/0.24.0/sentinel_0.24.0_linux_amd64.zip
unzip sentinel_0.24.0_linux_amd64.zip
sudo mv sentinel /usr/local/bin/

# Download for macOS
wget https://releases.hashicorp.com/sentinel/0.24.0/sentinel_0.24.0_darwin_amd64.zip
unzip sentinel_0.24.0_darwin_amd64.zip
sudo mv sentinel /usr/local/bin/

# Verify installation
sentinel version
```

## Project Structure for Testing

Sentinel expects a specific directory structure for tests. Here is the standard layout:

```text
my-policies/
  enforce-tags.sentinel
  restrict-instance-types.sentinel
  test/
    enforce-tags/
      pass.hcl
      fail-missing-tags.hcl
      pass-no-resources.hcl
    restrict-instance-types/
      pass.hcl
      fail-blocked-type.hcl
  testdata/
    mock-tfplan-pass.sentinel
    mock-tfplan-fail.sentinel
```

The key points:

- Each policy gets a subdirectory under `test/` with the same name as the policy (minus the `.sentinel` extension)
- Each test case is an `.hcl` file inside that subdirectory
- Mock data files go either in `testdata/` or alongside the test files

## Writing Your First Test

Let us start with a simple policy and write tests for it:

```python
# enforce-tags.sentinel
import "tfplan/v2" as tfplan

required_tags = ["Environment", "Team"]

resources = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

main = rule {
    all resources as _, rc {
        rc.change.after.tags is not null and
        all required_tags as tag {
            tag in rc.change.after.tags
        }
    }
}
```

### Passing Test Case

```hcl
# test/enforce-tags/pass.hcl
# Test with properly tagged instance - should pass

mock "tfplan/v2" {
    module {
        source = "../../testdata/mock-tfplan-tagged.sentinel"
    }
}

test {
    rules = {
        main = true
    }
}
```

### Failing Test Case

```hcl
# test/enforce-tags/fail-missing-tags.hcl
# Test with missing tags - should fail

mock "tfplan/v2" {
    module {
        source = "../../testdata/mock-tfplan-untagged.sentinel"
    }
}

test {
    rules = {
        main = false
    }
}
```

## Creating Mock Data

Mock data simulates what the Sentinel imports would provide during a real Terraform run. You need to create mock files that match the structure of the import you are using.

### Mock tfplan Data

```python
# testdata/mock-tfplan-tagged.sentinel
# Mock data for a properly tagged EC2 instance

resource_changes = {
    "aws_instance.web": {
        "address": "aws_instance.web",
        "type": "aws_instance",
        "name": "web",
        "provider_name": "registry.terraform.io/hashicorp/aws",
        "change": {
            "actions": ["create"],
            "before": null,
            "after": {
                "ami": "ami-12345678",
                "instance_type": "t3.small",
                "tags": {
                    "Environment": "production",
                    "Team": "platform",
                    "Name": "web-server",
                },
            },
            "after_unknown": {},
        },
    },
}
```

```python
# testdata/mock-tfplan-untagged.sentinel
# Mock data for an untagged EC2 instance

resource_changes = {
    "aws_instance.web": {
        "address": "aws_instance.web",
        "type": "aws_instance",
        "name": "web",
        "provider_name": "registry.terraform.io/hashicorp/aws",
        "change": {
            "actions": ["create"],
            "before": null,
            "after": {
                "ami": "ami-12345678",
                "instance_type": "t3.small",
                "tags": null,
            },
            "after_unknown": {},
        },
    },
}
```

## Running Tests

Run your tests with the `sentinel test` command:

```bash
# Run all tests for all policies
sentinel test

# Run tests for a specific policy
sentinel test enforce-tags.sentinel

# Run with verbose output to see details
sentinel test -verbose

# Run a specific test case
sentinel test -run pass enforce-tags.sentinel
```

### Understanding Test Output

```bash
$ sentinel test -verbose
PASS - enforce-tags.sentinel
  PASS - test/enforce-tags/pass.hcl
  PASS - test/enforce-tags/fail-missing-tags.hcl
  PASS - test/enforce-tags/pass-no-resources.hcl
```

A passing test means the policy result matched your expected result. If you expect a test to fail (the policy should return false), and it does return false, the test passes.

## Testing Edge Cases

Good tests cover edge cases. Here are some common scenarios to test:

### Empty Resource Collection

```hcl
# test/enforce-tags/pass-no-instances.hcl
# When there are no instances, the policy should pass

mock "tfplan/v2" {
    module {
        source = "../../testdata/mock-tfplan-no-instances.sentinel"
    }
}

test {
    rules = {
        main = true
    }
}
```

```python
# testdata/mock-tfplan-no-instances.sentinel
# No instances in the plan

resource_changes = {
    "aws_s3_bucket.logs": {
        "address": "aws_s3_bucket.logs",
        "type": "aws_s3_bucket",
        "name": "logs",
        "provider_name": "registry.terraform.io/hashicorp/aws",
        "change": {
            "actions": ["create"],
            "before": null,
            "after": {
                "bucket": "my-logs-bucket",
                "tags": {
                    "Environment": "production",
                },
            },
            "after_unknown": {},
        },
    },
}
```

### Delete Operations

```python
# testdata/mock-tfplan-delete.sentinel
# Instance being deleted - should not be checked for tags

resource_changes = {
    "aws_instance.old": {
        "address": "aws_instance.old",
        "type": "aws_instance",
        "name": "old",
        "provider_name": "registry.terraform.io/hashicorp/aws",
        "change": {
            "actions": ["delete"],
            "before": {
                "ami": "ami-12345678",
                "instance_type": "t3.small",
                "tags": null,
            },
            "after": null,
            "after_unknown": {},
        },
    },
}
```

### Multiple Resources

```python
# testdata/mock-tfplan-multiple.sentinel
# Multiple instances - one tagged, one not

resource_changes = {
    "aws_instance.good": {
        "address": "aws_instance.good",
        "type": "aws_instance",
        "name": "good",
        "provider_name": "registry.terraform.io/hashicorp/aws",
        "change": {
            "actions": ["create"],
            "before": null,
            "after": {
                "instance_type": "t3.small",
                "tags": {
                    "Environment": "production",
                    "Team": "platform",
                },
            },
            "after_unknown": {},
        },
    },
    "aws_instance.bad": {
        "address": "aws_instance.bad",
        "type": "aws_instance",
        "name": "bad",
        "provider_name": "registry.terraform.io/hashicorp/aws",
        "change": {
            "actions": ["create"],
            "before": null,
            "after": {
                "instance_type": "t3.small",
                "tags": {
                    "Name": "bad-instance",
                },
            },
            "after_unknown": {},
        },
    },
}
```

## Mocking Multiple Imports

When your policy uses multiple imports, you need to mock each one:

```hcl
# test/environment-policy/pass-prod.hcl

mock "tfplan/v2" {
    module {
        source = "../../testdata/mock-tfplan-prod.sentinel"
    }
}

mock "tfrun" {
    module {
        source = "../../testdata/mock-tfrun-prod.sentinel"
    }
}

test {
    rules = {
        main = true
    }
}
```

```python
# testdata/mock-tfrun-prod.sentinel
# Mock tfrun data for production workspace

workspace = {
    "name": "myapp-prod",
    "auto_apply": false,
    "working_directory": "",
}

organization = {
    "name": "my-org",
}

source = "tfe-vcs"
is_destroy = false

cost_estimation = {
    "prior_monthly_cost": "1500.00",
    "proposed_monthly_cost": "1800.00",
    "delta_monthly_cost": "300.00",
}
```

## Debugging Failed Tests

When a test fails, use these techniques to figure out why:

### Add Print Statements

```python
# Temporarily add print statements to your policy
for resources as address, rc {
    print("Checking:", address)
    print("  Tags:", rc.change.after.tags)
    print("  Actions:", rc.change.actions)
}
```

Run with verbose flag to see the output:

```bash
sentinel test -verbose enforce-tags.sentinel
```

### Check Mock Data Structure

The most common cause of test failures is incorrect mock data structure. Make sure your mock data matches the exact structure that the import provides. Refer to the Sentinel documentation for the correct schema.

### Use the sentinel apply Command

For quick iteration, you can apply a policy directly with a mock:

```bash
# Apply a policy with specific mock data
sentinel apply -config test/enforce-tags/pass.hcl enforce-tags.sentinel
```

## Generating Mock Data from Real Plans

Instead of writing mock data by hand, you can generate it from actual Terraform plans:

```bash
# Run a Terraform plan and output it as JSON
terraform plan -out=tfplan
terraform show -json tfplan > plan.json

# Use this JSON to create mock data structures
# You will need to format it into the Sentinel mock format
```

Some teams write scripts to automatically convert Terraform plan JSON into Sentinel mock files.

## Continuous Integration

Integrate Sentinel testing into your CI pipeline:

```yaml
# .github/workflows/sentinel.yml
name: Sentinel Tests
on:
  pull_request:
    paths:
      - '**.sentinel'
      - 'test/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Sentinel
        run: |
          wget https://releases.hashicorp.com/sentinel/0.24.0/sentinel_0.24.0_linux_amd64.zip
          unzip sentinel_0.24.0_linux_amd64.zip
          sudo mv sentinel /usr/local/bin/
      - name: Run tests
        run: sentinel test -verbose
```

## Test Organization Best Practices

1. Name test files descriptively: `pass-tagged-instance.hcl`, `fail-missing-environment-tag.hcl`
2. Test both positive and negative cases for every policy
3. Include edge cases: empty collections, null values, delete operations
4. Keep mock data minimal - only include the attributes your policy actually checks
5. Share common mock data files across tests when possible
6. Run tests before every commit

Testing locally is the single best thing you can do to improve the quality of your Sentinel policies. For more on the Sentinel development workflow, see our posts on [using the Sentinel CLI](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-sentinel-cli-for-policy-development/view) and [using mock data for testing](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-mock-data-for-testing/view).
