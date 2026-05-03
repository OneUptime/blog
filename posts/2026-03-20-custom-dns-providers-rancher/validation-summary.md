# Validation Summary: How to Configure Custom DNS Providers in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CoreDNS (Corefile, plugins: errors, health, ready, kubernetes, forward, hosts, prometheus, cache, loop, reload, loadbalance)
- Kubernetes (ConfigMap, Deployment rollout restart, kubectl)
- Rancher (managed Kubernetes context)
- ExternalDNS (Helm chart, AWS Route53 provider)
- Helm
- Split-horizon DNS / stub zones

## Sources Consulted
- CoreDNS official documentation: https://coredns.io/manual/toc/
- CoreDNS plugins reference: https://coredns.io/plugins/
- CoreDNS `health` plugin (lameduck directive): https://coredns.io/plugins/health/
- CoreDNS `forward` plugin (policy, health_check): https://coredns.io/plugins/forward/
- CoreDNS `hosts` plugin: https://coredns.io/plugins/hosts/
- Kubernetes documentation, "Customizing DNS Service": https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- ExternalDNS Helm chart: https://github.com/kubernetes-sigs/external-dns/tree/master/charts/external-dns
- Rancher docs on cluster DNS / CoreDNS: https://ranchermanager.docs.rancher.com/

## Issues Found
- **Default Corefile typo (Step 1)**: The default Corefile listing contained `health { laiveness }`. The correct CoreDNS `health` plugin sub-directive is `lameduck`, and Kubernetes ships it as `lameduck 5s`. Replaced `laiveness` with `lameduck 5s` to match the actual default Kubernetes Corefile.

## Review Notes
- The `forward` plugin examples (`policy sequential`, `health_check 5s`) are valid per the CoreDNS forward plugin docs (policies are `random`, `round_robin`, `sequential`).
- The `hosts` plugin example mixes a file path (`/etc/coredns/customhosts`) with inline host entries inside the block. Both forms are supported by the plugin; combining them works because inline entries are parsed even when a file is given. This is technically valid.
- The `kubectl logs -n kube-system -l k8s-app=kube-dns -f` selector is correct: CoreDNS pods retain the `k8s-app=kube-dns` label for backwards compatibility.
- The ExternalDNS Helm install command is current; the chart was migrated to the `kubernetes-sigs/external-dns` repo and is published at `https://kubernetes-sigs.github.io/external-dns/` under the chart name `external-dns`. Users will need to add that repo (`helm repo add external-dns https://kubernetes-sigs.github.io/external-dns/`) before the install command succeeds — this is implied but not shown.
- Step 5 uses `infoblox/dnstools` which is a community image; it works for ad-hoc testing but is not officially maintained. `busybox` or `registry.k8s.io/e2e-test-images/jessie-dnsutils` are alternatives.
- The post is generic Kubernetes/CoreDNS guidance framed as Rancher-specific. The configuration applies to any Kubernetes cluster (Rancher-managed or otherwise).
