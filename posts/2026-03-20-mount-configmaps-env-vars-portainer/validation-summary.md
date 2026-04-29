# Validation Summary: How to Mount ConfigMaps as Environment Variables in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (ConfigMaps, Pods, Deployments)
- Kubernetes YAML manifests (`envFrom`, `configMapRef`, `env`, `configMapKeyRef`)
- Portainer (Kubernetes UI)
- kubectl CLI (`exec`, `rollout restart`)

## Sources Consulted
- Kubernetes API reference: EnvFromSource — https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#envfromsource-v1-core
- Kubernetes API reference: ConfigMapEnvSource — https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#configmapenvsource-v1-core
- Kubernetes API reference: ConfigMapKeySelector — https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#configmapkeyselector-v1-core
- Kubernetes ConfigMap docs — https://kubernetes.io/docs/concepts/configuration/configmap/
- kubectl reference: exec, rollout restart — https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- **Incorrect placement of `prefix` inside `configMapRef`** (Method 1 example): The original YAML had the commented `# prefix: "APP_"` indented as a child of `configMapRef`. Per the Kubernetes API, `prefix` is a field of `EnvFromSource` (a sibling of `configMapRef` and `secretRef`), not a field of `ConfigMapEnvSource` (which only has `name` and `optional`). Fixed the indentation so the commented `prefix` line sits at the correct level.

## Review Notes
- The `configMapKeyRef` block in Method 2 is correct: `name`, `key`, and `optional` are all valid fields of `ConfigMapKeySelector`.
- The note about ConfigMap updates not propagating to env vars in running pods is accurate — env vars are resolved at pod start, and `kubectl rollout restart` is the standard remediation.
- `kubectl exec -it <pod> --namespace=production -- env` and `printenv` are valid invocations.
- Portainer UI steps are described at a level that should remain stable across versions; exact label wording may differ slightly between Portainer CE/BE versions but the workflow is correct.
