# How to Use Terraform Dependency Analysis for Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Dependency Graph, Performance, Optimization, DevOps

Description: Understand and leverage Terraform dependency analysis to identify bottlenecks, optimize resource ordering, and speed up plans and applies.

---

Terraform builds a directed acyclic graph (DAG) of all your resources to determine the correct order for creation, updates, and deletion. Understanding this graph is one of the most underused techniques for optimizing Terraform performance. When you know how Terraform sees your dependencies, you can restructure your code to enable more parallelism and faster execution.

## How the Dependency Graph Works

Every resource in Terraform has implicit and explicit dependencies. Terraform uses these to build a graph that determines execution order.

**Implicit dependencies** come from resource references:

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

# Implicit dependency on aws_vpc.main through vpc_id reference

resource "aws_subnet" "private" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}
```

**Explicit dependencies** come from `depends_on`:

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = "t3.medium"

  # Explicit dependency - Terraform cannot infer this
  depends_on = [aws_iam_instance_profile.app]
}
```

## Visualizing the Graph

Terraform has a built-in command to output the dependency graph:

```bash
# Generate a DOT format graph
terraform graph > graph.dot

# Convert to an image (requires Graphviz)
terraform graph | dot -Tpng > graph.png

# Generate a graph for just the plan
terraform graph -type=plan > plan-graph.dot

# Generate a graph for apply
terraform graph -type=apply > apply-graph.dot
```

For large projects, the full graph is too complex to read visually. Filter it:

```bash
# Filter to show only selected resources while preserving DOT syntax
terraform graph | awk '/digraph|{/{print} /aws_instance|aws_security_group|aws_subnet/{print} /}/{print}' > filtered-graph.dot
```

## Identifying Serial Bottlenecks

The longest chain of dependencies in your graph determines the minimum execution time. This is the critical path. Resources on the critical path cannot be parallelized because each depends on the previous one.

Look for chains like this:

```text
aws_vpc -> aws_subnet -> aws_instance -> aws_eip -> aws_route53_record
```

Each resource must complete before the next can start. If each takes 30 seconds, the chain takes 2.5 minutes regardless of parallelism.

Compare this with a wide graph where many resources are independent:

```text
aws_vpc -> aws_subnet_a (parallel)
        -> aws_subnet_b (parallel)
        -> aws_subnet_c (parallel)
        -> aws_internet_gateway (parallel)
```

Here, all four resources can be created simultaneously after the VPC.

## Breaking Unnecessary Dependencies

Sometimes dependencies exist that Terraform does not actually need. Removing them allows more parallelism.

### Over-using depends_on

```hcl
# Before: Unnecessary explicit dependency creates a serial chain
resource "aws_s3_bucket" "logs" {
  bucket = "my-logs-bucket"
}

resource "aws_cloudwatch_log_group" "app" {
  name = "/app/logs"

  # This dependency is unnecessary - the log group does not need S3
  depends_on = [aws_s3_bucket.logs]
}

# After: Remove the unnecessary dependency
resource "aws_cloudwatch_log_group" "app" {
  name = "/app/logs"
  # Now this can be created in parallel with the S3 bucket
}
```

### Avoiding Whole-Module Dependencies

When you pass a module output to another module, Terraform can track the dependency through that specific output. Avoid adding a module-level `depends_on` unless every resource in the second module really must wait for the first module:

```hcl
module "compute" {
  source    = "./modules/compute"
  vpc_id    = module.networking.vpc_id
  subnet_id = module.networking.subnet_id

  # Avoid this unless the whole compute module has a hidden dependency
  # on the whole networking module.
  # depends_on = [module.networking]
}
```

If the networking module has 50 resources, a module-level `depends_on` can force the compute module to wait for all of them, even though it only needs the VPC and subnet. Prefer passing the specific output values that downstream resources need, or restructuring modules to expose smaller outputs.

## Analyzing Dependency Depth

You can calculate the depth of your dependency graph to understand your theoretical minimum execution time:

```bash
#!/bin/bash
# analyze-graph-depth.sh
# Count the longest chain in the dependency graph

terraform graph -type=plan | python3 -c "
import sys
import re

# Parse DOT format edges
edges = {}
nodes = set()
for line in sys.stdin:
    match = re.search(r'\"(.+)\" -> \"(.+)\"', line)
    if match:
        src, dst = match.groups()
        edges.setdefault(src, []).append(dst)
        nodes.add(src)
        nodes.add(dst)

# Find longest path using DFS
def longest_path(node, memo={}):
    if node in memo:
        return memo[node]
    children = edges.get(node, [])
    if not children:
        memo[node] = 0
        return 0
    max_depth = max(longest_path(child, memo) for child in children)
    memo[node] = max_depth + 1
    return memo[node]

if nodes:
    max_depth = max(longest_path(n) for n in nodes)
    print(f'Maximum dependency depth: {max_depth}')
    print(f'Total nodes: {len(nodes)}')

    # Find the critical path
    for n in nodes:
        if longest_path(n) == max_depth:
            print(f'Critical path starts at: {n}')
            break
"
```

## Using Graph Analysis to Guide Splitting

The dependency graph tells you where natural split points are. Resources with no connections between groups are candidates for separate state files:

```bash
# Find resources with no cross-group dependencies
terraform graph -type=plan | python3 -c "
import sys
import re

edges = {}
for line in sys.stdin:
    match = re.search(r'\"(.+)\" -> \"(.+)\"', line)
    if match:
        src, dst = match.groups()
        edges.setdefault(src, set()).add(dst)
        edges.setdefault(dst, set())

# Group by resource type prefix
groups = {}
for node in edges:
    # Extract resource type (e.g., 'aws_vpc' from 'aws_vpc.main')
    parts = node.split('.')
    if len(parts) >= 2:
        rtype = parts[0]
        groups.setdefault(rtype, set()).add(node)

# Check for cross-group dependencies
for group_name, group_nodes in groups.items():
    external_deps = set()
    for node in group_nodes:
        for dep in edges.get(node, set()):
            dep_type = dep.split('.')[0]
            if dep_type != group_name:
                external_deps.add(dep_type)
    if external_deps:
        print(f'{group_name} depends on: {external_deps}')
    else:
        print(f'{group_name} is independent - candidate for splitting')
"
```

## Optimizing Module Dependencies

Module inputs and outputs participate in the dependency graph. Terraform can usually infer dependencies from the specific output values that downstream resources use, while broad module-level dependencies make plans more conservative.

To improve parallelism, make module interfaces narrow:

```hcl
# modules/networking/outputs.tf
# Only output what other modules actually need
output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

# Do not add output dependencies that no one needs
# This keeps the dependency surface narrow
```

## Checking for Circular Dependencies

Terraform refuses to plan if it detects circular dependencies. But near-circular patterns (A depends on B, B depends on C, C depends on a different output of A) can cause unexpected serialization:

```bash
# Check for potential issues
terraform validate

# If you get circular dependency errors, ask Terraform to highlight cycles
terraform graph -type=plan -draw-cycles | dot -Tpng > cycles.png
```

## Summary

Understanding Terraform's dependency graph gives you insight into why your plans and applies take as long as they do. Visualize the graph to find serial bottlenecks, remove unnecessary `depends_on` declarations, narrow module interfaces, and use the graph to identify natural splitting points. These analysis techniques turn performance optimization from guesswork into data-driven decision making.

For monitoring the infrastructure that your Terraform dependency graph describes, [OneUptime](https://oneuptime.com) provides dependency-aware monitoring and alerting that mirrors how your services actually relate to each other.
