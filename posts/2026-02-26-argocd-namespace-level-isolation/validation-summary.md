# Validation Summary: How to Configure Namespace-Level Isolation in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Argo CD AppProjects
- Argo CD RBAC
- Prometheus metrics and alerts

## Sources Consulted
- Argo CD Declarative Setup: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD Applications in any namespace: https://argo-cd.readthedocs.io/en/latest/operator-manual/app-any-namespace/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Installation: https://argo-cd.readthedocs.io/en/latest/operator-manual/installation/
- Argo CD Metrics: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo CD application controller metrics source: https://github.com/argoproj/argo-cd/blob/master/controller/metrics/metrics.go

## Issues Found
- The applications-in-any-namespace section enabled `application.namespaces` but did not configure `AppProject.spec.sourceNamespaces`. Added an AppProject example because Argo CD requires the Application namespace to be allowed by both the global setting and the referenced project.
- The `argocd-cmd-params-cm` example omitted the Argo CD config label and did not mention restarting affected workloads. Added the label and restart note to match Argo CD configuration behavior.
- The namespace-scoped installation section incorrectly implied `--application-namespaces` was namespace-scoped Argo CD mode. Reworded it as limiting Application source namespaces and clarified that applications in any namespace require a cluster-scoped Argo CD installation.
- The RBAC example used the two-segment application object format only. Updated it to the three-segment `<project>/<namespace>/<app>` format required when applications in any namespace are enabled.
- The monitoring section claimed namespace restriction violations are caught by `argocd_app_sync_total{phase="Error"}`. Updated it to use the `InvalidSpecError` application condition for destination/project spec violations and kept `argocd_app_sync_total` as relevant for failed sync attempts.

## Review Notes
The remaining AppProject, Application, RBAC, and CLI examples align with current Argo CD documentation. The monitoring example depends on enabling `--metrics-application-conditions=InvalidSpecError` on the application controller, which is now stated in the post.
