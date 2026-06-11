# Validation Summary: How to Build Max Unavailable Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes rolling update strategy
- Kubernetes Pod Disruption Budgets
- kubectl rollout commands
- YAML configuration

## Sources Consulted
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget task documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- kubectl rollout history reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/

## Issues Found
- The Pod Disruption Budget section claimed that PDBs provide protection during both voluntary and involuntary disruptions. Kubernetes documentation states that PDBs limit voluntary evictions and cannot protect against all causes of unavailability, such as node failure. Updated the wording to focus on voluntary disruptions and eviction-based cluster maintenance.
- The PDB diagram and conclusion used stronger availability language than Kubernetes guarantees. Updated "Guaranteed Availability" to "Availability Controls" and changed the conclusion to say these settings help maintain availability during rollouts and eviction-based maintenance.

## Review Notes
- Deployment `maxUnavailable` and `maxSurge` examples use current `apps/v1` fields and valid `IntOrString` values.
- The Deployment percentage rounding explanation is correct: `maxUnavailable` percentages round down and `maxSurge` percentages round up.
- PodDisruptionBudget `policy/v1` is current. Note that PDB percentage rounding differs from Deployment rolling updates: PDB `maxUnavailable` percentages round up.
