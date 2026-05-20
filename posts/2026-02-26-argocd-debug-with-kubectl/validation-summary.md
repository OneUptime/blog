# Validation Summary: How to Use kubectl to Debug ArgoCD Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- JSONPath
- jq
- Bash

## Sources Consulted
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Application CRD from upstream manifests: https://raw.githubusercontent.com/argoproj/argo-cd/master/manifests/crds/application-crd.yaml
- Argo CD install manifest from upstream manifests: https://raw.githubusercontent.com/argoproj/argo-cd/master/manifests/install.yaml
- Argo CD Application API types: https://raw.githubusercontent.com/argoproj/argo-cd/master/pkg/apis/application/v1alpha1/types.go
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The application conditions command used `kubectl -o jsonpath='{.status.conditions[*]}' | python3 -m json.tool`. Kubernetes JSONPath output for object lists is not guaranteed to be valid JSON for `python3 -m json.tool`, so I changed it to `kubectl get ... -o json | jq '.status.conditions // []'`.
- The operation state command had the same JSONPath-to-JSON formatting issue. I changed it to pipe full JSON into `jq '.status.operationState // {}'`.
- The failed sync resources command assumed `.status.operationState.syncResult.resources` is always present. Argo CD documents `status.operationState` as optional, so I changed the `jq` expression to default the resources list to `[]`.
- The controller exec example used `deploy/argocd-application-controller`, but upstream Argo CD installs the application controller as a StatefulSet. I changed it to the default StatefulSet pod name, `pod/argocd-application-controller-0`.

## Review Notes
- The local environment did not have `kubectl` installed, so kubectl behavior was checked against the official Kubernetes reference and upstream generated documentation rather than local `--help` output.
- The post assumes the default Argo CD namespace is `argocd`; this is accurate for the standard install but should be adjusted by readers using a custom namespace.
