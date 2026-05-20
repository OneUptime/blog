# Validation Summary: How to Deploy Applications to Edge Clusters with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSets
- Argo CD AppProjects and sync windows
- Kubernetes
- Kustomize
- Prometheus Operator
- Edge Kubernetes distributions such as K3s and MicroK8s

## Sources Consulted
- Argo CD ApplicationSet Cluster Generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Go Template: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet Templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD Declarative Setup for cluster secrets and projects: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Project Specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Sync Windows: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD CLI command reference for `argocd cluster add`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD CLI command reference for `argocd app get`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD Metrics: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD Architecture: https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/
- Kubernetes Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Validating Admission Policy: https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/

## Issues Found
- The ApplicationSet example used the older fasttemplate parameter style (`{{name}}`, `{{server}}`). I updated it to enable Go templating with `goTemplate: true`, added `goTemplateOptions: ["missingkey=error"]`, and changed template variables to the current Go template form (`{{.name}}`, `{{.server}}`). I also used `{{.nameNormalized}}` for generated Application names and labels, matching Argo CD guidance for Kubernetes-safe names.
- The resource constraints example placed `nodeAffinity` directly under the Pod spec. Kubernetes expects node affinity under `.spec.affinity.nodeAffinity`, so I corrected the YAML structure.
- The AppProject example claimed it restricted allowed image sources. AppProjects restrict manifest source repositories, destinations, and Kubernetes resource kinds; they do not enforce container registry allowlists. I corrected the comments and surrounding text, and added a short note that registry enforcement should be handled by Kubernetes admission policy or a policy engine.
- The image digest pinning explanation said Argo CD can detect registry drift from image pinning. Argo CD compares desired manifests with live cluster state, so I revised the wording to say digest pinning makes the desired image reference immutable and manifest drift unambiguous.
- The conclusion described Argo CD as a pull-based model that keeps retrying until an edge cluster is reachable. For remote clusters, the hub-side application controller must reach the target Kubernetes API, and sync retries are bounded by configured retry policy. I revised this to describe Git-driven reconciliation and the configured retry window accurately.

## Review Notes
The remaining commands and configuration snippets are consistent with current Argo CD and Kubernetes documentation. The sync window cluster patterns rely on Application destination names or servers, so operators should ensure edge cluster names match the `edge-*` pattern if they use this example as-is.
