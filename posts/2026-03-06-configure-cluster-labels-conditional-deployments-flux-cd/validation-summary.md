# Validation Summary: How to Configure Cluster Labels for Conditional Deployments in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization resources
- Flux post-build variable substitution
- Kustomize
- Kubernetes ConfigMaps
- Kubernetes Deployments
- Kubernetes ResourceQuota
- Kubernetes NetworkPolicy
- Kubernetes CLI usage with kubectl and flux

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` documentation: https://v2-6.docs.fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes ConfigMap documentation: https://v1-35.docs.kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Device Plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post implied Flux supports conditional logic based on cluster labels. Flux post-build substitution does not provide if/else logic, so the wording was corrected to explain that conditional deployment comes from including different Flux Kustomization resources in each cluster directory.
- The GPU `ResourceQuota` example included both `requests.nvidia.com/gpu` and `limits.nvidia.com/gpu`. Kubernetes only allows `requests.` quota entries for extended resources, so the limits entry was removed.
- The NetworkPolicy example implied that a broad CIDR exception could ensure EU data residency. Kubernetes NetworkPolicy is an allow-list API and cannot reliably express geographic residency by cloud-region CIDR in that way, so the example was changed to an approved endpoint CIDR allow-list pattern.
- The verification command used `kubectl get kustomizations` with custom columns. Replaced it with the documented `flux get kustomizations --context "$ctx" -n flux-system` command.
- The best-practice note for default substitutions overstated failure behavior. Flux substitutes undefined variables with an empty string unless a default is provided, and strict failures require `StrictPostBuildSubstitutions=true`, so the wording was updated.
- Flux post-build substitutions were used directly in Kubernetes `env.value` string fields. Flux documentation notes that substitutions of booleans or numbers can fail when the target field must be a string. Added the documented `quote: '"'` substitution helper to the Flux Kustomization examples and wrapped substituted environment variable values with `${quote}...${quote}`.

## Review Notes
The remaining Flux Kustomization, ConfigMap, ResourceQuota, NetworkPolicy, GPU extended-resource, and CLI examples are consistent with the official documentation consulted. The examples still assume supporting resources such as namespaces, services, PVCs, and omitted files like `audit-logging.yaml` exist elsewhere in the sample repository.
