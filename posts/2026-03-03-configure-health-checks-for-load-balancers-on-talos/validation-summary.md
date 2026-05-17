# Validation Summary: How to Configure Health Checks for Load Balancers on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (`talosctl health`, `talosctl service`)
- Kubernetes probes (readiness, liveness, startup; HTTP, TCP, exec, gRPC)
- Python Flask (sample health endpoint with psycopg2 / redis)
- MetalLB (speaker pod inspection)
- HAProxy (tcp-check, httpchk, default-server, agent-check)
- NGINX Ingress (ingress-nginx community controller)
- Prometheus / kube-state-metrics (PrometheusRule alerts)

## Sources Consulted
- Kubernetes probes reference: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- gRPC probe (GA in Kubernetes 1.27): https://kubernetes.io/blog/2022/05/13/grpc-probes-now-in-beta/
- ingress-nginx annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- kube-state-metrics endpoint metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/service/endpoint-metrics.md
- kube-state-metrics pod metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics CHANGELOG (v2.14.0 removed deprecated endpoint metrics): https://github.com/kubernetes/kube-state-metrics/blob/main/CHANGELOG.md
- MetalLB documentation: https://metallb.universe.tf/
- HAProxy configuration manual (2.x): https://docs.haproxy.org/2.8/configuration.html
- Talos `talosctl` reference: https://www.talos.dev/latest/reference/cli/

## Issues Found

1. **Invalid NGINX Ingress annotations.** The post used `nginx.ingress.kubernetes.io/health-check-path`, `nginx.ingress.kubernetes.io/health-check-interval`, and `nginx.ingress.kubernetes.io/health-check-timeout`. These annotations do not exist in the community `kubernetes/ingress-nginx` controller — active upstream health checking is an NGINX Plus feature exposed by the separate `nginxinc/kubernetes-ingress` controller. Replaced the snippet with annotations that *are* supported by the community controller (`proxy-connect-timeout`, `proxy-read-timeout`, `proxy-send-timeout`, `proxy-next-upstream`, `proxy-next-upstream-tries`) and rewrote the intro sentence to clarify that the community controller relies on Kubernetes readiness probes for endpoint health, with these annotations tuning how it reacts to upstream errors.

2. **Removed kube-state-metrics metrics.** The PrometheusRule used `kube_endpoint_address_not_ready` and `kube_endpoint_address_available`. Both were deprecated in 2022 and fully removed in kube-state-metrics v2.14.0 (2024-11-08). Replaced them with the current `kube_endpoint_address` metric and its `ready` label:
   - `kube_endpoint_address_not_ready > 0` → `kube_endpoint_address{ready="false"} == 1`
   - `kube_endpoint_address_available == 0` → `count by (namespace, endpoint) (kube_endpoint_address{ready="true"}) == 0`

## Review Notes

- The HAProxy `option httpchk GET /healthz HTTP/1.1\r\nHost:\ health.local` line uses the older single-line syntax, which still works in HAProxy 2.x but is being phased out in favor of `http-check send meth GET uri /healthz hdr Host health.local`. Left as-is since both forms are valid in current releases.
- The `kube_pod_status_ready{condition="true"}` metric used in the `PodReadinessFlapping` alert is current and stable in kube-state-metrics v2.x.
- The gRPC probe (`grpc:` field on a probe) is GA as of Kubernetes 1.27, so the example is valid on any reasonably recent Talos release.
- MetalLB speaker label selector `app.kubernetes.io/component=speaker` matches the labels set by the official Helm chart and manifests.
- The Talos health-check shell script depends on parsing `talosctl service` output, which is somewhat fragile across releases, but the underlying commands (`talosctl health`, `talosctl service kubelet|etcd`) are correct.
