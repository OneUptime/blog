# Validation Summary: How to Clean Up Orphaned Resources Safely in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD orphaned resource monitoring
- Argo CD CLI
- Kubernetes resources and kubectl
- jq and shell scripting
- OPA Gatekeeper ConstraintTemplates
- GitOps resource cleanup practices

## Sources Consulted
- Argo CD Orphaned Resources Monitoring: https://argo-cd.readthedocs.io/en/stable/user-guide/orphaned-resources/
- Argo CD app resources CLI reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD AppProject API/source definitions: https://github.com/argoproj/argo-cd/blob/release-3.0/pkg/apis/application/v1alpha1/types.go
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/resource_tracking/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/release-2.8/user-guide/auto_sync/
- Argo CD application deletion/finalizer documentation: https://argo-cd.readthedocs.io/en/release-3.1/user-guide/app_deletion/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes garbage collection documentation: https://kubernetes.io/docs/concepts/architecture/garbage-collection/
- Kubernetes EndpointSlice and Endpoints deprecation note: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes ConfigMap usage documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/

## Issues Found
- The post used `argocd proj get production -o json | jq '.status.orphanedResources...'`, but AppProject status does not expose an orphaned resource list. Argo CD exposes orphaned resources through the application resource tree and the supported CLI command is `argocd app resources APP --orphaned`. Updated the listing, grouping, backup, owner-reference, deletion, and scripted cleanup examples to use `argocd app resources`.
- The Ingress jq filter used `.spec.rules[].http.paths[]...`, which fails when a rule has no HTTP block. Updated it to use optional traversal with `[]?` and `service?`.
- The Service check used `kubectl get endpoints`, but the legacy Endpoints API is deprecated as of Kubernetes 1.33. Updated the example to use EndpointSlices filtered by `kubernetes.io/service-name`.
- The ConfigMap/Secret reference section only showed ConfigMap field names. Added a note naming the corresponding Secret fields.
- The adoption example used `kubectl neat` without noting that it is a plugin. Updated the comment to make the dependency explicit.
- The Gatekeeper example assumed Argo CD label-based tracking. Added wording that this applies to the default label-based tracking method and that policies should match the configured tracking method.

## Review Notes
The shell snippets remain examples and assume resource names do not contain whitespace, which is valid for Kubernetes object names. The `argocd app resources` parsing handles both core API resources with an empty group and grouped resources in the default table output.
