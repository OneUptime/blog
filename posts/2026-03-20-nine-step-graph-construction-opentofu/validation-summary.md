# Validation Summary: How OpenTofu Builds Its Nine-Step Dependency Graph

## Status
validated

## Post Type
Technical guide / Architecture explainer

## Technologies Covered
- OpenTofu (CLI: `tofu`)
- HCL (HashiCorp Configuration Language)
- Graphviz (`dot`) for SVG graph rendering
- Provider addressing (`registry.opentofu.org/hashicorp/aws`)
- Directed Acyclic Graphs (DAGs)

## Sources Consulted
- OpenTofu Graph Command documentation: https://opentofu.org/docs/cli/commands/graph/
- OpenTofu Provider Requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Apply documentation (parallelism flag)
- OpenTofu Provider Configuration documentation: https://opentofu.org/docs/language/providers/configuration/

## Issues Found
- **Incorrect `-type` flag value for `tofu graph`**: The post used `tofu graph -type=destroy-plan`, but OpenTofu's documented valid values for the `-type` flag are `plan`, `plan-refresh-only`, `plan-destroy`, and `apply`. Fixed by changing `destroy-plan` to `plan-destroy` so the command actually runs.

## Review Notes
- The "nine-step" framing is a useful pedagogical simplification. The OpenTofu graph builders (e.g., `PlanGraphBuilder`, `ApplyGraphBuilder`) actually run a longer ordered sequence of graph transformers internally, but the nine logical groupings the author lists (config nodes, state nodes, plan/diff nodes, reference edges, depends_on edges, provider attachment, module expansion, pruning/targeting, cycle validation) reasonably summarize what those transformers do. Readers digging into the source should be aware the count is conceptual, not literal.
- The provider-address format `registry.opentofu.org/hashicorp/aws` is correct for default provider lookups in OpenTofu (the hostname defaults to `registry.opentofu.org/` when omitted from a provider source).
- The `tofu apply -parallelism=N` flag is correct (default is 10).
- The cycle error format (`Error: Cycle: <node_a>, <node_b>`) approximates the real OpenTofu output well enough for an explanatory snippet; exact wording may differ slightly across versions.
- The advice to fix security-group cycles by switching from inline `ingress`/`egress` blocks to `aws_security_group_rule` resources is a well-known and correct workaround for circular references between security groups.
- Step 8's claim that `count = 0` and `for_each = {}` remove resource nodes is consistent with how the expand transformers behave — those expressions produce zero instances, leaving no nodes for the apply walk.
