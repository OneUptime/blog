# Validation Summary: How to Use Multiple Plugins in a Single ArgoCD Application

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Config Management Plugins
- Argo CD multi-source Applications
- Kubernetes manifests
- Helm
- Kustomize
- SOPS
- age
- Docker
- kubectl

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- Argo CD Multiple Sources for an Application documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Helm `helm template` command reference: https://helm.sh/docs/helm/helm_template/
- Helm `helm dependency build` command reference: https://helm.sh/docs/helm/helm_dependency_build/
- SOPS official documentation: https://github.com/getsops/sops
- Kubernetes `kubectl apply` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The Helm-to-Kustomize examples copied `kustomization.yaml` into a temporary directory but did not clearly require the generated Helm manifest to be included as a Kustomize resource. I added comments to the composite and wrapper plugin examples noting that the temporary `kustomization.yaml` must include `all.yaml` or `helm-output.yaml` as a resource so that Kustomize patches apply to the Helm-rendered output.
- The local testing flow rendered Helm output to `/tmp/all.yaml` and copied the kustomization into `/tmp`, but the post did not make the same generated-resource requirement explicit. The local test now copies patches into `/tmp` and relies on the kustomization including `all.yaml` as the resource to build.

## Review Notes
Argo CD's current documentation confirms that each Application source can use only one config management plugin, while `spec.sources` lets Argo CD generate manifests from multiple sources separately and combine the results. The post's plugin examples use `ConfigManagementPlugin` as a sidecar plugin configuration file, which is correct; it should not be applied to the Kubernetes API as a custom resource.
