# Validation Summary: How to Implement Chaos Testing After ArgoCD Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD sync hooks and sync waves
- Kubernetes Jobs, Services, RBAC, and Kustomize overlays
- Chaos Mesh Helm installation
- Chaos Mesh PodChaos, NetworkChaos, and StressChaos resources
- Litmus Chaos ChaosEngine and HTTP probes
- Shell scripting with kubectl and curl

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Chaos Mesh Helm installation: https://chaos-mesh.org/docs/production-installation-using-helm/
- Chaos Mesh PodChaos documentation: https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh NetworkChaos documentation: https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/
- Chaos Mesh StressChaos documentation: https://chaos-mesh.org/docs/simulate-heavy-stress-on-kubernetes/
- Litmus HTTP probe documentation: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/probes/httpProbe/
- Litmus pod-delete experiment documentation: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-delete/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Bitnami kubectl image Dockerfile: https://hub.docker.com/r/bitnami/kubectl/dockerfile
- Referenced OneUptime blog link: https://oneuptime.com/blog/post/2026-02-26-argocd-test-failures-automated-rollback/view

## Issues Found
- Added a cleanup trap to the PodChaos and NetworkChaos Job scripts so chaos resources are deleted if the script exits after creating them. This aligns the examples with the post's own cleanup guidance.
- Added `gracePeriod: 0` to the PodChaos `pod-kill` example. Chaos Mesh documents `gracePeriod` as the field controlling the duration before deleting a Pod for `pod-kill`, with `0` as the default immediate deletion behavior.
- Changed Litmus probe `runProperties.probeTimeout` and `interval` from duration strings (`5s`, `2s`) to numeric values (`5`, `2`) and added `probePollingInterval: 2`. Litmus documents these probe tunables as integer fields.

## Review Notes
The examples are technically valid but assume the target service, labels, service account namespace, Chaos Mesh CRDs, and Litmus experiment CRDs already exist. For production use, teams should pin image and chart versions, tune blast radius and thresholds per service SLOs, and verify the container runtime socket path for their cluster.
