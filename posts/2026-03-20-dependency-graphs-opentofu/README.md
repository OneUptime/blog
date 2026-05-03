# How to Generate and Visualize Dependency Graphs in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Dependency Graph, Graphviz, Tofu graph, Infrastructure as Code

Description: Learn how to generate and visualize resource dependency graphs in OpenTofu to understand how resources relate to each other.

OpenTofu builds an internal dependency graph before every plan or apply. Visualizing this graph helps you understand resource ordering, spot unnecessary dependencies, and optimize parallel execution. The `tofu graph` command exposes this graph in DOT format, which tools like Graphviz can render.

## Generating a Dependency Graph

Run `tofu graph` in any initialized OpenTofu directory:

```bash
# Generate the dependency graph in DOT format

tofu graph

# Save the output to a file for rendering
tofu graph > graph.dot
```

The output is a DOT-format directed graph showing all resources and their dependencies.

## Rendering the Graph with Graphviz

Install Graphviz and convert the DOT file to an image:

```bash
# Install Graphviz on Ubuntu/Debian
sudo apt-get install -y graphviz

# Install on macOS
brew install graphviz

# Render to PNG
dot -Tpng graph.dot -o graph.png

# Render to SVG (better for large graphs)
dot -Tsvg graph.dot -o graph.svg

# Render to PDF
dot -Tpdf graph.dot -o graph.pdf
```

Open `graph.png` to see a visual map of your infrastructure's dependency structure.

## Graph for Different Plan Types

The `tofu graph` command accepts a `-type` flag to show graphs for different operations:

```bash
# Show the plan graph (default)
tofu graph -type=plan

# Show the apply graph
tofu graph -type=apply

# Show the destroy graph
tofu graph -type=plan-destroy

# Show the graph for a refresh-only plan
tofu graph -type=plan-refresh-only
```

The destroy graph is particularly useful because it shows the reverse-dependency order in which resources will be removed.

## Example: Simple Web Infrastructure Graph

Given this configuration:

```hcl
# A simple web stack with clear dependencies
resource "aws_vpc" "main" { cidr_block = "10.0.0.0/16" }

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id  # depends on VPC
  cidr_block = "10.0.1.0/24"
}

resource "aws_security_group" "web" {
  vpc_id = aws_vpc.main.id  # depends on VPC
}

resource "aws_instance" "web" {
  ami                    = var.ami_id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public.id           # depends on subnet
  vpc_security_group_ids = [aws_security_group.web.id]   # depends on SG
}
```

The graph will show:
- `aws_vpc.main` as a root node with no upstream dependencies.
- `aws_subnet.public` and `aws_security_group.web` both depending on `aws_vpc.main`.
- `aws_instance.web` depending on both the subnet and the security group.

## Filtering the Graph

For large configurations, filter the graph to show only specific resources:

```bash
# Show only the subgraph rooted at a specific resource
tofu graph | grep -A 5 "aws_instance"
```

Alternatively, use Python to filter the DOT output programmatically:

```python
import re, sys

# Read DOT content
dot = sys.stdin.read()

# Keep only lines mentioning a specific resource type
filtered = "\n".join(
    line for line in dot.splitlines()
    if "aws_rds" in line or "digraph" in line or "}" == line.strip()
)
print(filtered)
```

```bash
tofu graph | python3 filter-graph.py > rds-graph.dot
dot -Tpng rds-graph.dot -o rds-graph.png
```

## Conclusion

The `tofu graph` command combined with Graphviz gives you a clear visual picture of your infrastructure's dependency structure. Use it during development to verify ordering, during reviews to communicate architecture, and when debugging to trace unexpected dependencies.
