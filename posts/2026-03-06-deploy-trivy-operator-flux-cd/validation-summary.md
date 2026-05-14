# Validation Summary: How to Deploy Trivy Operator with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Flux CD HelmRepository, HelmRelease, and Kustomization resources
- Trivy Operator
- Kubernetes namespaces, Secrets, ConfigMaps, NetworkPolicies, CRDs, and Jobs
- PrometheusRule and ServiceMonitor monitoring resources
- Rego custom configuration audit policies

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Helm release guide: https://v2-7.docs.fluxcd.io/flux/guides/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Trivy Operator Helm chart values: https://github.com/aquasecurity/trivy-operator/blob/main/deploy/helm/values.yaml
- Trivy Operator v0.24.1 Helm chart values and templates: https://github.com/aquasecurity/trivy-operator/tree/v0.24.1/deploy/helm
- Trivy Operator configuration documentation: https://aquasecurity.github.io/trivy-operator/v0.19.1/getting-started/installation/configuration/
- Trivy Operator private registry tutorial: https://aquasecurity.github.io/trivy-operator/v0.17.1/tutorials/private-registries/
- Trivy Operator custom policy tutorial: https://github.com/aquasecurity/trivy-operator/blob/v0.24.1/docs/tutorials/writing-custom-configuration-audit-policies.md
- Trivy Operator metrics documentation: https://aquasecurity.github.io/trivy-operator/v0.9.0/integrations/metrics/
- Kubernetes image pull Secret documentation: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes field selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- `excludeNamespaces` was shown under `operator`, but the Trivy Operator Helm chart defines it as a top-level value. Moved it to `values.excludeNamespaces`.
- The `scanJobTTL` comment described a 24-hour scan schedule, but this value controls cleanup of completed scan jobs. Updated the comment and added `scannerReportTTL: 24h` for report refresh behavior.
- `trivy.dbRepository` included the registry host, but chart v0.24.x renders it as `dbRegistry/dbRepository`. Split it into `dbRegistry: ghcr.io` and `dbRepository: aquasecurity/trivy-db`.
- `trivy.useBuiltinPolicies` is not a chart value. Replaced it with the supported `useEmbeddedRegoPolicies`.
- The private registry Secret used `type: Opaque` and `docker-config.json`, which Trivy Operator does not use as an image pull Secret. Changed it to `type: kubernetes.io/dockerconfigjson` with `.dockerconfigjson`, and aligned the HelmRelease with `operator.privateRegistryScanSecretsNames`.
- The custom policy ConfigMap used a non-standard name and lacked `policy.<name>.kinds` entries. Changed it to `trivy-operator-policies-config` and added kind mappings.
- The custom Rego examples used older `appshield` package/import patterns and would conflict if both policies defined `__rego_metadata__` in the same package. Updated them to Trivy Operator custom policy packages with distinct package names and `input`-based workload checks.

## Review Notes
The NetworkPolicy assumes Prometheus runs in a namespace labeled `name: monitoring` and that the Kubernetes API server is reachable on TCP 6443; these are common but cluster-specific assumptions. The Prometheus metrics names and severity label casing match Trivy Operator's documented metrics examples.
