# Validation Summary: How to Stop Karpenter Consolidation from Restarting Batch Jobs

## Status

validated

## Post Type

Guide

## Technologies Covered

- Karpenter NodePool v1 and NodeClaims
- Kubernetes Jobs
- Disruption budgets and taints

## Sources Consulted

- [Karpenter disruption and controls](https://karpenter.sh/docs/concepts/disruption/)
- [Karpenter NodePools](https://karpenter.sh/docs/concepts/nodepools/)
- [Kubernetes Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)

## Issues Found

No technical issues found.

## Review Notes

- Verified reason-specific budget values, template label/taint locations, and placement of the do-not-disrupt annotation on Pod template metadata.
- Current documentation supports the article's version caveat around WhenEmpty. The budget pause and later cleanup configuration are explicitly separate configurations.
- Reviewed the terminationGracePeriod/drift interaction and the limits of protection from physical Spot loss. YAML parsed and shell snippets passed bash -n; no live Karpenter disruption test was run.
