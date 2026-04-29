# Validation Summary: How to Deploy K3s for Edge Computing Use Cases

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Helm
- Fleet
- Prometheus
- Redis
- systemd
- cron
- Bash
- YAML

## Sources Consulted
- K3s home: https://docs.k3s.io/
- K3s requirements: https://docs.k3s.io/installation/requirements
- K3s resource profiling: https://docs.k3s.io/reference/resource-profiling
- K3s configuration options: https://docs.k3s.io/installation/configuration
- K3s server CLI reference: https://docs.k3s.io/cli/server
- K3s agent CLI reference: https://docs.k3s.io/cli/agent
- K3s architecture: https://docs.k3s.io/architecture
- K3s cluster datastore: https://docs.k3s.io/datastore
- K3s Helm controller docs: https://docs.k3s.io/add-ons/helm
- Fleet installation docs: https://fleet.rancher.io/how-tos-for-operators/installation
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes cluster networking: https://kubernetes.io/docs/concepts/cluster-administration/networking/
- Prometheus community chart `prometheus` v25.0.0 `Chart.yaml`: https://raw.githubusercontent.com/prometheus-community/helm-charts/prometheus-25.0.0/charts/prometheus/Chart.yaml
- Prometheus community chart `prometheus` v25.0.0 `values.yaml`: https://raw.githubusercontent.com/prometheus-community/helm-charts/prometheus-25.0.0/charts/prometheus/values.yaml

## Issues Found
- The post claimed a blanket `~512MB RAM minimum` for K3s. Current K3s requirements distinguish between agent and server nodes, so I corrected the wording to reflect that 512MB suits agents while servers need about 2GB minimum.
- The Raspberry Pi prerequisite was outdated and partially incorrect. I updated the cgroup instructions to match current K3s docs, including the current `/boot/firmware/cmdline.txt` path and the documented kernel parameters.
- The `bind-address` comment said the config bound K3s to a specific interface, but `0.0.0.0` actually binds on all interfaces. I corrected the comment to match the real behavior.
- The Step 4 workload manifest assumed the `edge-apps` namespace existed and used `local-cache` like a DNS-resolvable service name without defining a Service. I added the namespace manifest and a Redis Service so the example can work as written.
- The Step 5 Deployment was invalid for `apps/v1` because it was missing `.spec.selector` and matching pod-template labels. I added both required fields.
- The Step 5 `DATABASE_URL` used `localhost`, which is only appropriate for same-pod communication. Since the example describes local in-cluster services, I changed it to a service-style hostname.
- The Step 6 Prometheus example used the wrong values keys for chart version `25.0.0`. I corrected them to `prometheus-pushgateway`, `prometheus-node-exporter`, and `kube-state-metrics` based on the chart's published values file.
- The Step 8 watchdog only handled the `k3s` systemd service, which would miss worker nodes running `k3s-agent`. I updated the example to enable and monitor either `k3s` or `k3s-agent` as appropriate.

## Review Notes
- The Prometheus example pins chart version `25.0.0`, which is valid once the values keys are corrected, but it is older than the current upstream chart line as of April 29, 2026. A future refresh could update the pinned version intentionally.
- The Fleet installation commands are technically valid. Upstream docs also show `--wait`, which could be added in a future revision for a more operator-friendly install flow.
