# Validation Summary: Argo Workflows DAG vs. Steps Templates: Which Structure Fits Your Pipeline?

## Status
validated

## Post Type
Technical comparison guide with Kubernetes YAML examples

## Technologies Covered

- Argo Workflows 4.0
- Kubernetes custom resources
- DAG and steps templates
- Enhanced Depends expressions
- Workflow parameters and artifacts
- Workflow concurrency and synchronization
- Argo CLI

## Sources Consulted

- [Argo Workflows 4.0: Steps walkthrough](https://argo-workflows.readthedocs.io/en/release-4.0/walk-through/steps/)
- [Argo Workflows 4.0: DAG walkthrough](https://argo-workflows.readthedocs.io/en/release-4.0/walk-through/dag/)
- [Argo Workflows 4.0: Core concepts](https://argo-workflows.readthedocs.io/en/release-4.0/workflow-concepts/)
- [Argo Workflows 4.0: Enhanced Depends logic](https://argo-workflows.readthedocs.io/en/release-4.0/enhanced-depends-logic/)
- [Argo Workflows 4.0: Field reference](https://argo-workflows.readthedocs.io/en/release-4.0/fields/)
- [Argo Workflows 4.0: Workflow inputs](https://argo-workflows.readthedocs.io/en/release-4.0/workflow-inputs/)
- [Argo Workflows 4.0: Loops](https://argo-workflows.readthedocs.io/en/release-4.0/walk-through/loops/)
- [Argo Workflows 4.0: Synchronization](https://argo-workflows.readthedocs.io/en/release-4.0/synchronization/)
- [Argo Workflows 4.0: Retries](https://argo-workflows.readthedocs.io/en/release-4.0/retries/)
- [Argo Workflows 4.0: `argo lint` reference](https://argo-workflows.readthedocs.io/en/release-4.0/cli/argo_lint/)
- [Argo Workflows v4.0.8 release](https://github.com/argoproj/argo-workflows/releases/tag/v4.0.8)

## Issues Found

- The failure-behavior section grouped retries with fields supported directly by steps and DAG tasks. `WorkflowStep` and `DAGTask` have `when`, `hooks`, and `continueOn` fields, but `retryStrategy` is configured on the invoked template. The sentence was revised to distinguish invocation-level control fields from template-level retry configuration.

## Review Notes

- Both complete Workflow manifests passed strict offline validation with Argo CLI v4.0.8 using `argo lint --offline`.
- The scheduling, barrier-versus-edge, multiple-root, nesting, output-reference, loop, conditional, synchronization, and DAG fail-fast explanations agree with the Argo Workflows 4.0 documentation and field reference.
- The Enhanced Depends operands and the compatibility rules for `dependencies`, `depends`, and DAG-task `continueOn` are accurate for Argo Workflows 4.0.
- All documentation links in the post resolved to the intended official Argo Workflows pages during review.
