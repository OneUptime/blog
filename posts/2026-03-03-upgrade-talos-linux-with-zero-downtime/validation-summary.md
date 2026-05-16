# Validation Summary: How to Upgrade Talos Linux with Zero Downtime

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- kubectl
- Pod Disruption Budgets
- Deployments
- StatefulSets
- Ingress controllers
- Prometheus alert rules

## Sources Consulted
- Talos Linux upgrade documentation: https://www.talos.dev/latest/talos-guides/upgrading-talos/
- Talos Linux CLI reference: https://www.talos.dev/docs/latest/reference/cli/
- Talos Linux disaster recovery and etcd snapshot documentation: https://www.talos.dev/latest/advanced/disaster-recovery/
- Talos Linux GitHub releases: https://github.com/siderolabs/talos/releases
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes pod affinity and anti-affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes ingress-nginx releases: https://github.com/kubernetes/ingress-nginx/releases

## Issues Found
- The Deployment example for `web-app` was not a valid Kubernetes Deployment because it had a selector but no matching `template.metadata.labels`, and it did not define any containers. Added the matching pod template labels and a container definition so the manifest is structurally valid.
- The Talos installer image examples used `ghcr.io/siderolabs/installer:v1.7.0`, which is outdated for a 2026 guide. Updated examples to `ghcr.io/siderolabs/installer:v1.13.2`, the latest stable Talos release available during validation, and added guidance to use the intended target version and intermediate minor-version upgrade path when required.
- The worker-node section implied the manual drain/uncordon flow was the whole Talos upgrade behavior. Added a note that Talos upgrades also cordon, drain, and uncordon as part of the upgrade flow.
- The ingress controller Deployment example was not a valid Kubernetes Deployment because it was missing `spec.selector`, matching pod template labels, and a container definition. Added the missing fields and updated the controller image to a current ingress-nginx release.
- The load balancer section overstated what a PDB guarantees by saying it ensures at least two pods are always running. Reworded it to describe the PDB's actual voluntary eviction behavior.

## Review Notes
The technical approach is sound for highly available clusters, but "zero downtime" still depends on external load balancer behavior, application readiness and shutdown behavior, sufficient spare capacity, storage failover characteristics, and the absence of unrelated failures during voluntary disruptions. The Kubernetes documentation also notes that PDBs protect voluntary evictions only; they are not a general availability guarantee.
