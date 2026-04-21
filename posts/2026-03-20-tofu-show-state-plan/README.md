# How to Use tofu show to Display State or Plan - Tofu State Plan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use tofu show to display human-readable and machine-readable representations of your OpenTofu state or saved plan files.

## Introduction

`tofu show` displays the contents of the current state file or a saved plan file in a human-readable format. It's essential for reviewing what's in state, inspecting plan files before applying, and extracting infrastructure details for documentation or automation.

## Showing Current State

```bash
# Show all resources in the current state (human-readable)

tofu show

# Output:
# # aws_instance.web:
# resource "aws_instance" "web" {
#     ami           = "ami-0c55b159cbfafe1f0"
#     id            = "i-0123456789abcdef0"
#     instance_type = "t3.micro"
#     tags          = {
#         "Name" = "web-server"
#     }
#     # ... more attributes
# }
```

## Showing a Saved Plan

```bash
# Generate a plan
tofu plan -out=changes.tfplan

# Review the saved plan
tofu show -plan=changes.tfplan

# Output shows the planned changes in detail:
# aws_instance.web will be created
#   + resource "aws_instance" "web" {
#       + ami           = "ami-0c55b159cbfafe1f0"
#       + instance_type = "t3.large"
```

## JSON Output for Automation

```bash
# Current state as JSON
tofu show -json

# Saved plan as JSON
tofu show -plan=changes.tfplan -json

# Pipe to jq for extraction
tofu show -json | jq 'def resources: .resources[]?, (.child_modules[]? | resources); .values.root_module | resources | {type: .type, name: .name, id: .values.id}'

# Extract all resource IDs
tofu show -json | jq 'def resources: .resources[]?, (.child_modules[]? | resources); .values.root_module | resources | "\(.address): \(.values.id)"'
```

## Practical Examples

```bash
# Get a specific resource's attributes
tofu show -json | jq 'def resources: .resources[]?, (.child_modules[]? | resources); .values.root_module | resources | select(.type == "aws_instance") | .values'

# Get all resource addresses
tofu show -json | jq 'def resources: .resources[]?, (.child_modules[]? | resources); .values.root_module | resources | .address'

# Count resources by type
tofu show -json | jq 'def resources: .resources[]?, (.child_modules[]? | resources); [.values.root_module | resources | .type] | group_by(.) | map({type: .[0], count: length})'

# Find all resources with a specific tag
tofu show -json | jq 'def resources: .resources[]?, (.child_modules[]? | resources); .values.root_module | resources | select(.values.tags.Environment == "production")'
```

## Comparing State vs Plan

```bash
# Show what currently exists
tofu show > current-state.txt

# Plan changes
tofu plan -out=changes.tfplan

# Show what will change
tofu show -plan=changes.tfplan > planned-changes.txt

# Compare
diff current-state.txt planned-changes.txt
```

## Showing Module Resources

```bash
# Show includes resources from child modules
tofu show -json | jq 'def resources: .resources[]?, (.child_modules[]? | resources); .values.root_module | resources | select(.address | startswith("module."))'

# Get root module outputs
tofu show -json | jq '.values.outputs'
```

## Using show for Auditing

```bash
# Generate a full infrastructure inventory
tofu show -json | jq 'def resources: .resources[]?, (.child_modules[]? | resources);
[
  .values.root_module | resources |
  {
    address: .address,
    type: .type,
    id: .values.id,
    region: .values.region? // "unknown"
  }
]' > infrastructure-inventory.json
```

## Conclusion

`tofu show` is a versatile command for inspecting both current state and planned changes. Use the human-readable format for quick reviews and the JSON format (`-json`) for automation and tooling. Always review saved plan files with `tofu show -plan=...` before applying them in production to confirm the changes match your expectations.
