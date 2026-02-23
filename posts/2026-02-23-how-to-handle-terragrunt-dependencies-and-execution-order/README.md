# How to Handle Terragrunt Dependencies and Execution Order

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Dependencies, Execution Order, DAG

Description: Learn how Terragrunt builds and executes dependency graphs across modules, how to debug ordering issues, and best practices for managing complex dependency chains.

---

When you run `terragrunt run-all apply`, Terragrunt needs to figure out which modules to apply first, which can run in parallel, and which must wait for others. This ordering is determined by the dependency graph - a directed acyclic graph (DAG) built from your `dependency` and `dependencies` blocks. Understanding how this graph works is key to managing large Terragrunt projects.

## How the Dependency Graph Is Built

Terragrunt scans all `terragrunt.hcl` files in the target directory and builds edges between them based on two block types:

```hcl
# Explicit dependency with output passing
dependency "vpc" {
  config_path = "../vpc"
}

# Explicit ordering without output passing
dependencies {
  paths = ["../iam-roles", "../kms"]
}
```

Both create edges in the dependency graph. The only difference is that `dependency` also reads outputs, while `dependencies` only affects ordering.

## Visualizing the Graph

Use the `graph-dependencies` command to see your dependency graph:

```bash
cd live/dev
terragrunt graph-dependencies
```

This outputs a DOT-format graph:

```
digraph {
  "vpc" ;
  "rds" ;
  "ecs" ;
  "app" ;
  "vpc" -> "rds" ;
  "vpc" -> "ecs" ;
  "rds" -> "app" ;
  "ecs" -> "app" ;
}
```

You can render this with Graphviz:

```bash
# Generate a PNG visualization
terragrunt graph-dependencies | dot -Tpng -o deps.png
```

## Execution Groups

Terragrunt organizes modules into execution groups based on the graph:

```
Group 1 (no dependencies):      vpc, iam-roles, kms
Group 2 (depends on Group 1):   rds, ecs-cluster, security-groups
Group 3 (depends on Group 2):   app, worker, cron
Group 4 (depends on Group 3):   monitoring, alerts
```

Within each group, modules run in parallel (subject to the `--terragrunt-parallelism` setting). Groups execute sequentially - Group 2 starts only after all modules in Group 1 succeed.

For destroy operations, the groups execute in reverse order: Group 4 first, Group 1 last.

## Common Dependency Patterns

### Linear Chain

The simplest pattern - each module depends on the previous:

```
vpc -> subnets -> security-groups -> ecs-cluster -> app
```

```hcl
# subnets/terragrunt.hcl
dependency "vpc" { config_path = "../vpc" }

# security-groups/terragrunt.hcl
dependency "subnets" { config_path = "../subnets" }

# ecs-cluster/terragrunt.hcl
dependency "sg" { config_path = "../security-groups" }

# app/terragrunt.hcl
dependency "ecs" { config_path = "../ecs-cluster" }
```

This results in purely sequential execution. No parallelism is possible.

### Fan-Out

One module fans out to many independent modules:

```
vpc --> rds
    --> elasticache
    --> ecs-cluster
    --> lambda
```

```hcl
# Each downstream module depends on vpc
dependency "vpc" { config_path = "../vpc" }
```

After the VPC is applied, all four modules run in parallel.

### Fan-In

Multiple modules converge on one:

```
vpc --------\
rds ---------+--> app
ecs-cluster -/
```

```hcl
# app/terragrunt.hcl
dependency "vpc" { config_path = "../vpc" }
dependency "rds" { config_path = "../rds" }
dependency "ecs" { config_path = "../ecs-cluster" }
```

The app module waits for all three dependencies to complete.

### Diamond

A combination of fan-out and fan-in:

```
     vpc
    /   \
  rds   ecs
    \   /
     app
```

```hcl
# rds/terragrunt.hcl
dependency "vpc" { config_path = "../vpc" }

# ecs/terragrunt.hcl
dependency "vpc" { config_path = "../vpc" }

# app/terragrunt.hcl
dependency "rds" { config_path = "../rds" }
dependency "ecs" { config_path = "../ecs" }
```

This is the most common pattern. VPC applies first, then RDS and ECS in parallel, then app.

### Layered Architecture

A production environment often has layers:

```
Layer 1: vpc, iam-roles, kms-keys
Layer 2: subnets, security-groups
Layer 3: rds, elasticache, ecs-cluster
Layer 4: ecs-services, lambda-functions
Layer 5: api-gateway, cloudfront
Layer 6: monitoring, alerts, dashboards
```

Each layer depends on the one above. Within a layer, modules can run in parallel.

## Handling Cycles

Terragrunt requires the dependency graph to be acyclic. If module A depends on B and B depends on A, you get an error:

```
Found a dependency cycle between modules:
  /path/to/live/dev/a
  /path/to/live/dev/b
```

### Breaking Cycles

If you have a legitimate circular relationship, you need to restructure:

**Before (cyclic):**
```
security-groups --> ecs-service (needs SG ID)
ecs-service --> security-groups (needs service IP for ingress rule)
```

**After (acyclic):**
```
security-groups --> ecs-service --> sg-rules
```

Split the security group module into two: one for the base SG (no ingress rules that reference the service), and one for the rules that need the service's information.

## Cross-Directory Dependencies

Dependencies can span directories:

```hcl
# live/dev/app/terragrunt.hcl
dependency "shared_vpc" {
  config_path = "../../shared/vpc"
}
```

This works with `run-all` when you run from a directory that contains both:

```bash
# This will include both shared and dev modules
cd live
terragrunt run-all apply
```

But if you run from just the dev directory:

```bash
cd live/dev
terragrunt run-all apply
```

The shared VPC is outside the scan scope. Terragrunt will still read its outputs from state (assuming it was applied previously), but it will not apply it as part of this `run-all`.

## Controlling Execution Order Without dependency Blocks

Sometimes you want to influence ordering without adding `dependency` or `dependencies` blocks. The directory structure itself does not affect ordering - only explicit dependency declarations do.

If you find yourself with modules that should run in a specific order but do not have a data dependency, use `dependencies`:

```hcl
# monitoring/terragrunt.hcl

# No outputs needed, just make sure these exist first
dependencies {
  paths = [
    "../ecs-service",
    "../rds",
    "../elasticache",
  ]
}
```

## Debugging Execution Order

### Graph Visualization

```bash
# See the full graph
terragrunt graph-dependencies

# Save as an image
terragrunt graph-dependencies | dot -Tpng -o graph.png
```

### Dry Run

```bash
# See what would run and in what order
terragrunt run-all plan --terragrunt-log-level info
```

The initial output shows the execution groups before any Terraform commands run.

### Check a Specific Module's Dependencies

```bash
# From a module directory, see its resolved dependencies
cd live/dev/app
terragrunt render-json | jq '.dependency'
```

## Performance Optimization

### Minimize Dependency Depth

A deep chain (A -> B -> C -> D -> E) means sequential execution. If possible, flatten the graph:

```
# Deep chain (slow)
vpc -> subnets -> security-groups -> ecs-cluster -> service

# Flatter graph (faster)
vpc -> subnets
vpc -> security-groups
subnets, security-groups -> ecs-cluster -> service
```

### Use skip_outputs for Ordering-Only Dependencies

```hcl
dependency "iam" {
  config_path  = "../iam-roles"
  skip_outputs = true  # faster - does not read state
}
```

### Reduce the Number of Dependencies

Each `dependency` block requires reading a remote state file. If a module has 10 dependencies but only needs outputs from 3, use `dependency` for those 3 and `dependencies` for the rest:

```hcl
# Read outputs from these
dependency "vpc" { config_path = "../vpc" }
dependency "rds" { config_path = "../rds" }

# Just ordering for these
dependencies {
  paths = ["../iam", "../kms", "../secrets", "../ecr"]
}
```

## Best Practices

**Keep the graph shallow.** Aim for 3-5 layers of depth. If your graph has 10+ levels of sequential dependencies, look for ways to flatten it.

**Make dependencies explicit.** Do not rely on implicit ordering from directory structure or CI/CD pipeline stages. If module B needs module A to exist, declare it.

**Use mock outputs everywhere.** Every `dependency` block should have `mock_outputs` to support `plan` commands:

```hcl
dependency "vpc" {
  config_path = "../vpc"
  mock_outputs = {
    vpc_id     = "vpc-mock"
    subnet_ids = ["subnet-mock-1", "subnet-mock-2"]
  }
  mock_outputs_allowed_terraform_commands = ["plan", "validate"]
}
```

**Document complex dependency relationships.** If the dependency graph is not obvious from the directory structure, add comments explaining why certain dependencies exist.

**Test destroy order.** Run `terragrunt run-all plan -destroy` to verify the reverse ordering makes sense before actually destroying anything.

## Conclusion

Terragrunt's dependency management is what makes it possible to operate on multi-module infrastructure as a single unit. The dependency graph determines execution order, parallelism, and error propagation. Keep the graph explicit, shallow, and well-documented. Use `graph-dependencies` to visualize it when things get complex.

The combination of `dependency` (for outputs and ordering) and `dependencies` (for ordering only) gives you fine-grained control over how modules relate to each other. When in doubt, declare the dependency explicitly rather than hoping for the right order.

For the commands that use this dependency graph, see [How to Use Terragrunt run-all Command](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terragrunt-run-all-command/view).
