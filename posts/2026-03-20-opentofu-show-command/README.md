# How to Use tofu show to Display State or Plan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, CLI

Description: Learn how to use tofu show to display the current state or a saved plan file in human-readable or JSON format.

## Introduction

`tofu show` displays a human-readable representation of the current state or a saved plan file. It is useful for inspecting what resources OpenTofu is tracking, reviewing saved plan files before applying, and generating machine-readable JSON output for tooling and automation.

## Show Current State

```bash
tofu show

# Output:

# # aws_s3_bucket.data:
# resource "aws_s3_bucket" "data" {
#     bucket        = "acme-data-production"
#     force_destroy = false
#     id            = "acme-data-production"
#     region        = "us-east-1"
#     ...
# }
```

## Show a Saved Plan File

```bash
# First, save a plan
tofu plan -out=tfplan

# Then inspect the plan
tofu show tfplan

# Output shows what will change
# # aws_s3_bucket.new will be created
# + resource "aws_s3_bucket" "new" {
#     + bucket = "acme-new-bucket"
# }
```

## JSON Output for Automation

```bash
# Current state as JSON
tofu show -json

# Plan file as JSON
tofu show -json tfplan
```

Parse with jq:

```bash
# List all resource types in state
tofu show -json | jq '.values.root_module.resources[].type'

# Get a specific resource attribute
tofu show -json | jq '.values.root_module.resources[] | select(.name == "data") | .values.bucket'
```

## Show Specific Resource Details

```bash
# Use tofu state show for a specific resource
tofu state show aws_s3_bucket.data

# Output:
# resource "aws_s3_bucket" "data" {
#     bucket = "acme-data-production"
#     id     = "acme-data-production"
#     ...
# }
```

## Show Plan JSON Structure

```bash
tofu show -json tfplan | jq '.'

# Key fields in plan JSON:
# .format_version
# .resource_changes[].address
# .resource_changes[].change.actions   (["create"], ["update"], ["delete"])
# .resource_changes[].change.before
# .resource_changes[].change.after
```

## Summarize Plan Changes

```bash
# Count changes by action type
tofu show -json tfplan | jq '
  .resource_changes |
  group_by(.change.actions[0]) |
  map({action: .[0].change.actions[0], count: length})
'
```

## Review Plan in CI/CD

```bash
# Save plan, then show it for review before apply
tofu plan -out=tfplan

# Human-readable review in PR comment
tofu show tfplan

# JSON for programmatic processing
tofu show -json tfplan | jq '.resource_changes[] | {address, action: .change.actions}'
```

## Compare Plan Before and After

```bash
# Show exactly what attributes will change
tofu show -json tfplan | jq '
  .resource_changes[] |
  select(.change.actions != ["no-op"]) |
  {
    address,
    actions: .change.actions,
    before: .change.before,
    after: .change.after
  }
'
```

## Show State Without Plan File

```bash
# Show full state file contents
tofu show

# Show raw JSON state
tofu show -json

# Show state from a specific file
tofu show backup.tfstate
```

## Conclusion

`tofu show` is essential for inspecting state and reviewing plans. Use `tofu show <planfile>` before applying to confirm what will change. Use `tofu show -json` for machine-readable output in tooling, PR automation, and audit logging. Combine `tofu plan -out=tfplan` with `tofu show tfplan` and `tofu show -json tfplan` to build a complete plan review and application workflow.
