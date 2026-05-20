# Validation Summary: How to Deploy DaemonSets with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- DaemonSets
- GitOps
- Fluent Bit configuration
- kubectl and argocd CLI commands

## Sources Consulted
- Kubernetes DaemonSet concept documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes DaemonSet rolling update documentation: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD argocd app get command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD / GitOps Engine DaemonSet health implementation: https://raw.githubusercontent.com/argoproj/gitops-engine/master/pkg/health/health_daemonset.go

## Issues Found
- The DaemonSet example said it would run on all nodes including control plane nodes, but only tolerated the current `node-role.kubernetes.io/control-plane` taint. Added the legacy `node-role.kubernetes.io/master` toleration used by Kubernetes' own DaemonSet examples so the statement is accurate across common clusters.
- The Argo CD health-check explanation incorrectly said DaemonSet health is based only on ready pods matching desired scheduled pods. Updated it to reflect Argo CD's documented and implemented checks for observed generation, updated scheduled pods, and available pods.
- The post said crash-looping DaemonSet pods show as degraded. Argo CD's built-in DaemonSet health normally remains `Progressing` when updated pods are not available, so the wording was corrected.
- The custom health check used `numberReady` and did not account for observed generation, `OnDelete`, or `numberAvailable`. Updated the Lua example to align with Argo CD's built-in DaemonSet health behavior.

## Review Notes
- The Fluent Bit example is syntactically valid, but real clusters using containerd may need a CRI-oriented parser or chart-specific configuration instead of a Docker log parser and `/var/lib/docker/containers` host path.
- The `ignoreDifferences` examples are valid Argo CD syntax, but teams should prefer fixing manifests or using narrowly scoped paths/managers because ignored differences can hide real drift.
