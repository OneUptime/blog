# Validation Summary: How to Implement Auto-Scaling Policies on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes (HPA `autoscaling/v2`, VPA `autoscaling.k8s.io/v1`)
- metrics-server
- Vertical Pod Autoscaler (kubernetes/autoscaler)
- Cluster Autoscaler (Helm chart from kubernetes/autoscaler)
- Prometheus Adapter (custom/external metrics)
- KEDA (`keda.sh/v1alpha1`, RabbitMQ scaler)
- Helm

## Sources Consulted
- Kubernetes HPA documentation — https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- VPA installation guide — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/installation.md
- kubernetes/autoscaler releases page — https://github.com/kubernetes/autoscaler/releases (verified by `curl` that the YAML asset URLs the post used return 404)
- Sidero Labs (Talos) metrics-server guide — https://docs.siderolabs.com/kubernetes-guides/monitoring-and-observability/deploy-metrics-server
- KEDA RabbitMQ scaler docs — https://keda.sh/docs/2.13/scalers/rabbitmq-queue/
- metrics-server documentation — https://kubernetes-sigs.github.io/metrics-server/

## Issues Found
1. **VPA installation URLs were fabricated (404).** The post pointed at `https://github.com/kubernetes/autoscaler/releases/latest/download/vpa-v1-crd-gen.yaml` (and four similar files). I verified each URL returns 404 — the autoscaler repo does not publish those YAMLs as release assets. Replaced with the official method documented in `vertical-pod-autoscaler/docs/installation.md`: clone the repo and run `./hack/vpa-up.sh`, which installs the CRDs, RBAC, and the three Deployments.

2. **Incorrect claim that metrics-server "works out of the box" on Talos.** Talos's kubelet uses a self-signed serving certificate that metrics-server will not trust by default. Per Sidero Labs' own documentation, you must either enable kubelet certificate rotation together with the Kubelet Serving Certificate Approver, or pass `--kubelet-insecure-tls`. Rewrote that paragraph to reflect this.

3. **Missing `helm repo add` for the cluster-autoscaler chart.** The post called `helm install ... autoscaler/cluster-autoscaler` without ever adding the `autoscaler` repo. Added `helm repo add autoscaler https://kubernetes.github.io/autoscaler && helm repo update` before the install command.

4. **KEDA RabbitMQ trigger mixed a deprecated field with the new schema.** The trigger declared both `mode: "QueueLength"` and the deprecated `queueLength: "10"`. Per current KEDA docs, the modern schema uses `mode` + `value` (the legacy `queueLength` field is deprecated). Replaced `queueLength: "10"` with `value: "10"`.

## Review Notes
- The HPA examples (`autoscaling/v2`, `behavior.scaleUp` / `behavior.scaleDown` with `stabilizationWindowSeconds`, `policies`, and `selectPolicy`) match the current stable API.
- The VPA manifest fields (`updatePolicy.updateMode: Auto`, `updatePolicy.minReplicas`, `resourcePolicy.containerPolicies[].controlledResources` / `controlledValues: RequestsAndLimits` / `minAllowed` / `maxAllowed`) are all valid for `autoscaling.k8s.io/v1`.
- All Cluster Autoscaler `extraArgs` flag names (`scale-down-delay-after-add`, `scale-down-unneeded-time`, `scale-down-utilization-threshold`, `max-node-provision-time`, `balance-similar-node-groups`, `expendable-pods-priority-cutoff`, `skip-nodes-with-local-storage`, `scan-interval`) match the upstream Cluster Autoscaler CLI.
- The Cluster Autoscaler `image.tag: "v1.29.0"` will become outdated; readers should align the tag with their cluster's Kubernetes minor version.
- The Prometheus Adapter rules use the documented `seriesQuery` / `resources.overrides` / `name.matches`/`as` / `metricsQuery` shape and look correct.
- The post's note that VPA and HPA should not target the same metric on the same workload is correct guidance.
