# Validation Summary: How to Troubleshoot GKE Node NotReady Status Caused by Resource Pressure

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes node conditions and node-pressure eviction
- kubectl
- Google Cloud CLI
- Cloud Monitoring alert policies
- Kubernetes resource requests, limits, LimitRange, ResourceQuota, and PriorityClass
- containerd and crictl

## Sources Consulted
- GKE node NotReady troubleshooting: https://cloud.google.com/kubernetes-engine/docs/troubleshooting/node-notready
- Kubernetes node-pressure eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes resource management for Pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes kubelet configuration reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- GKE containerd node images: https://cloud.google.com/kubernetes-engine/docs/concepts/using-containerd
- GKE node images: https://cloud.google.com/kubernetes-engine/docs/concepts/node-images
- GKE node system configuration: https://cloud.google.com/kubernetes-engine/docs/how-to/node-system-config
- Google Cloud SDK gcloud container node-pools create reference: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Google Cloud SDK gcloud container node-pools update reference: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/update
- Google Cloud SDK gcloud monitoring policies create reference: https://cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- cri-tools crictl documentation: https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md

## Issues Found
- The introduction implied that resource pressure always means the kubelet has stopped reporting and that the node eventually stops accepting pods. Updated the wording to distinguish NotReady from pressure conditions and to explain that Kubernetes prevents scheduling while a node is under pressure or NotReady.
- The `kubectl top pods` example claimed to show pods on the problem node but listed pods across all nodes. Added `--field-selector spec.nodeName=...` so the command matches the text.
- The disk usage command inspected `/var/lib/docker`, which is outdated for current GKE nodes that use containerd. Changed it to inspect `/var/lib/containerd` and `/var/lib/kubelet`.
- The disk eviction threshold sentence stated a single 15% default. Corrected it to the default hard thresholds for `nodefs.available<10%` and `imagefs.available<15%`, and clarified image garbage collection high and low thresholds of 85% and 80%.
- The Cloud Monitoring alert example used invalid flags `--condition-threshold-value` and `--condition-threshold-comparison`. Replaced them with the documented `--if='> 0.85'`, added a condition display name, and set `--combiner=OR`.

## Review Notes
The local environment did not have `kubectl` or `gcloud` installed, so command validation was performed against official Kubernetes and Google Cloud CLI reference documentation. The examples assume a GKE Standard cluster where SSH and node system configuration are available; Autopilot clusters have more managed node access and configuration behavior.
