# Validation Summary: How to implement ArgoCD with Kustomize components for dynamic configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Application and ApplicationSet resources
- Kustomize components
- Kubernetes manifests
- Kubernetes NetworkPolicy
- Kubernetes Pod security settings
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD ApplicationSet List Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-List/
- Kustomize components example documentation: https://github.com/kubernetes-sigs/kustomize/blob/master/examples/components.md
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes PodSecurityPolicy documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/

## Issues Found
- The security component referenced `podsecuritypolicy.yaml`. PodSecurityPolicy was deprecated in Kubernetes v1.21 and removed in Kubernetes v1.25, so the reference was removed and the post now notes that Pod Security Admission labels or a third-party admission controller should be used instead.
- The security component used `commonLabels`, which is deprecated in current Kustomize usage. It was replaced with the current `labels` syntax using `pairs` and `includeSelectors`.
- The multi-component section claimed components compose without conflicts. This was too absolute because patches and generated resources can still conflict. The wording now qualifies that components compose cleanly when they do not target the same fields.
- The ApplicationSet example included a `components` generator parameter that was never consumed by the template, then claimed component sets came from the generator configuration. The unused parameter was removed, and the text now explains that the ApplicationSet selects environment overlays whose kustomization files declare the component sets. It also notes that Argo CD v2.10+ supports direct `spec.source.kustomize.components` configuration.

## Review Notes
The examples assume referenced resources such as `ServiceMonitor`, `GrafanaDashboard`, `PrometheusRule`, backup resources, and migration ConfigMaps exist in the repository and that their CRDs/controllers are installed in the target cluster. The local `kustomize` and `argocd` CLIs were not installed in this environment, so verification was performed against official documentation rather than local command execution.
