# How to Use the terraform modules Command to List Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, CLI, Commands, Infrastructure as Code

Description: Learn how to use Terraform commands to list, inspect, and understand the modules in your configuration for better visibility and management of module dependencies.

---

As your Terraform configurations grow, keeping track of which modules are in use, what versions they are on, and where they come from becomes increasingly important. Terraform provides several ways to inspect and list the modules in your configuration. This post covers all the approaches for getting visibility into your module dependency tree.

## Listing Installed Modules

The most direct way to see what modules are installed is to look at the module manifest that Terraform maintains.

```bash
# After running terraform init, check the modules manifest
cat .terraform/modules/modules.json | python3 -m json.tool
```

This outputs structured information about every installed module:

```json
{
  "Modules": [
    {
      "Key": "",
      "Source": "",
      "Dir": "."
    },
    {
      "Key": "networking",
      "Source": "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v2.1.0",
      "Dir": ".terraform/modules/networking"
    },
    {
      "Key": "compute",
      "Source": "git::https://github.com/myorg/terraform-aws-ecs.git?ref=v3.0.1",
      "Dir": ".terraform/modules/compute"
    },
    {
      "Key": "networking.subnets",
      "Source": "./modules/subnets",
      "Dir": ".terraform/modules/networking/modules/subnets"
    }
  ]
}
```

The `Key` field shows the module hierarchy using dot notation. `networking.subnets` means the `subnets` module is called from within the `networking` module.

## Using terraform providers to See Module Dependencies

The `terraform providers` command shows which providers each module requires, which indirectly lists all modules.

```bash
terraform providers

# Output:
# Providers required by configuration:
# .
# -- hashicorp/aws ~> 5.0
# -- hashicorp/random >= 3.0
#
# module.networking
# -- hashicorp/aws >= 4.0
#
# module.compute
# -- hashicorp/aws >= 4.0
#
# module.database
# -- hashicorp/aws >= 4.0
# -- hashicorp/random >= 3.0
```

## Using terraform graph for Visual Dependency Maps

The `terraform graph` command generates a dependency graph in DOT format that includes all modules and their relationships.

```bash
# Generate the dependency graph
terraform graph > graph.dot

# Convert to SVG using graphviz (install with: brew install graphviz)
terraform graph | dot -Tsvg > dependency-graph.svg

# Generate a simplified graph showing only modules
terraform graph -type=plan | grep "module\." > modules-only.dot
```

You can also filter the graph to show only module-level dependencies:

```bash
# Extract just the module relationships
terraform graph | grep -E '(module\.|subgraph)' | head -50
```

## Inspecting Module Details with terraform state

When modules are deployed, you can see their resources in the state.

```bash
# List all resources grouped by module
terraform state list

# Output:
# module.networking.aws_vpc.this
# module.networking.aws_subnet.public[0]
# module.networking.aws_subnet.public[1]
# module.networking.aws_subnet.private[0]
# module.networking.aws_subnet.private[1]
# module.networking.aws_internet_gateway.this
# module.compute.aws_ecs_cluster.this
# module.compute.aws_ecs_service.this
# module.database.aws_db_instance.this
# module.database.aws_db_subnet_group.this

# Filter by module
terraform state list module.networking

# Show a specific resource within a module
terraform state show module.networking.aws_vpc.this
```

## Checking Module Versions in Use

To see which versions of your modules are currently deployed, combine several techniques:

```bash
# Check the modules.json for source references with version tags
cat .terraform/modules/modules.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for mod in data['Modules']:
    if mod['Key'] and mod['Source']:
        print(f\"{mod['Key']}: {mod['Source']}\")
"

# Output:
# networking: git::https://github.com/myorg/terraform-aws-vpc.git?ref=v2.1.0
# compute: git::https://github.com/myorg/terraform-aws-ecs.git?ref=v3.0.1
# database: git::https://github.com/myorg/terraform-aws-rds.git?ref=v1.3.0
```

For registry modules, the version is tracked in `.terraform.lock.hcl` alongside provider versions.

## Using terraform output to Inspect Module Results

Module outputs show what information flows between modules:

```bash
# List all outputs (including those from modules passed through root outputs)
terraform output

# Get a specific output
terraform output -json vpc_id

# List outputs in JSON format for scripting
terraform output -json
```

## Building a Module Inventory Script

For larger organizations, a script that inventories all modules across configurations is valuable:

```bash
#!/bin/bash
# module-inventory.sh
# Scans Terraform configurations and lists all module sources

echo "Module Inventory"
echo "================"
echo ""

# Find all Terraform files that reference modules
for tf_file in $(find . -name "*.tf" -not -path "./.terraform/*"); do
  # Extract module blocks
  modules=$(grep -A2 'module "' "$tf_file" | grep "source" | sed 's/.*source.*=.*"\(.*\)"/\1/')

  if [ -n "$modules" ]; then
    echo "File: $tf_file"
    echo "$modules" | while read -r source; do
      echo "  - $source"
    done
    echo ""
  fi
done
```

## Using terraform plan Output for Module Changes

The plan output groups changes by module, making it easy to see which modules are being modified:

```bash
# Generate a plan and check which modules have changes
terraform plan -no-color 2>&1 | grep "module\."

# For a more structured view, use JSON output
terraform plan -json | python3 -c "
import json, sys
for line in sys.stdin:
    data = json.loads(line)
    if data.get('type') == 'planned_change':
        addr = data.get('change', {}).get('resource', {}).get('addr', '')
        action = data.get('change', {}).get('action', '')
        if 'module.' in addr:
            print(f'{action}: {addr}')
"
```

## Terraform Cloud Module Registry

If you use Terraform Cloud or Enterprise, the web UI provides a visual module registry:

```bash
# List modules in your organization's private registry
# Using the Terraform Cloud API
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/myorg/registry-modules" | \
  python3 -m json.tool

# List available versions for a specific module
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  "https://app.terraform.io/api/v2/organizations/myorg/registry-modules/private/myorg/vpc/aws" | \
  python3 -m json.tool
```

## Understanding Module Nesting

Modules can call other modules, creating a nesting hierarchy. Understanding this tree is important for debugging:

```hcl
# Root module calls networking
module "networking" {
  source = "./modules/networking"
}

# modules/networking/main.tf calls subnets
module "subnets" {
  source = "./modules/subnets"
}

# The full address becomes: module.networking.module.subnets
```

```bash
# See the nesting in state
terraform state list | sort

# Output shows the hierarchy:
# module.networking.aws_vpc.this
# module.networking.module.subnets.aws_subnet.this[0]
# module.networking.module.subnets.aws_subnet.this[1]
```

## Creating a Module Dependency Report

For compliance and audit purposes, generate a report of all module dependencies:

```bash
#!/bin/bash
# generate-module-report.sh

echo "# Module Dependency Report"
echo "Generated: $(date)"
echo ""

# Check if initialized
if [ ! -f ".terraform/modules/modules.json" ]; then
  echo "Error: Run terraform init first"
  exit 1
fi

# Parse modules.json
python3 -c "
import json

with open('.terraform/modules/modules.json') as f:
    data = json.load(f)

print('| Module | Source | Local Path |')
print('|--------|--------|------------|')

for mod in data['Modules']:
    if mod['Key']:
        print(f\"| {mod['Key']} | {mod['Source']} | {mod['Dir']} |\")
"
```

## Best Practices for Module Visibility

1. **Always run terraform init before inspecting modules.** The modules.json file is only created after initialization.

2. **Use consistent naming** so modules are easy to find and sort.

3. **Document module dependencies** in your README so the relationships are clear even without running Terraform commands.

4. **Pin module versions** so the inventory is deterministic and auditable.

5. **Review module changes in pull requests** by checking both the module source and version references.

## Conclusion

While Terraform does not have a single "list all modules" command, the combination of modules.json inspection, state listing, graph generation, and plan output gives you complete visibility into your module ecosystem. Build these techniques into your workflow and CI/CD pipelines to keep track of your module dependencies as your infrastructure grows.

For related reading, see our guides on [how to use the terraform get command to download modules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-terraform-get-command-to-download-modules/view) and [how to use Terraform module best practices for large organizations](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-module-best-practices-for-large-organizations/view).
