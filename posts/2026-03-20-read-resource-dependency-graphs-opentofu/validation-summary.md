# Validation Summary: How to Read Resource Dependency Graphs in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu dependency graph internals
- HCL
- Graphviz DOT

## Sources Consulted
- OpenTofu CLI docs: `tofu graph` https://opentofu.org/docs/cli/commands/graph/
- OpenTofu internals: Resource Graph https://opentofu.org/docs/internals/graph/
- OpenTofu language docs: `depends_on` meta-argument https://opentofu.org/docs/language/meta-arguments/depends_on/
- OpenTofu language docs: Resource Behavior https://opentofu.org/docs/v1.11/language/resources/behavior/
- Local verification with OpenTofu v1.11.6 CLI by generating sample `tofu graph` output for resources, variables, locals, outputs, modules, and data sources

## Issues Found
- The Mermaid diagram and surrounding explanation implied dependency edges pointed in creation order. I corrected this so the post now matches actual `tofu graph` semantics: arrows point from the dependent node to the dependency node, and apply order runs opposite the arrow direction.
- The resource-ordering section described root and leaf nodes in a way that does not match actual DOT output, because OpenTofu adds a synthetic `root` node and walks nodes once dependencies are satisfied. I rewrote that section to explain how to read real `tofu graph` output.
- The critical-path example used `aws_subnet.a.id` as the `vpc_id` for another subnet, which is invalid. I replaced it with a valid example that shows an unnecessary `depends_on` creating a sequential bottleneck.
- The graph-node table did not match actual OpenTofu output for several node types. I updated it to reflect common patterns for locals, outputs, provider configuration nodes, and child module expansion or closure nodes.
- The debugging section told readers to inspect nodes pointing to a resource. In actual DOT output, a resource's dependencies are shown by that resource's outgoing edges, so I corrected the explanation.

## Review Notes
- Verified the corrected behavior against official OpenTofu documentation and against actual CLI output from OpenTofu v1.11.6.
- `tofu graph` output varies by graph type and may include additional internal nodes such as `root`, `(expand)`, and `(close)`, so simplified examples should be read as conceptual rather than exhaustive.
