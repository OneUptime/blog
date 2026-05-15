# Validation Summary: How to Use ConfigMap and Secret References in Flux Kustomization

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux Kustomization resources
- Kubernetes ConfigMaps
- Kubernetes Secrets
- Kustomize post-build substitution
- kubectl
- SOPS
- Sealed Secrets

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux build kustomization` documentation: https://v2-6.docs.fluxcd.io/flux/cmd/flux_build_kustomization/
- Kubernetes Secret configuration documentation: https://kubernetes.io/docs/tasks/configmap-secret/managing-secret-using-config-file/
- Kubernetes Secret good practices: https://kubernetes.io/docs/concepts/security/secrets-good-practices/
- SOPS documentation: https://github.com/getsops/sops

## Issues Found
- The original Secret usage example substituted sensitive values directly into Deployment environment variable `value` fields. This works as post-build substitution, but it leaves the rendered Deployment object containing plaintext secret values. Updated the example to substitute the values into a Kubernetes Secret using `stringData`, then reference that Secret from the Deployment with `secretKeyRef`.
- The phrase "Apply the Secret securely" implied that applying a plaintext Secret manifest is itself secure. Changed it to "Apply the Secret to the cluster" to avoid overstating the security of a plaintext manifest.

## Review Notes
- Flux documentation confirms that `spec.postBuild.substituteFrom` supports ConfigMap and Secret references, that referenced objects must be in the same namespace as the Kustomization, that `optional: true` tolerates missing references, and that inline `substitute` values take precedence over values loaded from `substituteFrom`.
- Flux documentation also notes that missing variables are substituted with empty strings unless defaults or strict substitution are used. This post does not cover strict substitution, but its omission is not a correctness issue.
