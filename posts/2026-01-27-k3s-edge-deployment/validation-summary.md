# Validation Summary: How to Configure K3s for Edge Deployment

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- K3s
- Kubernetes
- Rancher Fleet
- containerd registry configuration
- Air-gapped Kubernetes installation
- OpenTelemetry Collector
- OneUptime OTLP ingestion

## Sources Consulted
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- K3s Air-Gap Install: https://docs.k3s.io/installation/airgap
- K3s Private Registry Configuration: https://docs.k3s.io/installation/private-registry
- K3s GitHub Releases: https://github.com/k3s-io/k3s/releases
- Rancher Fleet GitRepo Resource: https://fleet.rancher.io/reference/ref-gitrepo
- Rancher Fleet Bundle Resource: https://fleet.rancher.io/reference/ref-bundle
- Rancher Fleet Cluster Registration: https://fleet.rancher.io/how-tos-for-operators/cluster-registration
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- OpenTelemetry Collector Configuration: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Filter Processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector OTLP HTTP Exporter: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector Resiliency: https://opentelemetry.io/docs/collector/resiliency/
- OneUptime OpenTelemetry Docs: https://oneuptime.com/docs/en/telemetry/open-telemetry

## Issues Found
- The K3s air-gap preparation script used `v1.29.1+k3s2`, which is outdated as of the review date, and attempted to download `k3s-amd64`, which is not the amd64 release asset name. Updated the example to `v1.36.1+k3s1` and added an explicit `K3S_BINARY` variable using `k3s` for amd64.
- The air-gap image download used `.tar.gz` while current K3s documentation examples use `.tar.zst`. Updated the download and install copy commands to use `.tar.zst`.
- The offline install script imported application images with `ctr` before K3s/containerd was guaranteed to be running. Changed it to place the application image tar in `/var/lib/rancher/k3s/agent/images/` so K3s imports it at startup.
- The K3s config described `write-kubeconfig-mode: "0644"` as restricted, but K3s documents `0600` as the default restricted mode and `0644` as readable by unprivileged users. Changed it to `0600`.
- The private registry snippet included TLS insecure-skip verification for an HTTP endpoint. Removed that misleading TLS setting and added a note about `--disable-default-registry-endpoint` for strict air-gapped behavior.
- The Fleet registration script manually created a bootstrap secret and applied a non-existent/latest deployment URL pattern instead of using the documented Fleet agent Helm chart with a `ClusterRegistrationToken`-derived values file. Replaced it with the documented token, secret extraction, and Helm installation flow.
- The OpenTelemetry Collector resource processor attempted to read `CLUSTER_NAME` via `from_attribute`, which copies an existing telemetry attribute rather than an environment variable. Changed it to use environment substitution.
- The OpenTelemetry filter processor used the older `metrics.exclude.metric_names` shape. Updated it to current OTTL `metric_conditions` syntax with `error_mode: ignore`.
- The OpenTelemetry exporter used the deprecated `otlphttp` component alias. Updated it to `otlp_http` and added the JSON encoding required by OneUptime's Collector example.
- The network resilience ConfigMap used an invalid top-level `storage` section and omitted the OneUptime OTLP HTTP encoding/header settings. Replaced it with a `file_storage` extension, enabled it under `service.extensions`, and added the required exporter settings plus a note to mount the PVC at the file storage path.

## Review Notes
- YAML syntax was parsed successfully for all fenced YAML blocks after edits.
- The OpenTelemetry DaemonSet still assumes the operator supplies appropriate RBAC for the `k8s_cluster` receiver; production deployments should add a ServiceAccount, ClusterRole, and ClusterRoleBinding.
- The Fleet registration script intentionally notes that different commands must be run against the Fleet manager and edge cluster contexts.
