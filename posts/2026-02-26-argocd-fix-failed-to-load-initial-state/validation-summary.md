# Validation Summary: How to Fix 'failed to load initial state' in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD application controller
- Kubernetes API server and RBAC
- Kubernetes CustomResourceDefinitions
- Kubernetes NetworkPolicy
- etcd
- cert-manager CRDs
- PrometheusRule monitoring

## Sources Consulted
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD high availability and controller sharding documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD resource exclusions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_app_get/
- Kubernetes API health endpoint documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- cert-manager supported releases documentation: https://cert-manager.io/docs/releases/

## Issues Found
- The API health checks used `/healthz`, which Kubernetes has deprecated since v1.16. Replaced the examples with `/readyz`, which is the current readiness endpoint for checking whether the API server can accept traffic.
- The controller examples used `deployment/argocd-application-controller` in several places. Current standard Argo CD manifests run the application controller as a StatefulSet, so the exec, rollout, and log commands now target `statefulset/argocd-application-controller`.
- The cert-manager CRD installation example used `v1.14.0`, which is end-of-life. Updated the URL to `v1.20.2`, the latest release observed during validation.
- The `timeout.reconciliation` example was placed under `argocd-cmd-params-cm`, but Argo CD documents it as an `argocd-cm` setting. Split the example so reconciliation timeout is shown under `argocd-cm` and controller processor settings remain under `argocd-cmd-params-cm`.
- The sharding section scaled the controller StatefulSet but did not set `ARGOCD_CONTROLLER_REPLICAS`, which Argo CD documents as part of enabling controller sharding. Updated the command to set both the StatefulSet replica count and the controller replica environment variable.
- The post referred to "progressive loading" as a fix without a corresponding documented Argo CD setting. Removed that phrase and kept the concrete memory increase guidance.

## Review Notes
The NetworkPolicy example is syntactically valid, but it is broad because `0.0.0.0/0` allows egress to any IPv4 destination on the listed ports. In production, operators should prefer the cluster API server address or CIDR when it is stable and known.
