# How OpenTofu Builds Its Nine-Step Dependency Graph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Dependency Graph, Internal, Infrastructure as Code, Architecture

Description: Learn how OpenTofu constructs its resource dependency graph through nine steps to determine the correct order of resource creation, modification, and deletion.

## Introduction

OpenTofu uses a directed acyclic graph (DAG) to determine the order in which resources are created, modified, and destroyed. Understanding how this graph is built helps you write more efficient configurations, debug dependency issues, and use the `depends_on` meta-argument effectively.

## Visualizing the Graph

Before diving into construction, visualize your configuration's dependency graph:

```bash
tofu graph | dot -Tsvg > graph.svg
```

Or use the text output:

```bash
tofu graph
```

## The Nine Steps of Graph Construction

### Step 1: Build the Configuration Graph

OpenTofu reads all `.tf` files and builds a node for each resource, data source, module, output, variable, and local value in the configuration.

```hcl
resource "aws_vpc" "main" { ... }
resource "aws_subnet" "public" { ... }  # Two nodes created
```

### Step 2: Add State Nodes

Nodes are added for resources that exist in state but may not be in the current configuration. These represent potential destroy actions.

### Step 3: Add Plan Nodes

For each configuration node, OpenTofu determines whether to create, update, or delete the resource by comparing configuration with state.

### Step 4: Walk the Configuration for References

OpenTofu traverses all expressions in the configuration, looking for references:

```hcl
resource "aws_subnet" "public" {
  vpc_id = aws_vpc.main.id  # Reference creates a dependency edge
}
```

This creates a directed edge: `aws_subnet.public` depends on `aws_vpc.main`.

### Step 5: Add Explicit depends_on Edges

The `depends_on` meta-argument adds additional edges not captured by reference analysis:

```hcl
resource "aws_instance" "app" {
  depends_on = [aws_iam_role_policy_attachment.app]
  # IAM policy attachment is referenced but not by attribute,
  # so depends_on makes the ordering explicit
}
```

### Step 6: Add Provider Nodes

Each resource node is connected to its provider node. Providers must be initialized before resources can be created:

```text
aws_instance.app → provider["registry.opentofu.org/hashicorp/aws"]
```

### Step 7: Add Module Expansion

Module calls expand into their contained resources, and inter-module references create edges between the expanded resources:

```hcl
module "networking" { ... }
module "compute" {
  vpc_id = module.networking.vpc_id  # Creates edge: compute → networking
}
```

### Step 8: Prune Unnecessary Nodes

Nodes that are not reachable from the root walk (e.g., resources targeted with `-target`) are removed from the active graph. This is also where `count = 0` and `for_each = {}` remove resource nodes.

### Step 9: Validate and Detect Cycles

OpenTofu validates the graph is a DAG (directed acyclic graph) - no circular dependencies. If a cycle exists, OpenTofu reports an error:

```text
Error: Cycle: aws_security_group.app, aws_security_group.db
```

Fix cycles by using `aws_security_group_rule` resources instead of inline `ingress`/`egress` blocks.

## Practical Implications

### Parallel Execution

Resources without dependencies between them are processed in parallel:

```hcl
resource "aws_s3_bucket" "logs" { ... }
resource "aws_s3_bucket" "assets" { ... }
# These two have no dependency - OpenTofu creates them in parallel

```

### Controlling Parallelism

```bash
tofu apply -parallelism=5  # Limit to 5 concurrent operations
```

### Debugging Dependency Issues

If a resource is being created/destroyed in the wrong order:

1. Check `tofu graph` for missing edges.
2. Add `depends_on` if the dependency is implicit (e.g., through IAM propagation).
3. Use `-target` to apply specific resources first during debugging.

### The Destroy Graph

During `tofu destroy`, the graph is reversed - resources are destroyed in the opposite order of creation:

```bash
tofu graph -type=plan-destroy
```

## Example: Viewing Dependencies

```bash
# Show only specific resource's dependencies
tofu graph | grep "aws_instance"

# Filter the graph output
tofu graph | grep -E "aws_(vpc|subnet|security_group|instance)"
```

## Best Practices

- Avoid unnecessary `depends_on` - use explicit references instead so OpenTofu can track attribute values.
- Use `depends_on` only when the dependency is behavioral, not data-driven.
- Split large configurations into modules to keep the dependency graph manageable.
- Run `tofu graph` in CI to visualize planned changes before applying them.
- Watch for overly deep dependency chains that prevent parallelism.

## Conclusion

OpenTofu's nine-step graph construction process is the foundation of its declarative execution model. Understanding how references, `depends_on`, modules, and providers become graph edges allows you to write configurations that are both correct in ordering and efficient in parallel execution.
