# How to Write Custom TFLint Rules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, TFLint, Linting, Go, Custom Rules, Infrastructure as Code

Description: Learn how to write custom TFLint rules in Go to enforce organization-specific Terraform conventions, naming standards, and infrastructure policies.

---

TFLint's built-in rules and cloud provider plugins cover a lot of ground, but every organization has its own conventions. Maybe you require a specific naming pattern for resources, enforce minimum encryption key lengths, or ban certain resource types entirely. Custom TFLint rules let you codify these policies and enforce them automatically. This guide walks through building a custom TFLint ruleset from scratch.

## When Custom Rules Make Sense

Write custom rules when:

- Your organization has naming conventions that differ from the defaults
- You need to ban specific resource configurations (e.g., no public IPs on databases)
- You want to enforce cost controls (e.g., maximum instance size)
- You have compliance requirements specific to your industry
- The built-in rules do not cover your provider or resource type

## Project Setup

TFLint plugins are written in Go. Set up a new plugin project:

```bash
# Create the project directory
mkdir tflint-ruleset-myorg
cd tflint-ruleset-myorg

# Initialize the Go module
go mod init github.com/myorg/tflint-ruleset-myorg

# Add the TFLint SDK dependency
go get github.com/terraform-linters/tflint-plugin-sdk
```

The project structure looks like this:

```
tflint-ruleset-myorg/
  main.go
  rules/
    naming_convention.go
    naming_convention_test.go
    banned_resources.go
    banned_resources_test.go
  go.mod
  go.sum
```

## Plugin Entry Point

Create the main plugin entry point:

```go
// main.go
package main

import (
    "github.com/terraform-linters/tflint-plugin-sdk/plugin"
    "github.com/terraform-linters/tflint-plugin-sdk/tflint"
    "github.com/myorg/tflint-ruleset-myorg/rules"
)

func main() {
    plugin.Serve(&plugin.ServeOpts{
        RuleSet: &tflint.BuiltinRuleSet{
            Name:    "myorg",
            Version: "0.1.0",
            Rules: []tflint.Rule{
                rules.NewResourceNamingConventionRule(),
                rules.NewBannedResourcesRule(),
                rules.NewRequiredTagsRule(),
                rules.NewMaxInstanceSizeRule(),
            },
        },
    })
}
```

## Writing a Naming Convention Rule

This rule enforces that all resources use a specific naming prefix:

```go
// rules/naming_convention.go
package rules

import (
    "fmt"
    "strings"

    "github.com/terraform-linters/tflint-plugin-sdk/hclext"
    "github.com/terraform-linters/tflint-plugin-sdk/tflint"
)

// ResourceNamingConventionRule checks that resource names follow
// the organization's naming convention
type ResourceNamingConventionRule struct {
    tflint.DefaultRule
}

func NewResourceNamingConventionRule() *ResourceNamingConventionRule {
    return &ResourceNamingConventionRule{}
}

// Name returns the rule name
func (r *ResourceNamingConventionRule) Name() string {
    return "myorg_resource_naming_convention"
}

// Enabled returns whether the rule is enabled by default
func (r *ResourceNamingConventionRule) Enabled() bool {
    return true
}

// Severity returns the rule severity
func (r *ResourceNamingConventionRule) Severity() tflint.Severity {
    return tflint.WARNING
}

// Link returns a URL to the rule documentation
func (r *ResourceNamingConventionRule) Link() string {
    return "https://wiki.myorg.com/terraform/naming-conventions"
}

// Check runs the rule against the Terraform configuration
func (r *ResourceNamingConventionRule) Check(runner tflint.Runner) error {
    // Define resource types that require a "name" attribute
    resourceTypes := []string{
        "aws_instance",
        "aws_s3_bucket",
        "aws_security_group",
        "aws_vpc",
        "aws_subnet",
    }

    for _, resourceType := range resourceTypes {
        // Get all resources of this type
        resources, err := runner.GetResourceContent(resourceType,
            &hclext.BodySchema{
                Attributes: []hclext.AttributeSchema{
                    {Name: "tags"},
                },
            }, nil)
        if err != nil {
            return err
        }

        for _, resource := range resources.Blocks {
            // Check that the resource label follows naming convention
            label := resource.Labels[0]
            if !isValidResourceName(label) {
                runner.EmitIssue(
                    r,
                    fmt.Sprintf("Resource name '%s' does not follow naming convention. "+
                        "Use snake_case with lowercase letters and underscores only.", label),
                    resource.DefRange,
                )
            }
        }
    }

    return nil
}

// isValidResourceName checks if a name follows snake_case convention
func isValidResourceName(name string) bool {
    for _, char := range name {
        if char >= 'a' && char <= 'z' {
            continue
        }
        if char >= '0' && char <= '9' {
            continue
        }
        if char == '_' {
            continue
        }
        return false
    }
    return !strings.HasPrefix(name, "_") && !strings.HasSuffix(name, "_")
}
```

## Writing a Banned Resources Rule

This rule prevents the use of specific resource types:

```go
// rules/banned_resources.go
package rules

import (
    "fmt"

    "github.com/terraform-linters/tflint-plugin-sdk/hclext"
    "github.com/terraform-linters/tflint-plugin-sdk/tflint"
)

// BannedResourcesRule prevents the use of certain resource types
type BannedResourcesRule struct {
    tflint.DefaultRule
}

func NewBannedResourcesRule() *BannedResourcesRule {
    return &BannedResourcesRule{}
}

func (r *BannedResourcesRule) Name() string {
    return "myorg_banned_resources"
}

func (r *BannedResourcesRule) Enabled() bool {
    return true
}

func (r *BannedResourcesRule) Severity() tflint.Severity {
    return tflint.ERROR
}

func (r *BannedResourcesRule) Link() string {
    return "https://wiki.myorg.com/terraform/banned-resources"
}

func (r *BannedResourcesRule) Check(runner tflint.Runner) error {
    // Resources that should not be used
    bannedResources := map[string]string{
        "aws_iam_user":               "Use SSO/SAML instead of IAM users",
        "aws_iam_access_key":         "Use IAM roles and temporary credentials",
        "aws_security_group_rule":    "Use inline rules in aws_security_group",
        "aws_db_instance":            "Use aws_rds_cluster for Aurora databases",
    }

    for resourceType, reason := range bannedResources {
        resources, err := runner.GetResourceContent(resourceType,
            &hclext.BodySchema{}, nil)
        if err != nil {
            // Resource type might not exist - that is fine
            continue
        }

        for _, resource := range resources.Blocks {
            runner.EmitIssue(
                r,
                fmt.Sprintf("Resource type '%s' is banned: %s",
                    resourceType, reason),
                resource.DefRange,
            )
        }
    }

    return nil
}
```

## Writing a Maximum Instance Size Rule

Enforce cost controls by limiting instance sizes:

```go
// rules/max_instance_size.go
package rules

import (
    "fmt"
    "strings"

    "github.com/terraform-linters/tflint-plugin-sdk/hclext"
    "github.com/terraform-linters/tflint-plugin-sdk/tflint"
)

type MaxInstanceSizeRule struct {
    tflint.DefaultRule
}

func NewMaxInstanceSizeRule() *MaxInstanceSizeRule {
    return &MaxInstanceSizeRule{}
}

func (r *MaxInstanceSizeRule) Name() string {
    return "myorg_max_instance_size"
}

func (r *MaxInstanceSizeRule) Enabled() bool {
    return true
}

func (r *MaxInstanceSizeRule) Severity() tflint.Severity {
    return tflint.WARNING
}

func (r *MaxInstanceSizeRule) Link() string {
    return "https://wiki.myorg.com/terraform/cost-controls"
}

func (r *MaxInstanceSizeRule) Check(runner tflint.Runner) error {
    // Allowed instance type prefixes
    allowedPrefixes := []string{
        "t3.micro", "t3.small", "t3.medium", "t3.large",
        "t3a.micro", "t3a.small", "t3a.medium", "t3a.large",
        "m5.large", "m5.xlarge",
    }

    resources, err := runner.GetResourceContent("aws_instance",
        &hclext.BodySchema{
            Attributes: []hclext.AttributeSchema{
                {Name: "instance_type"},
            },
        }, nil)
    if err != nil {
        return err
    }

    for _, resource := range resources.Blocks {
        attr, exists := resource.Body.Attributes["instance_type"]
        if !exists {
            continue
        }

        var instanceType string
        diags := runner.EvaluateExpr(attr.Expr, &instanceType, nil)
        if diags.HasErrors() {
            // Cannot evaluate - might be a variable reference
            continue
        }

        allowed := false
        for _, prefix := range allowedPrefixes {
            if instanceType == prefix {
                allowed = true
                break
            }
        }

        if !allowed {
            runner.EmitIssue(
                r,
                fmt.Sprintf("Instance type '%s' exceeds the maximum allowed size. "+
                    "Allowed types: %s. Request an exception if needed.",
                    instanceType, strings.Join(allowedPrefixes, ", ")),
                attr.Expr.Range(),
            )
        }
    }

    return nil
}
```

## Testing Your Rules

Write tests for each rule:

```go
// rules/naming_convention_test.go
package rules

import (
    "testing"

    hcl "github.com/hashicorp/hcl/v2"
    "github.com/terraform-linters/tflint-plugin-sdk/helper"
)

func TestResourceNamingConvention(t *testing.T) {
    tests := []struct {
        Name     string
        Content  string
        Expected helper.Issues
    }{
        {
            Name: "valid snake_case name",
            Content: `
resource "aws_instance" "web_server" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
}`,
            Expected: helper.Issues{},
        },
        {
            Name: "invalid name with uppercase",
            Content: `
resource "aws_instance" "WebServer" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
}`,
            Expected: helper.Issues{
                {
                    Rule:    NewResourceNamingConventionRule(),
                    Message: "Resource name 'WebServer' does not follow naming convention. Use snake_case with lowercase letters and underscores only.",
                },
            },
        },
        {
            Name: "invalid name with hyphens",
            Content: `
resource "aws_instance" "web-server" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"
}`,
            Expected: helper.Issues{
                {
                    Rule:    NewResourceNamingConventionRule(),
                    Message: "Resource name 'web-server' does not follow naming convention. Use snake_case with lowercase letters and underscores only.",
                },
            },
        },
    }

    rule := NewResourceNamingConventionRule()

    for _, tc := range tests {
        t.Run(tc.Name, func(t *testing.T) {
            runner := helper.TestRunner(t, map[string]string{
                "main.tf": tc.Content,
            })

            if err := rule.Check(runner); err != nil {
                t.Fatalf("Unexpected error: %s", err)
            }

            helper.AssertIssues(t, tc.Expected, runner.Issues)
        })
    }
}
```

Run the tests:

```bash
go test ./rules/... -v
```

## Building the Plugin

Build the plugin binary:

```bash
# Build for your current platform
go build -o tflint-ruleset-myorg

# Build for Linux (for CI)
GOOS=linux GOARCH=amd64 go build -o tflint-ruleset-myorg
```

## Installing the Plugin Locally

Copy the binary to the TFLint plugins directory:

```bash
# Create the plugins directory
mkdir -p ~/.tflint.d/plugins

# Copy the built binary
cp tflint-ruleset-myorg ~/.tflint.d/plugins/
```

Configure TFLint to use it:

```hcl
# .tflint.hcl
plugin "myorg" {
  enabled = true
  source  = "github.com/myorg/tflint-ruleset-myorg"
  version = "0.1.0"
}
```

For local development, use a local path:

```hcl
# .tflint.hcl (development)
plugin "myorg" {
  enabled = true
}
```

And place the binary in `~/.tflint.d/plugins/tflint-ruleset-myorg`.

## Distributing Your Plugin

Publish your plugin to GitHub releases so others can install it with `tflint --init`:

```bash
# Tag a release
git tag v0.1.0
git push origin v0.1.0

# Build for multiple platforms
GOOS=linux GOARCH=amd64 go build -o dist/tflint-ruleset-myorg_linux_amd64
GOOS=darwin GOARCH=amd64 go build -o dist/tflint-ruleset-myorg_darwin_amd64
GOOS=darwin GOARCH=arm64 go build -o dist/tflint-ruleset-myorg_darwin_arm64
GOOS=windows GOARCH=amd64 go build -o dist/tflint-ruleset-myorg_windows_amd64.exe

# Create a GitHub release and upload the binaries
# Users can then install with: tflint --init
```

## CI Integration

Use your custom rules in CI:

```yaml
# .github/workflows/tflint-custom.yml
name: TFLint with Custom Rules

on:
  pull_request:
    paths:
      - '**/*.tf'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: terraform-linters/setup-tflint@v4

      - name: Init TFLint
        run: tflint --init

      - name: Run TFLint
        run: tflint --recursive --format compact
```

## Summary

Custom TFLint rules let you enforce your organization's specific Terraform conventions automatically. Write rules in Go using the TFLint plugin SDK, test them with the helper package, build the binary, and distribute it via GitHub releases. Whether you need naming conventions, banned resources, cost controls, or compliance checks, custom rules turn tribal knowledge into automated enforcement.

For configuring the built-in cloud provider rules, see [How to Configure TFLint Rules for AWS](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-tflint-rules-for-aws/view) and [How to Configure TFLint Rules for Azure](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-tflint-rules-for-azure/view).
