# How to Use CloudFormation Linter (cfn-lint)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, DevOps, Infrastructure as Code

Description: Learn how to use cfn-lint to validate your CloudFormation templates before deployment, catch errors early, and enforce best practices across your team.

---

If you've ever waited ten minutes for a CloudFormation stack to fail because of a typo in a resource property, you know the pain. That feedback loop is brutal - write template, deploy, wait, fail, fix, repeat. CloudFormation Linter (cfn-lint) solves this by catching errors before you ever hit the deploy button.

cfn-lint is an open-source tool that validates CloudFormation templates against the AWS CloudFormation resource specification. It checks for syntax errors, invalid property values, deprecated features, and much more. Think of it as a spell checker for your infrastructure code.

## Installing cfn-lint

The easiest way to install cfn-lint is through pip. It works on Python 3.8 and above.

```bash
# Install cfn-lint via pip
pip install cfn-lint

# Verify the installation
cfn-lint --version
```

If you prefer using Homebrew on macOS, that works too.

```bash
# Install via Homebrew
brew install cfn-lint
```

For Docker users, there's an official image available.

```bash
# Run cfn-lint from Docker
docker run --rm -v $(pwd):/data cfn-lint /data/template.yaml
```

## Basic Usage

Running cfn-lint against a template is straightforward. Just point it at your file.

```bash
# Lint a single template
cfn-lint my-template.yaml

# Lint multiple templates
cfn-lint templates/*.yaml

# Lint with a specific format output
cfn-lint my-template.yaml -f json
```

Let's look at what cfn-lint catches. Here's a template with some common mistakes.

```yaml
# A CloudFormation template with intentional errors
AWSTemplateFormatVersion: "2010-09-09"
Description: Example with errors

Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-bucket
      # This property doesn't exist on S3 buckets
      InvalidProperty: true

  MyInstance:
    Type: AWS::EC2::Instance
    Properties:
      # Missing required property: ImageId
      InstanceType: t2.micro
      # Invalid value for InstanceType would also be caught
```

When you run cfn-lint against this template, you'll get clear error messages.

```bash
# Running cfn-lint shows the errors with line numbers
$ cfn-lint bad-template.yaml
E3002 Invalid Property Resources/MyBucket/Properties/InvalidProperty
  bad-template.yaml:11:7

E3003 Property ImageId missing at Resources/MyInstance
  bad-template.yaml:14:5
```

Each error comes with a rule ID (like E3002), a description, and the exact location in your file. The prefix tells you the severity - E for errors, W for warnings, and I for informational messages.

## Understanding Rule Categories

cfn-lint organizes its rules into categories that cover different aspects of template validation.

```
E1000-E1999: Basic template errors (format, parsing)
E2000-E2999: Parameter and mapping errors
E3000-E3999: Resource property errors
E4000-E4999: Metadata errors
W1000-W1999: Basic template warnings
W2000-W2999: Parameter warnings
W3000-W3999: Resource property warnings
```

You can list all available rules with a simple command.

```bash
# List all rules that cfn-lint checks
cfn-lint --list-rules

# Filter rules by ID prefix
cfn-lint --list-rules | grep E30
```

## Configuring cfn-lint

For projects with specific requirements, you can create a configuration file. cfn-lint looks for `.cfnlintrc` in your project root.

```yaml
# .cfnlintrc - cfn-lint configuration file
templates:
  - templates/**/*.yaml
  - templates/**/*.json

# Ignore specific rules globally
ignore_checks:
  - W2001  # Unused parameters warning

# Configure specific rules
configure_rules:
  E3012:
    strict: true

# Specify additional rule directories
append_rules:
  - custom-rules/

# Override regions to validate against
regions:
  - us-east-1
  - eu-west-1
```

You can also ignore specific rules inline within your templates using metadata.

```yaml
# Suppress a specific warning on a resource
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Metadata:
      cfn-lint:
        config:
          ignore_checks:
            - W3045  # Suppress specific warning
    Properties:
      BucketName: my-hardcoded-bucket-name
```

## Writing Custom Rules

One of cfn-lint's most powerful features is the ability to write custom rules. This lets you enforce organization-specific standards. Custom rules are Python classes that extend the CloudFormationLintRule base class.

```python
# custom-rules/require_tags.py
# Custom rule that requires specific tags on all taggable resources
from cfnlint.rules import CloudFormationLintRule, RuleMatch

class RequireTags(CloudFormationLintRule):
    id = "E9001"
    shortdesc = "Required tags missing"
    description = "All taggable resources must have Name and Environment tags"
    source_url = "https://example.com/tagging-policy"
    tags = ["custom", "tags"]

    REQUIRED_TAGS = ["Name", "Environment", "Team"]

    def match(self, cfn):
        matches = []
        resources = cfn.get_resources()

        for resource_name, resource_obj in resources.items():
            resource_type = resource_obj.get("Type", "")
            properties = resource_obj.get("Properties", {})
            tags = properties.get("Tags", [])

            # Extract tag keys from the resource
            tag_keys = [tag.get("Key", "") for tag in tags if isinstance(tag, dict)]

            for required_tag in self.REQUIRED_TAGS:
                if required_tag not in tag_keys:
                    matches.append(
                        RuleMatch(
                            ["Resources", resource_name, "Properties", "Tags"],
                            f"Resource {resource_name} missing required tag: {required_tag}"
                        )
                    )

        return matches
```

Load your custom rules by pointing cfn-lint at the directory.

```bash
# Run cfn-lint with custom rules
cfn-lint my-template.yaml -a custom-rules/
```

## IDE Integration

cfn-lint integrates with most popular editors, which gives you real-time feedback as you write templates.

For VS Code, install the "CloudFormation Linter" extension. It runs cfn-lint in the background and shows errors inline.

For Vim/Neovim users, you can integrate cfn-lint with ALE or other linting frameworks.

```vim
" .vimrc - Configure ALE to use cfn-lint for CloudFormation files
let g:ale_linters = {
\   'cloudformation': ['cfn_lint'],
\   'yaml': ['cfn_lint'],
\}
```

## CI/CD Integration

cfn-lint really shines when integrated into your CI/CD pipeline. Here's an example GitHub Actions workflow.

```yaml
# .github/workflows/lint-cfn.yaml
name: Lint CloudFormation Templates

on:
  pull_request:
    paths:
      - 'cloudformation/**'

jobs:
  cfn-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install cfn-lint
        run: pip install cfn-lint

      - name: Run cfn-lint
        run: cfn-lint cloudformation/**/*.yaml
```

For more complex setups, you can output results in SARIF format, which integrates directly with GitHub's code scanning.

```bash
# Generate SARIF output for GitHub code scanning
cfn-lint templates/*.yaml -f sarif -o results.sarif
```

## Common Gotchas

There are a few things that trip people up when using cfn-lint. First, intrinsic functions like `!Ref` and `!Sub` are evaluated during linting. cfn-lint understands these and traces values through references. But it can't resolve dynamic values from SSM Parameter Store or imported values from other stacks.

Second, if you're using CloudFormation macros or transforms (like AWS::Serverless), you'll need the corresponding transform support. cfn-lint handles SAM transforms natively, but custom macros won't be expanded.

```bash
# Lint SAM templates (transforms are handled automatically)
cfn-lint sam-template.yaml

# If you get transform errors, update your specs
cfn-lint -u
```

Third, keep cfn-lint updated. AWS adds new resources and properties regularly, and the linter needs up-to-date specs to validate them correctly.

```bash
# Update cfn-lint and its resource specifications
pip install --upgrade cfn-lint

# Update just the specs without upgrading the tool
cfn-lint -u
```

## Combining cfn-lint with Other Tools

cfn-lint works great alongside other CloudFormation tools. Pair it with cfn-nag for security-focused checks, or use it with taskcat for deployment testing. For monitoring your deployed infrastructure after the templates are applied, you might also want to look at how [OneUptime can monitor your AWS resources](https://oneuptime.com/blog/post/2026-02-12-get-started-with-aws-cdk/view) once they're live.

The key takeaway here is that cfn-lint should be the first line of defense in your CloudFormation workflow. It's fast, catches real errors, and saves you from those painful deploy-wait-fail cycles. Add it to your editor, add it to your CI pipeline, and write custom rules for your team's standards. Your future self will thank you.
