# How to Visualize OpenTofu Configurations with tofu graph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Graph, Visualization, Dependency Management, Infrastructure as Code

Description: Learn how to use the `tofu graph` command to generate and visualize dependency graphs for your OpenTofu configurations, helping you understand resource relationships.

## Introduction

The `tofu graph` command outputs a visual representation of either the current configuration or an execution plan in DOT graph language format. This helps you understand how resources relate to each other, diagnose cycle errors with `-draw-cycles`, and document your infrastructure architecture.

## Running the Graph Command

Generate a dependency graph:

```bash
tofu graph
```

This outputs DOT language to stdout. To save it:

```bash
tofu graph > graph.dot
```

## Converting DOT to an Image

Install Graphviz to render the DOT output as an image:

```bash
# macOS

brew install graphviz

# Ubuntu/Debian
sudo apt install graphviz
```

Generate a PNG:

```bash
tofu graph | dot -Tpng > graph.png
```

Generate an SVG (better for large graphs):

```bash
tofu graph | dot -Tsvg > graph.svg
```

## Graph Types

The `-type` flag controls which operation is graphed. With a configuration, the default is `plan`:

```bash
# Default with a configuration - show the plan graph
tofu graph -type=plan

# Show the apply operation graph
tofu graph -type=apply

# Show the destroy plan graph
tofu graph -type=plan-destroy
```

## Filtering the Graph

Search the DOT output for lines mentioning a specific resource:

```bash
tofu graph -type=plan | grep "aws_instance"
```

## Online Visualization

Paste the DOT output into an online viewer:
- `https://dreampuf.github.io/GraphvizOnline/`
- `https://viz-js.com/`

## Example: Reading the Output

```dot
digraph {
  compound = "true"
  newrank = "true"
  subgraph "root" {
    "[root] aws_vpc.main" [label = "aws_vpc.main", shape = "box"]
    "[root] aws_subnet.public" [label = "aws_subnet.public", shape = "box"]
    "[root] aws_subnet.public" -> "[root] aws_vpc.main"
  }
}
```

Arrows represent dependencies - `aws_subnet.public` depends on `aws_vpc.main`.

## Practical Uses

1. **Onboarding** - Help new team members understand infrastructure structure
2. **Debugging** - Identify unexpected dependencies causing apply failures
3. **Documentation** - Generate architecture diagrams automatically
4. **Circular dependency diagnosis** - Use `-draw-cycles` to highlight cycles when diagnosing cycle errors

## Automation in CI

```yaml
- name: Generate infrastructure graph
  run: |
    tofu graph | dot -Tsvg > docs/infrastructure-graph.svg
    git add docs/infrastructure-graph.svg
```

## Conclusion

`tofu graph` is a simple but powerful tool for understanding and documenting your OpenTofu infrastructure. By converting the DOT output to an image with Graphviz, you get an automatic dependency diagram generated from your current configuration or execution plan.
