# Validation Summary: How to Visualize and Understand the OpenTofu Resource Dependency Graph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu graph` command)
- Graphviz (`dot` CLI, DOT format)
- HashiCorp Configuration Language (HCL)
- AWS provider resources (used in examples: `aws_vpc`, `aws_subnet`, `aws_internet_gateway`, `aws_route_table`, `aws_route`, `aws_instance`, `aws_s3_bucket`)

## Sources Consulted
- OpenTofu official `tofu graph` command documentation: https://opentofu.org/docs/cli/commands/graph/
- Graphviz documentation for DOT output (`dot -Tsvg`, `dot -Tpng`)

## Issues Found
1. **Incorrect `-type` values**: The post listed `tofu graph -type=destroy-plan` and `tofu graph -type=refresh-only-plan`. The official OpenTofu documentation specifies the valid values as `plan-destroy` and `plan-refresh-only` (the word `plan` comes first). Fixed both commands in the "Generating Different Graph Types" section.
2. **Deprecated `-module-depth` flag**: The post recommended `tofu graph -module-depth=2` to include module internals. This flag is explicitly marked as deprecated in the OpenTofu documentation and no longer affects output. Replaced the example with guidance that modules already appear as subgraphs in the default output, and added a note that `-module-depth` is deprecated.

## Review Notes
- The valid `-type` values per OpenTofu docs are: `plan` (default with config), `plan-refresh-only`, `plan-destroy`, and `apply` (default when a plan file is given). The post covers all four after the fix.
- The `-draw-cycles` flag is correctly described — it highlights cycles with colored edges.
- The DOT output example (`digraph` with `compound`, `newrank`, `[root] ... (expand)` nodes and edges) is consistent with current `tofu graph` output format.
- Edge direction is correctly described: arrows point from dependent to dependency, so the dependency is created first.
- Graphviz install commands (`apt-get`, `brew`, `dnf`) are accurate.
- The HCL examples for the VPC, subnet, IGW, route table, and route resources are syntactically valid and the described dependency edges match what OpenTofu would build from the implicit references.
- The "Node Types" section is a slight simplification — in practice, most graph nodes (resources, data sources, providers) render with the default `box` shape and module/provider grouping is shown via DOT subgraphs rather than distinct shapes — but this is a stylistic generalization rather than a factual error and was left as-is.
