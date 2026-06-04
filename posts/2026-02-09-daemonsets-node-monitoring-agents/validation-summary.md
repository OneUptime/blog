# Validation Summary: How to Deploy Node Monitoring Agents with DaemonSets

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes DaemonSets, Services, RBAC, probes, hostPath volumes, host networking, and tolerations
- Prometheus Node Exporter
- Prometheus Operator ServiceMonitor
- cAdvisor
- Datadog Agent for Kubernetes
- New Relic Kubernetes integration
- Python psutil
- Prometheus Python client
- Prometheus alerting rules

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes DaemonSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/daemon-set-v1/
- Prometheus Node Exporter README: https://github.com/prometheus/node_exporter
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Prometheus Operator API reference for ServiceMonitor: https://prometheus-operator.dev/docs/api-reference/api/
- cAdvisor README and deployment docs: https://github.com/google/cadvisor
- cAdvisor runtime options: https://github.com/google/cadvisor/blob/master/docs/runtime_options.md
- Datadog Kubernetes DaemonSet guide: https://docs.datadoghq.com/containers/guide/kubernetes_daemonset/
- Datadog Kubernetes configuration reference: https://docs.datadoghq.com/containers/kubernetes/configuration/
- New Relic Kubernetes installation docs: https://docs.newrelic.com/install/kubernetes/
- New Relic Kubernetes integration components: https://docs.newrelic.com/docs/kubernetes-pixie/kubernetes-integration/get-started/kubernetes-components/
- psutil documentation: https://psutil.readthedocs.io/stable/
- Prometheus Python client HTTP docs: https://prometheus.github.io/client_python/exporting/http/

## Issues Found
- The post stated that DaemonSets guarantee exactly one pod on each node. Kubernetes schedules DaemonSet pods on eligible nodes, subject to selectors, affinity, taints, and schedulability, so the wording was corrected to "eligible node."
- The Node Exporter explanation implied `hostPID` directly enables process monitoring. This was clarified to say it shares the host process namespace when process-related collectors need it.
- The cAdvisor example used the old `gcr.io/cadvisor/cadvisor:v0.47.0` image and Docker-only configuration. The example now uses `ghcr.io/google/cadvisor:0.55.1` and removes `--docker_only` and the Docker-specific `/var/lib/docker` mount.
- The Datadog manifest used HTTP probes on port 5555 without setting `DD_HEALTH_PORT`. Added `DD_HEALTH_PORT=5555`, which Datadog documents as required to expose the Agent health check on that port.
- The New Relic example referenced `newrelic/infrastructure-k8s:3.0.0`, a tag that does not exist on Docker Hub, and used a stale hand-written DaemonSet pattern. Replaced it with the official `nri-bundle` Helm install path, which deploys the current Kubernetes integration components.
- The custom Python monitoring agent would have collected container filesystem/proc metrics rather than host metrics. Added host proc/root configuration in the Python code and corresponding DaemonSet host mounts and environment variables.

## Review Notes
- All edited Python and YAML fenced code blocks were parsed locally after the changes.
- Prometheus Node Exporter version `v1.7.0` is not current, but the flags used in the example remain valid. A future content refresh could pin a newer Node Exporter release.
