# How to Use tofu graph to Visualize Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, CLI

Description: Learn how to use tofu graph to generate a visual dependency graph of your OpenTofu configuration and understand resource relationships.

## Introduction

`tofu graph` generates a DOT-format representation of the dependency graph between all resources, data sources, and modules in your configuration. You can render this graph as an image using Graphviz to visualize how resources depend on each other. This helps with understanding complex configurations, debugging dependency issues, and documenting infrastructure.

## Basic Usage

```bash
# Generate DOT graph output

tofu graph

# Output (DOT format):
# digraph {
#   compound = "true"
#   newrank  = "true"
#   subgraph "root" {
#     "[root] aws_s3_bucket.data" [label = "aws_s3_bucket.data", shape = "box"]
#     "[root] aws_s3_bucket_versioning.data" [label = "...", shape = "box"]
#     "[root] aws_s3_bucket_versioning.data" -> "[root] aws_s3_bucket.data"
#   }
# }
```

## Rendering as an Image

Install Graphviz, then pipe the output:

```bash
# Generate PNG image
tofu graph | dot -Tpng -o graph.png

# Generate SVG for better quality
tofu graph | dot -Tsvg -o graph.svg

# Open the image (macOS)
open graph.png
```

## Install Graphviz

```bash
# macOS
brew install graphviz

# Ubuntu/Debian
apt-get install graphviz

# RHEL/CentOS
yum install graphviz
```

## Graph Types

```bash
# Default: plan graph (what would happen on apply)
tofu graph

# Plan-destroy graph: visualize destroy order
tofu graph -type=plan-destroy

# Plan-refresh-only graph
tofu graph -type=plan-refresh-only

# Apply graph (when a plan file is passed as the second argument)
tofu graph -type=apply
```

## Draw a Specific Module's Dependencies

```bash
# Focus on a module subgraph
tofu graph | grep -A 50 'module.networking'
```

## Filtering Noise

The default graph can be large. Use `grep` to focus on specific resources:

```bash
# Show only edges (dependencies)
tofu graph | grep ' -> '

# Filter to show only a module's resources
tofu graph | grep 'module.networking'
```

## Automated Graph in CI/CD

```bash
# Generate and upload graph as a CI artifact
tofu graph | dot -Tsvg -o architecture-graph.svg

# Upload as artifact in GitHub Actions
- uses: actions/upload-artifact@v4
  with:
    name: dependency-graph
    path: architecture-graph.svg
```

## Using with draw.io / Other Tools

Convert DOT to JSON for tools that don't accept DOT format:

```bash
# Convert to JSON using jq and a DOT parser
tofu graph | dot -Tjson -o graph.json
```

## Example Graph Structure

A simple configuration with an S3 bucket and policy produces:

```text
aws_s3_bucket.data
    ↑
aws_s3_bucket_policy.data (depends on bucket)
    ↑
aws_iam_role.app (depends on policy ARN)
```

The graph makes explicit what implicit dependencies exist from resource attribute references.

## Debugging Dependency Cycles

```bash
# If OpenTofu reports a cycle error, visualize to find it
tofu graph | dot -Tpng -o cycle-debug.png

# Look for circular arrows in the rendered image
```

## Conclusion

`tofu graph` combined with Graphviz is a powerful tool for understanding and documenting infrastructure dependencies. Generate graphs for code reviews to communicate what is being built, use destroy graphs to verify teardown order, and render dependency graphs as CI artifacts to keep architecture documentation current. For large configurations, filter the output with `grep` to focus on the subgraph you need.
