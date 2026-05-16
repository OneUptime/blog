# Validation Summary: How to Pre-Pull Container Images on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl`, static pods)
- Kubernetes (DaemonSet, Job, CronJob, Deployment, Pod, init containers, podAntiAffinity, tolerations)
- kubelet image garbage collection (`imageGCHighThresholdPercent`, `imageGCLowThresholdPercent`, `imageMinimumGCAge`)
- Eclipse Kubernetes Image Puller (`quay.io/eclipse/kubernetes-image-puller`)
- `registry.k8s.io/pause` sandbox image
- kubectl (`apply`, `rollout status`, `set image`, `delete`)

## Sources Consulted
- Talos v1.7 CLI Reference — https://www.talos.dev/v1.7/reference/cli/
- Talos v1.7 Configuration Reference (`machine.pods`, `machine.kubelet.extraConfig`) — https://www.talos.dev/v1.7/reference/configuration/v1alpha1/config/
- Kubernetes Well-Known Labels, Annotations and Taints — https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Jobs documentation — https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubelet Config API (v1beta1) — https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- che-incubator/kubernetes-image-puller repository — https://github.com/che-incubator/kubernetes-image-puller
- registry.k8s.io pause image — https://kubernetes.io/blog/2022/11/28/registry-k8s-io-faster-cheaper-ga/

## Issues Found
1. **`talosctl images` command is incorrect** — The post used `talosctl images --nodes 10.0.0.5` (twice) to list images cached on a node's CRI. In current Talos versions (1.5+), the correct subcommand is `talosctl image list`. The unprefixed `talosctl images` either does not exist or refers to a different concept (`talosctl image default` is what lists default Talos system images, not CRI cache contents). Updated both occurrences in the "Verifying Pre-Pulled Images" section to `talosctl image list --nodes 10.0.0.5`.

2. **Deprecated `job-name` label in podAntiAffinity** — Strategy 2 (Job-Based Pre-Puller) used `matchLabels: job-name: prepull-new-version`. Since Kubernetes 1.27, the unprefixed `job-name` label has been deprecated in favor of the standard `batch.kubernetes.io/job-name`. Updated the label selector to use `batch.kubernetes.io/job-name` for correctness on modern (1.27+) clusters.

## Review Notes
- The init-container pre-pull pattern relies on the image containing a shell (`sh`). For distroless or scratch-based images this `command: ["sh", "-c", "..."]` form will not work; a no-op command compatible with the specific image would be required. This is not an error in the post (its example images all ship a shell), but readers adapting it to distroless workloads should be aware.
- Strategy 4's Kubernetes Image Puller example uses the `:latest` tag and omits RBAC/ConfigMap details that a full deployment may need. The env-var configuration shown is valid, but pinning to a specific image tag is generally recommended for production.
- `registry.k8s.io/pause:3.9` is valid; newer Kubernetes releases ship `3.10` as the default sandbox image, but `3.9` remains published and functional.
- The Talos `machine.kubelet.extraConfig` keys (`imageGCHighThresholdPercent`, `imageGCLowThresholdPercent`, `imageMinimumGCAge`) are valid kubelet KubeletConfiguration fields and the duration string `"2m"` parses correctly.
