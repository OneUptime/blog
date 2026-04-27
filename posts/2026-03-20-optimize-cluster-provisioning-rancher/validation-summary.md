# Validation Summary: How to Optimize Cluster Provisioning Speed in Rancher

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Rancher (manager / CAPR provisioning)
- RKE2
- Kubernetes
- AWS EC2 (rancher-machine `amazonec2Config` driver)
- etcd (snapshots)
- Linux sysctls and kernel modules (`br_netfilter`, `overlay`)

## Sources Consulted
- RKE2 server config reference: https://docs.rke2.io/reference/server_config
- RKE2 airgap install guide: https://docs.rke2.io/install/airgap
- Rancher RKE2 cluster configuration reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher Amazon EC2 machine configuration: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/downstream-cluster-configuration/machine-configuration/amazon-ec2
- Rancher source — `pkg/controllers/capr/machineprovision` (machine provisioning runs as Kubernetes Jobs, no `PER_MINUTE` env var exists)
- Rancher GitHub issues #22898 and #31589 (gp3 throughput field is not exposed in the EC2 driver)
- libvirt wiki on `net.bridge.bridge-nf-call-iptables` requiring `br_netfilter`: https://wiki.libvirt.org/Net.bridge.bridge-nf-call_and_sysctl.conf.html

## Issues Found

1. **Step 1 — Pre-pull script was non-functional.**
   The original sequence (`systemctl start rke2-agent`, `rke2 server --cluster-init &`, `rke2-killall.sh`) does not work: `rke2-agent` cannot start without prior config, and starting both server and agent on the same base node is not the documented way to pre-load images. Replaced with the canonical RKE2 airgap pattern — drop `rke2-images.linux-amd64.tar.zst` into `/var/lib/rancher/rke2/agent/images/` and/or run the airgap installer with `INSTALL_RKE2_ARTIFACT_PATH`.

2. **Step 2 — `throughput` field is not supported by the rancher-machine EC2 driver.**
   gp3 throughput exposure has been an outstanding upstream gap (rancher/rancher#22898, #31589). Removed the `throughput: "125"` line.

3. **Step 2 — `userdata` schema usage was wrong.**
   `amazonec2-userdata` takes a path to a file, not inline YAML content. Reformatted so `userdata:` references a file path and the bash script lives in a separate fenced block representing that file's contents.

4. **Step 2 — `net.bridge.bridge-nf-call-iptables` sysctl would fail without `br_netfilter`.**
   The sysctl key only exists once the module registers it; without it `sysctl -w` errors with "No such file or directory". Added `modprobe overlay` and `modprobe br_netfilter` ahead of the sysctl calls.

5. **Step 3 — `CATTLE_NEW_NODE_PER_MINUTE` is fabricated.**
   No such environment variable exists in the Rancher source or docs. Provisioning concurrency is governed by Kubernetes Job execution and cloud-provider API rate limits, not a Rancher knob. The claim that "Rancher provisions nodes sequentially by default" is also inaccurate — CAPR creates a Job per machine, so a pool's machines provision concurrently. Replaced the step with accurate guidance: split work across multiple `machinePools` and raise pool `quantity`, with a Cluster v1 example.

6. **Step 5 — etcd snapshot config schema was wrong.**
   The nested `etcd: { snapshot: { schedule, retention } }` form does not exist in any Rancher or RKE2 schema. Replaced with the correct shapes: `spec.rkeConfig.etcd.snapshotScheduleCron` / `snapshotRetention` for the Rancher Cluster v1 CRD, plus the equivalent flat `etcd-snapshot-schedule-cron` / `etcd-snapshot-retention` keys for RKE2's `/etc/rancher/rke2/config.yaml`.

## Review Notes
- Step 4 is descriptive rather than executable (UI clicks in a comment block); left intact since the underlying claim — RKE2 ships a self-contained airgap bundle — is correct.
- Step 6's `kubectl logs -n cattle-system rancher-xxxxx` requires substituting a real pod name; correct as illustrative usage.
- The "5–10 minutes" and "10-node cluster in under 8 minutes" numbers are workload-dependent estimates; left as written since they are presented as targets, not measurements.
- The post predates Rancher's full move to Cluster v2 / CAPI for some legacy workflows; the Cluster v1 (`provisioning.cattle.io/v1`) examples used here remain the supported path for RKE2/K3s downstream clusters as of Rancher 2.9+.
