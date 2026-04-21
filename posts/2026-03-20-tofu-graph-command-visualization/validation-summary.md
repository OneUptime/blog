# Validation Summary: How to Visualize OpenTofu Configurations with tofu graph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- `tofu graph`
- DOT graph language
- Graphviz `dot`
- Shell commands
- CI YAML

## Sources Consulted
- OpenTofu `graph` command documentation: https://opentofu.org/docs/cli/commands/graph/
- OpenTofu resource graph internals: https://opentofu.org/docs/internals/graph/
- OpenTofu inspecting infrastructure documentation: https://opentofu.org/docs/cli/inspect/
- Graphviz command-line documentation: https://graphviz.org/doc/info/command.html
- Graphviz DOT language documentation: https://graphviz.org/doc/info/lang.html
- Graphviz download documentation: https://graphviz.org/download/
- Graphviz Online viewer: https://dreampuf.github.io/GraphvizOnline/
- Viz.js site: https://viz-js.com/

## Issues Found
- The introduction described `tofu graph` as only showing dependencies in the current configuration and implied generic circular dependency identification. Updated it to match OpenTofu's documentation: the command visualizes either the current configuration or an execution plan, and cycle diagnosis is specifically supported with `-draw-cycles`.
- The Ubuntu/Debian Graphviz install command used `apt install graphviz` without `sudo`. Updated it to `sudo apt install graphviz`, matching Graphviz's download documentation for Debian and Ubuntu.
- The `-type` examples described `plan` as "planned resources" and `apply` as "applied resources and state." Updated the descriptions to refer to operation graphs, because OpenTofu documents `-type` as selecting the graph type for plan, plan-destroy, or apply operations.
- The filtering example used `grep -A5 "aws_instance"` and claimed it focused on a resource and its dependencies. That does not reliably extract a dependency subgraph from DOT output. Updated it to describe a simple search for lines mentioning the resource.
- The online visualization links were bare domains/paths. Updated them to full HTTPS URLs and verified both pages resolve.
- The conclusion called the rendered output an architecture diagram that always reflects the current configuration. Updated it to "dependency diagram" generated from the current configuration or execution plan, which better matches OpenTofu's documented behavior.

## Review Notes
The local environment did not have `tofu` or `dot` installed, so CLI behavior was verified against official OpenTofu and Graphviz documentation rather than local `--help` output. No deprecated `tofu graph` flags are used in the post.
