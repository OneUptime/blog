# Validation Summary: How to Optimize Resource Dependencies for Parallel Execution in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI: `tofu apply`, `tofu graph`)
- HashiCorp Configuration Language (HCL)
- Terraform/OpenTofu module system (`for_each`, `depends_on`, modules)
- AWS provider resources (`aws_vpc`, `aws_subnet`, `aws_kms_key`)
- GraphViz / DOT format

## Sources Consulted
- [OpenTofu apply command docs](https://opentofu.org/docs/cli/commands/apply/) — confirmed default `-parallelism=10` and flag syntax.
- [OpenTofu graph command docs](https://opentofu.org/docs/cli/commands/graph/) — confirmed DOT output and `dot -Tsvg` rendering.
- [Terraform Dependency Graph internals](https://developer.hashicorp.com/terraform/internals/graph) — confirmed graph walk semantics, semaphore-based concurrency limiter, and that nodes are processed once dependencies are met.
- Spacelift / community documentation on `terraform graph` DOT output format — confirmed the structure of `[root] <resource>` node lines and edge lines.

## Issues Found
- **Misleading and unreliable grep pattern in "Measuring Improvement" section.** The original command was:
  ```bash
  # Count independent resource groups in the graph
  tofu graph | grep -c '^    "\[root\]'
  ```
  Two problems:
  1. The pattern depends on a specific 4-space indentation that is not guaranteed by the OpenTofu DOT output (indentation can vary or use tabs).
  2. Even when the indentation matches, both node definitions and edge lines start with the same `"[root] ...` prefix, so the count would conflate resource counts with edge counts. The label "independent resource groups" is also inaccurate — `grep -c` does not measure independent (parallelizable) groups, it just counts matching lines.

  Fixed to count node definitions reliably, regardless of indentation, by matching the `[label` attribute that only appears on node lines:
  ```bash
  # Count resource nodes in the graph
  tofu graph | grep -c '\[label'
  ```

## Review Notes
- The phrasing "OpenTofu uses a worker pool with a configurable concurrency limit (default: 10)" is a slight simplification — internally it is a semaphore-based concurrency limiter, not a fixed worker pool — but this is a reasonable abstraction for a tutorial and the default value (10) and flag (`-parallelism=n`) are accurate.
- All HCL examples are syntactically valid and correctly illustrate the dependency behavior described:
  - Pattern 1's "BAD" example does create an implicit dependency on `aws_subnet.a` via the `aws_subnet.a.vpc_id` attribute reference.
  - Pattern 2's `for_each` correctly produces sibling instances with no inter-instance dependencies.
  - Pattern 3's claim that `depends_on` on a module forces all module resources to wait is consistent with documented Terraform/OpenTofu behavior.
  - Pattern 4's recommendation to lift shared resources to the root module is a standard, correct best practice.
- No version pinning or version-specific caveats are needed; the behavior described matches current OpenTofu (1.x) behavior, which mirrors Terraform's graph and parallelism semantics.
