# JSON Output for State and Plans in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, JSON, State Management, Infrastructure as Code

Description: Learn how to use OpenTofu's JSON output format for state and plan files to enable programmatic analysis, automation, and integration with external tools.

## Why JSON Output for State and Plans?

OpenTofu's state and plan files contain rich information about infrastructure resources. JSON output makes this data accessible for:

- Automated compliance checks and policy validation
- Drift detection and reporting
- Custom dashboards and inventory tools
- CI/CD pipeline integrations

## Inspecting State as JSON

```bash
# Show current state as JSON

tofu show -json

# Extract a specific resource from state JSON
tofu show -json | jq '.values.root_module | recurse(.child_modules[]?) | .resources[]? | select(.address == "aws_vpc.main")'

# Save state JSON to file
tofu show -json > state.json
```

## State JSON Structure

```json
{
  "format_version": "1.0",
  "terraform_version": "1.6.0",
  "values": {
    "root_module": {
      "resources": [
        {
          "address": "aws_vpc.main",
          "type": "aws_vpc",
          "name": "main",
          "values": {
            "id": "vpc-0abc123",
            "cidr_block": "10.0.0.0/16",
            "enable_dns_support": true
          }
        }
      ]
    }
  }
}
```

## Querying State with jq

```bash
# List all resource addresses
tofu show -json | jq '[.values.root_module | recurse(.child_modules[]?) | .resources[]?.address]'

# Find resources by type
tofu show -json | jq '[.values.root_module | recurse(.child_modules[]?) | .resources[]? | select(.type == "aws_instance")]'

# Get all VPC IDs
tofu show -json | jq '[.values.root_module | recurse(.child_modules[]?) | .resources[]? | select(.type == "aws_vpc") | .values.id]'

# Get specific attribute
tofu show -json | jq '.values.root_module | recurse(.child_modules[]?) | .resources[]? | select(.address == "aws_vpc.main") | .values.cidr_block'
```

## Plan JSON Output

```bash
# Save a plan
tofu plan -out=tfplan

# Convert plan to JSON
tofu show -plan=tfplan -json > plan.json
```

## Plan JSON Structure

```json
{
  "format_version": "1.0",
  "resource_changes": [
    {
      "address": "aws_instance.web",
      "type": "aws_instance",
      "change": {
        "actions": ["create"],
        "before": null,
        "after": {
          "ami": "ami-0abcdef12345",
          "instance_type": "t3.micro"
        }
      }
    }
  ]
}
```

## Analyzing Plans Programmatically

```bash
# Count resources being added
cat plan.json | jq '[.resource_changes[] | select(.change.actions[] == "create")] | length'

# Find resources being destroyed
cat plan.json | jq '[.resource_changes[] | select(.change.actions[] == "delete") | .address]'

# Check if plan is empty (no changes)
cat plan.json | jq '
  ([.resource_changes[]? | select(.change.actions != ["no-op"])] | length == 0) and
  (((.output_changes // {}) | length) == 0)
'
```

## Policy Gate in CI/CD

```bash
#!/bin/bash
tofu plan -out=tfplan
tofu show -plan=tfplan -json > plan.json

DELETES=$(jq '[.resource_changes[] | select(.change.actions[] == "delete")] | length' plan.json)

if [ "$DELETES" -gt 0 ]; then
  echo "ERROR: Plan contains $DELETES resource deletions. Manual approval required."
  exit 1
fi

echo "Plan is safe to apply."
tofu apply tfplan
```

## Listing State Resources

```bash
# List all resources in state
tofu state list

# List as JSON via show
tofu show -json | jq '[.values.root_module | recurse(.child_modules[]?) | .resources[]?.address]'
```

## Exporting State for External Inventory

```bash
tofu show -json | jq '
  [.values.root_module | recurse(.child_modules[]?) | .resources[]? | {
    address: .address,
    type: .type,
    region: .values.tags.Region,
    environment: .values.tags.Environment
  }]
' > inventory.json
```

## Best Practices

1. **Always use `-json` with `tofu show`** rather than parsing human-readable output
2. **Save plans to files** before converting to JSON for repeatability
3. **Integrate plan analysis** as a CI/CD gate to catch destructive changes
4. **Version JSON schemas** - format_version in the output indicates the schema version
5. **Use jq for quick analysis** and Python/Go for complex tooling

## Conclusion

JSON output for state and plans turns OpenTofu's data into a queryable API. By combining `tofu show -json` with tools like jq, you can build sophisticated automation, policy gates, and inventory systems on top of your infrastructure state.
