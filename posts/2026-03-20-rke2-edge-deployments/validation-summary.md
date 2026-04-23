# Validation Summary: How to Configure RKE2 for Edge Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- kubelet configuration
- etcd
- containerd / ctr
- RKE2 private registries
- Rancher Local Path Provisioner
- Traefik Ingress Controller
- OpenTelemetry Collector
- OneUptime
- systemd

## Sources Consulted
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Air-Gap Install: https://docs.rke2.io/install/airgap
- RKE2 Import Images: https://docs.rke2.io/add-ons/import-images
- RKE2 CLI Tools: https://docs.rke2.io/reference/cli_tools
- RKE2 Private Registry Configuration: https://docs.rke2.io/install/private_registry
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- Kubernetes Kubelet Configuration API: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet
- Kubernetes labels and topology labels: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes node labels and node roles: https://kubernetes.io/docs/concepts/architecture/nodes/
- etcd configuration options: https://etcd.io/docs/v3.6/op-guide/configuration/
- Rancher Local Path Provisioner README: https://github.com/rancher/local-path-provisioner
- Traefik Kubernetes Ingress provider documentation: https://v2.doc.traefik.io/traefik/providers/kubernetes-ingress/
- Traefik Kubernetes Ingress routing/RBAC documentation: https://v2.doc.traefik.io/traefik/reference/routing-configuration/kubernetes/ingress/
- OneUptime Kubernetes observability page: https://oneuptime.com/product/kubernetes
- OneUptime OpenTelemetry Collector guide: https://oneuptime.com/blog/post/2026-02-20-kubernetes-opentelemetry-collector/view

## Issues Found
- The introduction described RKE2 as having a "lightweight footprint." Revised this to "configurable packaged components," which is more accurate for RKE2 than implying it is lightweight like K3s.
- The kubelet tuning example used direct kubelet flags that Kubernetes now marks deprecated in favor of the kubelet config file. Replaced it with an RKE2 v1.32+ kubelet config drop-in using `KubeletConfiguration`, and added `mergeDefaultEvictionSettings: true` so omitted eviction thresholds keep their defaults.
- The `ctr images import` command omitted RKE2's containerd socket. Added `--address /run/k3s/containerd/containerd.sock` and `--namespace k8s.io`, matching RKE2's bundled `ctr` usage.
- The private registry example configured an HTTP registry endpoint but also set TLS `insecure_skip_verify`, which only applies to TLS registry connections. Removed the TLS block and added an RKE2 restart after changing `registries.yaml`.
- The local storage section incorrectly stated that the local path provisioner is enabled by default in RKE2. Added installation of Rancher's Local Path Provisioner before creating the `rancher.io/local-path` StorageClass.
- The Traefik DaemonSet example lacked the RBAC and service account Traefik needs to watch Kubernetes Ingress resources. Added the required ServiceAccount, ClusterRole, and ClusterRoleBinding, updated the provider flag to `--providers.kubernetesingress=true`, added current control-plane tolerations, and updated the image from `traefik:v2.10` to `traefik:v3.2`.
- The OneUptime section used `https://oneuptime.com/k8s-agent/install.yaml`, which does not exist. Replaced it with an OpenTelemetry Collector token secret and the OneUptime OTLP exporter configuration shown in OneUptime's current Kubernetes/OpenTelemetry guidance.

## Review Notes
- RKE2's install script already configures the systemd service to restart after reboots or process crashes, so the systemd override is optional if operators only want the default restart behavior.
- Flannel is a valid RKE2 CNI option in current RKE2 releases, but older RKE2 releases before the February 2024 release line do not support it.
- For true air-gapped edge sites, remote `kubectl apply -f https://...` manifests should be downloaded and transferred to the site alongside the application images.
