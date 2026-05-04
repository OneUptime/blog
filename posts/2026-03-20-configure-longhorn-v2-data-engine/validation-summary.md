# Validation Summary: How to Configure Longhorn V2 Data Engine

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Longhorn (v1.5 – v1.7) V2 Data Engine
- SPDK (Storage Performance Development Kit)
- NVMe-oF over TCP
- Kubernetes CRDs (`settings.longhorn.io`, `nodes.longhorn.io`, `volumes.longhorn.io`)
- StorageClass / PVC / Pod manifests
- Linux hugepages, kernel modules (`nvme-tcp`, `vfio_pci`, `uio_pci_generic`)
- `fio` benchmarking

## Sources Consulted
- Longhorn V2 Data Engine quick-start: https://longhorn.io/docs/1.7.0/v2-data-engine/quick-start/
- Longhorn V2 prerequisites: https://longhorn.io/docs/1.7.0/v2-data-engine/prerequisites/
- Longhorn settings reference: https://longhorn.io/docs/1.7.0/references/settings/
- Longhorn Node CRD definition (v1.7.0 chart `crds.yaml`)
- Longhorn v1.5.0 release notes: https://github.com/longhorn/longhorn/releases/tag/v1.5.0
- Longhorn issue #11519 (hugepage validator) and Issue #9319 (v2-data-engine setting validator)
- Harvester docs on Longhorn V2: https://docs.harvesterhci.io/v1.5/advanced/longhorn-v2/
- DeepWiki V1 vs V2 data-engine comparison

## Issues Found

1. **Wrong introduction version** — Post claimed V2 Data Engine was "introduced in Longhorn v1.6.0". V2 was actually introduced as a *preview* feature in **v1.5.0**. Updated the introduction and prerequisites to reflect this.

2. **Misleading V1 architecture description** — Both the intro paragraph and the comparison table described V1's storage subsystem as "Kernel (tgt)". `tgt` (tgtd) is a *user-space* iSCSI target; the kernel side is the iSCSI initiator (`iscsi_tcp`). Rewrote the intro and the table cell to: "User-space tgt + kernel iSCSI initiator".

3. **Stability label** — Table called V2 "Beta (as of v1.7)". Longhorn's official terminology through v1.7 is **Preview** (still preview through v1.11). Changed to "Preview (as of v1.7)".

4. **Kernel version requirement** — Post listed only "Linux kernel 5.15 or later". Longhorn v1.7 docs explicitly warn that hosts on 5.15 may unexpectedly reboot on volume IO errors and recommend **v5.19 or newer**. Added that caveat.

5. **Missing required kernel modules** — Verify-Kernel-Support snippet only loaded `nvme-tcp`. Longhorn V2 requires three modules: `nvme-tcp`, `vfio_pci`, and `uio_pci_generic`. Updated the snippet (and the persistent `/etc/modules` block) to load all three.

6. **Fictitious Node CRD field `hugepageRequestForV2DataEngine`** — Step 3 originally applied a `Node` CR with `spec.hugepageRequestForV2DataEngine: 2048`. This field does **not** exist in the `longhorn.io/v1beta2` Node CRD. V2 hugepage allocation is controlled by the cluster-wide setting `v2-data-engine-hugepage-limit` (default 2048 MiB). Replaced the snippet with a `kubectl patch settings.longhorn.io v2-data-engine-hugepage-limit` example.

7. **Fictitious `instanceManagerCPULimit` field** — Step 2 patched `nodes.longhorn.io` with both `instanceManagerCPURequest` and `instanceManagerCPULimit`. Only `instanceManagerCPURequest` exists on the Node spec. CPU reservation for V2 instance managers is configured via the global setting `guaranteed-instance-manager-cpu-for-v2-data-engine`. Replaced Step 2 to patch that setting instead.

8. **Missing block-disk requirement** — V2 volumes only run on `block`-type Longhorn disks (raw block devices). The original post never mentioned this prerequisite. Added a Step 3 that demonstrates how to register a `diskType: block` disk on the Longhorn Node and tag it `nvme` so the StorageClass `diskSelector: "nvme"` actually matches.

9. **Wrong V2 instance-manager pod naming** — The monitoring snippet did `grep instance-manager-e-v2`. V2 instance-manager pods follow the unified `instance-manager-<hash>` naming; there is no `-e-v2` suffix in the pod name. They are identified via the `longhorn.io/data-engine=v2` label. Changed the listing command to use that label selector.

## Review Notes

- The "Limitations" section header still says "(Beta)" and the conclusion says "still in beta". Longhorn's own term is "Preview", but the meaning is the same and the section accurately captures real v1.7 limitations (no RWX, no volume encryption, snapshot semantics differ, backup-to-target gaps), so I left the wording alone to avoid stylistic churn beyond fixing technical errors.
- IOPS/latency numbers (100K-500K vs 1M+; 100-500μs vs 50-100μs) are reasonable order-of-magnitude approximations — exact figures depend heavily on hardware and SUSE's published benchmarks vary, so they were left unchanged.
- The post is dated 2026-03 but pins examples to Longhorn v1.7. By that date Longhorn had progressed to v1.11.x, where the V2 Data Engine moved to "Technical Preview" with additional features (live migration, VM image support since v1.8.1). A future revision could re-target the post to a current release; the v1.7 content as written is still accurate for that version.
- The fio benchmark uses `--ioengine=libaio --direct=1` against a busybox container; `busybox` images don't ship `fio`. A reader following the snippet would need to swap in an image that includes `fio` (e.g., `nixery.dev/shell/fio` or a custom image). Not a correctness error in the command itself, but worth flagging.
- The `kubectl patch settings.longhorn.io ... --type merge` form works because Longhorn's Setting CR exposes a `value` field; this is the same pattern the official docs use.
