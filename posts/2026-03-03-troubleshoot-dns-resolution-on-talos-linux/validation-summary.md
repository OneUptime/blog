# Validation Summary: How to Troubleshoot DNS Resolution on Talos Linux

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Talos Linux
- Kubernetes DNS
- CoreDNS
- kubectl
- talosctl
- Kubernetes NetworkPolicy
- Prometheus metrics

## Sources Consulted
- Kubernetes: Debugging DNS Resolution: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes: DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes: Endpoints API deprecation in v1.33: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes: kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Talos Linux: talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux: Host DNS: https://docs.siderolabs.com/talos/v1.12/networking/host-dns
- CoreDNS forward plugin: https://coredns.io/plugins/forward/
- CoreDNS prometheus plugin: https://coredns.io/plugins/metrics/
- CoreDNS loop plugin: https://coredns.io/plugins/loop/

## Issues Found
- Replaced `kubectl get endpoints kube-dns -n kube-system` with `kubectl get endpointslice -n kube-system -l kubernetes.io/service-name=kube-dns` because Kubernetes v1.33 deprecates the v1 Endpoints API and the official DNS debugging docs now use EndpointSlice.
- Replaced the nonexistent `talosctl dns resolve` command with `talosctl get resolvers` and `talosctl get dnsupstream`, which are the documented Talos commands for inspecting host DNS upstream configuration and health.
- Updated the CoreDNS forward metric from deprecated `coredns_forward_request_duration_seconds` to `coredns_proxy_request_duration_seconds{proxy_name="forward", ...}`.
- Tightened the CoreDNS loop explanation to match the CoreDNS loop plugin documentation: loops commonly come from local resolver addresses in `/etc/resolv.conf` or upstreams that route back to CoreDNS.
- Clarified that nodes, not pods themselves, pull images from registries.
- Narrowed the example DNS egress NetworkPolicy to CoreDNS pods in `kube-system` by adding a `podSelector` for `k8s-app: kube-dns`.

## Review Notes
The examples assume the conventional `kube-dns` service name, `k8s-app=kube-dns` label, and `10.96.0.10` cluster DNS service IP. These are common defaults, but operators should confirm them in clusters with customized service CIDRs or DNS add-on labels.
