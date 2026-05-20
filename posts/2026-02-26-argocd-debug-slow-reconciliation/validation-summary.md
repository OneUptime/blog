# Validation Summary: How to Debug Slow Reconciliation in ArgoCD

## Status
validated

## Post Type
Technical debugging guide

## Technologies Covered
- Argo CD
- Kubernetes
- Prometheus metrics
- Helm
- Kustomize
- Redis
- kubectl
- argocd CLI
- jq

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD high availability and scaling documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD command parameters ConfigMap documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD declarative setup and resource exclusions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD official install manifests: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The controller metrics port-forward used `svc/argocd-application-controller-metrics`, but Argo CD documentation lists application controller metrics at `argocd-metrics:8082`. Updated the command to use `svc/argocd-metrics`.
- The reconciliation metric was listed as `argocd_app_reconcile_duration_seconds`; current Argo CD documentation exposes the histogram as `argocd_app_reconcile`. Updated the grep command and metric table.
- The shallow clone example used unsupported repo-server-wide key `reposerver.git.shallow.clone`. Replaced it with the documented per-repository `depth: "1"` Secret setting and kept `reposerver.parallelism.limit` as a separate documented command-params setting.
- The post used `deployment/argocd-application-controller` and a Deployment manifest for controller examples. Official Argo CD install manifests define `argocd-application-controller` as a StatefulSet, so those examples were changed to `statefulset/argocd-application-controller` and `kind: StatefulSet`.
- The debug logging examples patched container `command` entries with `--loglevel`, which is brittle and does not match the documented command-params configuration method. Replaced them with `argocd-cmd-params-cm` patches for `controller.log.level` and `reposerver.log.level`, followed by rollouts.
- The resource usage comment labeled `argocd-server` as the Kubernetes API server. Updated it to say ArgoCD API server.

## Review Notes
The suggested healthy/problem thresholds are operational guidance rather than official Argo CD defaults, so they should be treated as example thresholds and tuned per installation. Local `kubectl` and `argocd` binaries were not installed in the workspace, so CLI behavior was checked against official documentation and Argo CD manifests rather than local `--help` output.
