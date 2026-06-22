# Validation Summary: How to Use Helm Lookup Function for Dynamic Resource Discovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm chart templating
- Helm `lookup` function
- Kubernetes API resources
- Kubernetes IngressClass, StorageClass, Secrets, ConfigMaps, Services, CRDs, and NetworkPolicy
- kubectl RBAC checks

## Sources Consulted
- Helm Template Functions and Pipelines: https://helm.sh/docs/chart_template_guide/functions_and_pipelines/
- Helm Debugging Templates: https://helm.sh/docs/chart_template_guide/debugging/
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- Helm Template Function List: https://helm.sh/docs/chart_template_guide/function_list/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Sprig string and regex function documentation: https://masterminds.github.io/sprig/strings.html

## Issues Found
- The post described missing `lookup` results as an "empty dict". Helm documents this as an empty value, so the wording was corrected in the syntax and template-mode examples.
- The ConfigMap discovery example ranged over `.items` with `$name` as if it were the ConfigMap name. For lists, the first range variable is the index, so the snippet now reads `.metadata.name` from each item.
- The CoreDNS cluster domain helper used `regexFind` with a capture group but would return the full match, such as `kubernetes cluster.local`, not just the domain. The snippet now trims the `kubernetes ` prefix after matching and defaults safely if the Corefile is missing.
- The IngressClass default lookup treated any non-empty `ingressclass.kubernetes.io/is-default-class` annotation as true. Kubernetes documents that the annotation should be set to `"true"`, so the condition now checks for exactly `"true"` and handles missing annotations safely.
- The StorageClass default lookup now handles missing annotations safely while checking `storageclass.kubernetes.io/is-default-class == "true"`.
- The namespace-label check now handles namespaces without labels safely by defaulting the labels map.
- The dry-run section incorrectly said `helm upgrade --dry-run` connects to the cluster for `lookup` and referenced a non-current `--dry-run-server=false` flag. It now uses `--dry-run=server` for server-backed lookup tests and lists ordinary `--dry-run` / `--dry-run=client` as local modes.
- The troubleshooting command for debugging lookup results used ordinary `--dry-run`, which would not execute lookup against the cluster. It now uses `--dry-run=server`.

## Review Notes
Helm was not installed in the local workspace, so CLI behavior was verified against the official Helm command reference and template guide rather than local `helm --help` output. The examples are illustrative fragments rather than complete Kubernetes manifests, which is acceptable for this guide, but full chart tests would require embedding them in complete template files with values and helper definitions.
