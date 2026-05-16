# Validation Summary: How to Expand the EPHEMERAL Partition in Talos Linux

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Talos Linux (talosctl)
- Kubernetes (kubectl)
- Proxmox VE (qm)
- VMware vSphere (govc)
- AWS EC2 (aws-cli, EBS)
- Azure (az CLI, managed disks)
- Google Cloud (gcloud, persistent disks)
- etcd
- Prometheus / node_exporter
- kubelet configuration

## Sources Consulted
- Sidero Labs Talos upgrade guide: https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Sidero Labs talosctl CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Talos disk management guide: https://www.talos.dev/v1.10/talos-guides/configuration/disk-management/
- Sidero Labs Talos source code (resource/partition definitions on GitHub)
- Proxmox `qm` documentation
- govc command reference
- AWS CLI EC2 modify-volume reference
- Azure CLI `az disk update` reference
- gcloud `compute disks resize` reference
- Kubernetes kubelet configuration reference (imageGC*, containerLogMax*)

## Issues Found
1. **Incorrect description of `talosctl upgrade --preserve`.** The original text claimed `--preserve` "keeps the existing machine configuration" and that without it "you would lose the machine configuration and need to re-apply it." This is wrong. Per the Sidero Labs upgrade documentation, `--preserve` preserves the EPHEMERAL partition data (container images, pod data, logs). The machine configuration lives on the STATE partition and is preserved across upgrades by default, independent of this flag. I rewrote the paragraph to describe what `--preserve` actually does and added a note that Talos still grows the EPHEMERAL partition (via its grow flag) when the underlying disk has been expanded, so the flag does not prevent the expansion that this guide is about.

2. **Self-contradictory warning about EPHEMERAL data.** The "Important Considerations" callout asserted that EPHEMERAL data "is not preserved during repartitioning," which directly contradicted the use of `--preserve` in the example commands and automation script. I reworded it to accurately describe the default behavior (wiped unless `--preserve` is passed) while keeping the original guidance that EPHEMERAL should still be treated as disposable.

## Review Notes
- The cloud-provider disk expansion commands (`qm resize`, `govc vm.disk.change`, `aws ec2 modify-volume`, `az disk update`, `gcloud compute disks resize`) are all syntactically correct.
- `talosctl get mounts`, `talosctl etcd status`, `talosctl etcd alarm list`, `talosctl etcd snapshot`, `talosctl get hostname`, and `talosctl apply-config --insecure` are valid invocations. (`talosctl mounts` without `get` is the more commonly documented form, but the resource form works as well.)
- The kubelet configuration field names (`imageGCHighThresholdPercent`, `imageGCLowThresholdPercent`, `containerLogMaxSize`, `containerLogMaxFiles`) are correct.
- The example `talosctl upgrade` image tag (`ghcr.io/siderolabs/installer:v1.7.0`) is a pinned older version. Readers should substitute their currently running Talos version. Not changed since it is illustrative.
- The Prometheus query `node_filesystem_size_bytes{mountpoint="/var"}` is reasonable for node_exporter; on Talos the EPHEMERAL filesystem is mounted under `/var`, so this works as a sanity check.
- The bare-metal "Option B: Add a Secondary Disk" YAML snippet is a minimal example. In practice users will typically also need to specify a partition `size` and may want a `type` (the schema permits omitting these and letting Talos fill remaining space), but the snippet as written is valid and intentionally minimal.
