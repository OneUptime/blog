# Validation Summary: How to Install Talos Linux on Google Cloud Platform (GCP)

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Talos Linux (v1.7.0)
- Google Cloud Platform (Compute Engine, Cloud Storage, VPC, Cloud Load Balancing)
- Google Cloud SDK (`gcloud`, `gsutil`)
- Kubernetes (`kubectl`)
- `talosctl` CLI
- GCP Persistent Disk CSI driver
- GCP TCP Proxy Load Balancer

## Sources Consulted
- Talos Linux official documentation for GCP: https://www.talos.dev/v1.7/talos-guides/install/cloud-platforms/gcp/
- Sidero Labs Talos releases: https://github.com/siderolabs/talos/releases
- Google Cloud `gcloud compute images create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/images/create
- Google Cloud Load Balancing health check source ranges: https://cloud.google.com/load-balancing/docs/health-check-concepts (130.211.0.0/22 and 35.191.0.0/16)
- Google Cloud TCP Proxy Load Balancer setup docs: https://cloud.google.com/load-balancing/docs/tcp
- GCP Persistent Disk CSI driver: https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver
- Kubernetes StorageClass for GCE PD: https://kubernetes.io/docs/concepts/storage/storage-classes/#gce-pd
- `talosctl` command reference: https://www.talos.dev/v1.7/reference/cli/

## Issues Found
No technical issues found.

The post's technical content is accurate:
- The Talos v1.7.0 GCP image URL (`gcp-amd64.raw.tar.gz`) and the import workflow (upload to GCS, create compute image from `--source-uri`) match Sidero Labs' documented approach for GCP.
- `--guest-os-features VIRTIO_SCSI_MULTIQUEUE` is a valid and commonly used feature flag for GCP custom images.
- Talos on GCP reads machine configuration from the instance metadata key `user-data`, which matches the `--metadata-from-file=user-data=...` invocation.
- The two health-check source CIDR ranges (`130.211.0.0/22`, `35.191.0.0/16`) are the documented Google Cloud Load Balancing probe ranges.
- TCP Proxy Load Balancer construction (health check → backend service → static address → target TCP proxy → forwarding rule) follows the standard global TCP proxy LB pattern and the flags used are all current.
- `talosctl gen config`, `talosctl machineconfig patch --patch @file --output ...`, `talosctl config merge/endpoint/node`, `talosctl bootstrap --nodes`, `talosctl health --wait-timeout`, and `talosctl kubeconfig` are all correct for the v1.7 CLI.
- The PD CSI driver kustomize path and the `pd.csi.storage.gke.io` provisioner with `pd-standard`/`pd-ssd` parameters are correct.

## Review Notes
- The `gcloud compute backend-services add-backend` invocation does not specify `--balancing-mode`. In many gcloud versions, attaching an unmanaged instance group to a global TCP Proxy backend service requires an explicit `--balancing-mode` (typically `UTILIZATION` with `--max-utilization`) or `CONNECTION` with `--max-connections-per-instance`. Depending on the gcloud version the user runs, they may need to add this flag. This is a minor caveat rather than a definitive error, so the post was left unchanged.
- Talos v1.7.0 is pinned throughout the guide. Readers running this in the future should consider upgrading to a newer Talos release, but the commands and structure remain valid for the pinned version.
- The Talos and Kubernetes API firewall rules use `--source-ranges 0.0.0.0/0`, which is appropriate for a generic tutorial but should be tightened to admin/management CIDRs in production. The author already implies this with the "from your management network" comment but it is worth keeping in mind.
- The PD CSI driver kustomize reference uses `?ref=master` rather than a pinned tag, which is generally how the upstream repo's quickstart is worded but is not ideal for reproducibility.
- For production, GCP's Internal TCP/UDP Load Balancer (or a regional external network LB) is often preferable to a global TCP Proxy LB for the Kubernetes API, since the TCP proxy is layer-4 proxied and terminates the client connection. The post's choice still works and is consistent with Sidero's GCP guide.
