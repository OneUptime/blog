# Validation Summary: How to Create Disaster Recovery Plan for Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- kubectl
- istioctl
- Prometheus alerting rules
- TLS certificates and Istio CA configuration
- GitOps backup and restore workflows

## Sources Consulted
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio plug in CA certificates documentation: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- Istio pilot-discovery metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The backup script assumed the `backup/` directory already existed. Added `mkdir -p backup` so the redirect targets are valid.
- The backup script treated an in-cluster `IstioOperator` resource as always present. `istioctl install -f` supports the `IstioOperator` API from a manifest, but clusters may not have an in-cluster `IstioOperator` custom resource. Updated the command to handle that case and tell readers to back up the source manifest or Helm values.
- The namespace label backup and restart examples only covered `istio-injection=enabled`. Istio also supports revision labels such as `istio.io/rev`. Added backup and restart handling for revision-labelled namespaces.
- The certificate recovery section said to restore from backup if a certificate was expired, which could restore the same expired material. Updated the wording to use renewed CA files or a still-valid backup.
- The Prometheus certificate alert used a cert-manager metric mixed with an unrelated Istio build metric. Replaced it with Istio's documented `citadel_server_root_cert_expiry_seconds` metric.
- The `IstioBackupStale` alert placed `summary` under `labels`. Moved it under `annotations`, matching Prometheus alerting rule structure.

## Review Notes
The RTO/RPO values are example planning targets rather than Istio guarantees. The backup and recovery commands are generally valid, but production teams should adapt resource lists, namespace label selectors, and certificate procedures to their installation method, revision strategy, and CA provider.
