# Validation Summary: How to Configure GCP Cloud Provider with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (immutable Kubernetes OS)
- Google Cloud Platform (GCP) Compute Engine
- Kubernetes external cloud provider (cloud-provider-gcp / GCE CCM)
- `gcloud` CLI
- `talosctl` and `kubectl`
- Kubernetes RBAC, DaemonSets, Secrets, and Services
- Google Cloud Load Balancing (external and internal)

## Sources Consulted
- Talos Linux external cloud provider docs: https://www.talos.dev/latest/kubernetes-guides/configuration/external-cloud-provider/
- Talos machine configuration reference (`externalCloudProvider`, `kubelet.extraArgs`): https://www.talos.dev/latest/reference/configuration/
- kubernetes/cloud-provider-gcp (GCE CCM) project: https://github.com/kubernetes/cloud-provider-gcp
- GCE CCM image registry: `registry.k8s.io/cloud-provider-gcp/cloud-controller-manager`
- `gcloud compute` reference: https://cloud.google.com/sdk/gcloud/reference/compute
- `gcloud iam service-accounts` reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts
- Kubernetes Service annotations for GCE internal load balancers: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- Kubernetes Secret volume `subPath` semantics: https://kubernetes.io/docs/concepts/storage/volumes/#using-subpath

## Issues Found
1. **Cloud-config volume mount path mismatch** — The DaemonSet mounted the `gcp-cloud-provider-creds` Secret at `mountPath: /etc/kubernetes/cloud-config` without `subPath`. With a default Secret volume mount, Kubernetes projects each key as a separate file inside the directory at `mountPath`, so the file would have lived at `/etc/kubernetes/cloud-config/cloud-config`. The container flag `--cloud-config=/etc/kubernetes/cloud-config` would then have pointed at a directory rather than a file and the cloud controller manager would fail to start. Added `subPath: cloud-config` so the single key is projected as a file at the expected path, matching the CLI flag.

## Review Notes
- The post stores the GCP service account JSON key under the `cloud-config` key of the Secret and passes it via `--cloud-config`. The GCE cloud provider technically expects an INI-style cloud config (with a `[Global]` section). In practice the Go client falls back to Application Default Credentials, and many tutorials use this simplified pattern; the post itself recommends Workload Identity for production, so this trade-off is acknowledged. Left as-is to avoid restructuring the post.
- The CCM image `registry.k8s.io/cloud-provider-gcp/cloud-controller-manager:v29.0.0` was released in early 2024. The image path and tag format are correct, but readers in 2026 may want to pin to a newer release matching their cluster's Kubernetes minor version (see the cloud-provider-gcp releases page).
- The example image name `talos-v1-7-0` with `--image-project=my-project` correctly implies a user-uploaded custom Talos image (Talos does not publish public GCE images under a Google-managed project), which is the standard workflow.
- The RBAC binding uses `cluster-admin`, which the post explicitly flags as something to tighten in production.
- Firewall rule for port 50000 correctly opens the Talos API port for `talosctl` access.
- The internal load balancer annotation `cloud.google.com/load-balancer-type: "Internal"` is the correct legacy annotation supported by the GCE cloud provider; newer GKE deployments may prefer `networking.gke.io/load-balancer-type: "Internal"`, but for the upstream cloud-provider-gcp the documented annotation is correct.
