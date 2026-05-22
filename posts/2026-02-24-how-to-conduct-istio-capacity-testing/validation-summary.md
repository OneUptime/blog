# Validation Summary: How to Conduct Istio Capacity Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar mode and control plane metrics
- Kubernetes Deployments, Services, namespaces, labels, rollout restarts, exec, wait, scale, and top
- Fortio load testing
- Prometheus and PromQL
- Envoy proxy statistics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio querying metrics with Prometheus: https://istio.io/latest/docs/tasks/observability/metrics/querying-metrics/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio command and metric reference for `pilot_xds_push_time`: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes `kubectl top pod` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Fortio usage documentation: https://fortio.github.io/fortio-website/docs/getting-started/usage
- Fortio project documentation: https://github.com/fortio/fortio

## Issues Found
- The workload manifests used `namespace: test` but did not create the `test` namespace first. Added an idempotent `kubectl create namespace test --dry-run=client -o yaml | kubectl apply -f -` command before applying namespaced resources.
- The topology example claimed to create a service chain, but the manifests only create independent Fortio server services and do not configure forwarding between them. Updated the wording and comment to describe a multi-service topology instead of a multi-hop chain.
- The Istio request PromQL examples filtered on `namespace="test"`, which is not one of Istio's standard service metric dimensions. Updated the request success rate and P99 latency queries to filter on `destination_service_namespace="test"`.
- The CPU throttling troubleshooting command tried to find cgroup throttling data in Envoy admin stats. Replaced it with a cgroup `cpu.stat` check from inside the sidecar container.
- The Envoy statistics command used direct `curl` against the admin port. Updated it to use Istio's documented `pilot-agent request GET stats` pattern.

## Review Notes
- The examples use `fortio/fortio:latest`, which is valid but not ideal for reproducible performance testing. Pinning a Fortio image tag would make future test runs easier to compare.
- The sidecar injection examples use the standard `istio-injection=enabled` namespace label, which remains valid for sidecar mode. Clusters using revisioned control planes may prefer `istio.io/rev=<revision>`.
- Envoy `upstream_cx_*` stats may require stats inclusion configuration in some Istio installations because Istio records a reduced default Envoy statistic set.
