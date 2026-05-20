# Validation Summary: How to Exclude Resources from Orphan Detection in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD AppProject orphaned resource monitoring
- Argo CD CLI
- Kubernetes Services, Endpoints, EndpointSlices, Events, ConfigMaps, ServiceAccounts, Pods, ReplicaSets, ControllerRevisions, Jobs, and Secrets
- cert-manager
- Istio
- Prometheus Operator
- External Secrets Operator

## Sources Consulted
- Argo CD Orphaned Resources Monitoring documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/orphaned-resources/
- Argo CD `argocd proj add-orphaned-ignore` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_add-orphaned-ignore/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_resources/
- Argo CD AppProject specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD source implementation for orphaned resource exclusions: https://github.com/argoproj/argo-cd/blob/master/controller/appcontroller.go
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes ServiceAccount administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/

## Issues Found
- The post stated that omitting any ignore-rule field means "match any value." Argo CD's implementation treats omitted `kind` and `name` as wildcards, but an omitted `group` matches the core API group because the empty string is the core group. Updated the explanation and example to show `group: "*"` for matching any API group.
- The post suggested checking orphaned resources via `argocd proj get production -o json | jq '.status.orphanedResources...'`. AppProject status does not expose orphaned resources that way; Argo CD documents viewing orphaned resources through the application resources view and the CLI supports `argocd app resources APPNAME --orphaned`. Updated the commands accordingly.
- The introduction implied ServiceAccount token Secrets are automatically created generally. Kubernetes stopped auto-generating legacy Secret-based ServiceAccount tokens by default starting in Kubernetes 1.24. Updated the wording and the legacy token pattern comment.
- The Endpoints and EndpointSlice descriptions were slightly overbroad. Updated them to clarify that selector-backed Services get generated endpoint resources and that EndpointSlice is the current Service backend API.

## Review Notes
Argo CD already excludes the default ServiceAccount and `kube-root-ca.crt` ConfigMap from orphaned resource reporting by default, so listing them in ignore examples is redundant but harmless. The broad development ignore rules are valid configuration but intentionally reduce orphan-detection coverage.
