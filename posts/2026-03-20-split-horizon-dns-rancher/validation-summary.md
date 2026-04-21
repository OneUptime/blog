# Validation Summary: How to Set Up Split-Horizon DNS in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher-managed Kubernetes clusters
- RKE2 / K3s cluster DNS
- Kubernetes CoreDNS
- CoreDNS `kubernetes`, `forward`, `cache`, `reload`, and `prometheus` plugins
- Kubernetes NetworkPolicy
- kubectl
- Prometheus Operator `PrometheusRule`

## Sources Consulted
- RKE2 Networking Services documentation for CoreDNS deployment and configuration behavior: https://docs.rke2.io/networking/networking_services
- RKE2 Helm add-ons documentation for packaged component management with `HelmChartConfig`: https://docs.rke2.io/add-ons/helm
- Kubernetes Customizing DNS Service documentation for CoreDNS ConfigMap structure and stub-domain forwarding: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes DNS for Services and Pods documentation for cluster DNS behavior: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- CoreDNS manual for Corefile server blocks and plugin behavior: https://coredns.io/manual/toc/
- CoreDNS `kubernetes` plugin documentation: https://coredns.io/plugins/kubernetes/
- CoreDNS `forward` plugin documentation, including current metrics and deprecated metric names: https://coredns.io/plugins/forward/
- CoreDNS `prometheus` plugin documentation for metrics names and endpoint behavior: https://coredns.io/plugins/metrics/
- Kubernetes generated `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes generated `kubectl rollout restart` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/
- SUSE product lifecycle information for supported Rancher version caveats: https://www.suse.com/lifecycle/

## Issues Found
- The original post described split-horizon DNS as a generic CNI/networking feature. It is implemented through the cluster DNS provider, usually CoreDNS, so the architecture and prerequisites were corrected.
- The original CNI ConfigMap used a placeholder plugin type (`main-cni-plugin`) and would not configure split-horizon DNS. It was replaced with a valid CoreDNS Corefile example using `forward corp.example.com 10.0.0.53 10.0.0.54` before the default upstream forwarder, plus safer instructions to edit a copy of the live ConfigMap.
- The original verification commands checked kube-proxy mode, CNI files, and PodCIDR values, which do not validate split-horizon DNS. They were replaced with commands that inspect the `kube-dns` Service, CoreDNS pods, and the CoreDNS Corefile.
- The original NetworkPolicy allowed unrelated web/database traffic. It was replaced with a DNS egress policy allowing selected workloads to reach CoreDNS on TCP and UDP port 53.
- The original test commands focused on pod networking. They were replaced with DNS resolution tests for the internal zone, Kubernetes service DNS, and normal external DNS.
- The original monitoring commands used `netstat` and an invalid Calico status command for this topic. They were replaced with CoreDNS logs and Prometheus metrics checks.
- The original Prometheus alerts used unrelated network probe and node interface metrics. They were replaced with CoreDNS forward-plugin alert rules using current metric names from the CoreDNS documentation.
- The troubleshooting section originally inspected CNI logs and Calico state. It was updated to inspect CoreDNS logs, test the upstream resolver directly, test resolution through CoreDNS, and restore the backed-up ConfigMap if needed.
- The original `Rancher v2.7+` prerequisite was too broad for production use in 2026 because it includes older Rancher versions outside current support windows. It now asks for currently supported Rancher/RKE2/K3s/downstream Kubernetes versions.

## Review Notes
The YAML snippets were parsed successfully with PyYAML. `kubectl` is not installed in this review environment, so command syntax was verified against the official generated kubectl documentation instead of local `kubectl --help`. CoreDNS pod labels and Prometheus rule selectors can vary by Rancher/RKE2/monitoring installation, so the post now tells readers to confirm labels and add required Prometheus selector labels before applying the examples.
