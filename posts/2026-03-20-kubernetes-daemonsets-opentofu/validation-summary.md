# Validation Summary: How to Create Kubernetes DaemonSets with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- DaemonSet
- OpenTofu
- HashiCorp Kubernetes provider
- Fluentd
- NVIDIA Kubernetes device plugin
- Google Kubernetes Engine (GKE)

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- HashiCorp Kubernetes provider documentation for `kubernetes_daemon_set_v1`: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/daemon_set_v1.md
- Fluentd Kubernetes deployment documentation: https://docs.fluentd.org/container-deployment/kubernetes
- Fluentd CloudWatch DaemonSet example: https://raw.githubusercontent.com/fluent/fluentd-kubernetes-daemonset/master/fluentd-daemonset-cloudwatch-rbac.yaml
- Fluentd Kubernetes daemonset image tags: https://raw.githubusercontent.com/fluent/fluentd-kubernetes-daemonset/master/README.md
- NVIDIA Kubernetes device plugin repository: https://github.com/NVIDIA/k8s-device-plugin
- NVIDIA static DaemonSet manifest: https://raw.githubusercontent.com/NVIDIA/k8s-device-plugin/main/deployments/static/nvidia-device-plugin.yml
- GKE GPU node selector documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/gpus

## Issues Found
- The OpenTofu example used `update_strategy`, but the current `kubernetes_daemon_set_v1` resource schema uses `spec.strategy`. I changed the block name so the resource matches the provider documentation.
- The Fluentd DaemonSet toleration omitted `operator = "Exists"`, which is the documented form for tolerating the control plane taint. I added the operator and updated the comment to refer to control plane nodes.
- The Fluentd example referenced an undefined service account resource, so the snippet was not self-contained. I removed that reference.
- The Fluentd example used a Docker-specific host log path and a non-current environment variable name. I updated the example to use `K8S_NODE_NAME`, a current documented Fluentd image tag, and `/var/log/pods` instead of `/var/lib/docker/containers`.
- The NVIDIA device plugin example was incomplete because it did not mount `/var/lib/kubelet/device-plugins`, which the plugin needs to register with kubelet. I added the required `volume_mount` and `host_path` volume.
- The NVIDIA node selector example used a GKE-specific label but described it generically. I clarified that the selector targets GKE nodes with NVIDIA T4 GPUs.
- The summary claimed rolling updates provided zero-downtime deployments. I changed that wording to say rolling updates limit disruption, which is what the documented `max_unavailable` behavior actually guarantees.

## Review Notes
- The GPU node selector example is now explicitly GKE-specific. Other Kubernetes environments need different node labels.
- The image tags are pinned to versions that are documented upstream at review time. They should be rechecked against upstream releases before production use.
