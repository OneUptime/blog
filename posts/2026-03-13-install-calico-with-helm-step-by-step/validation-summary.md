# Validation Summary: Install Calico with Helm Step by Step

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- Helm 3
- calicoctl
- Flux CD HelmRelease

## Sources Consulted
- Calico official Helm installation guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico official Helm installation reference: https://docs.tigera.io/calico/latest/reference/installation/helm_customization
- Calico official Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico official calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico official API server documentation: https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico official Helm chart repository index: https://docs.tigera.io/calico/charts/index.yaml
- Flux official HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/

## Issues Found
- The verification command used `kubectl wait --for=condition=Ready tigerastatus/calico`, but TigeraStatus conditions are represented with `Available`, `Progressing`, and `Degraded`. Changed it to `kubectl wait --for=condition=Available tigerastatus/calico --timeout=300s`.
- The values example comment described `typhaMetricsPort` and `nodeMetricsPort` as Typha replica settings. These fields configure Prometheus metrics ports, not replica counts. Updated the comment.
- The values example comment said the API server was disabled while `apiServer.enabled` was set to `true`. Updated the comment to match the actual configuration.
- The best practices section recommended `calicoctl export`, which is not a top-level calicoctl command. Updated it to use `calicoctl get <resource> <name> -o yaml --export`, matching the calicoctl documentation.

## Review Notes
- The post pins Calico v3.27.0. The v3.27 chart includes CRDs inside the `tigera-operator` chart, so the single-chart install is valid for that pinned version. Current Calico documentation for newer releases shows a separate CRD chart step before installing the operator chart.
