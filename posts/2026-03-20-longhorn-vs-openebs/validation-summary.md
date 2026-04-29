# Validation Summary: Longhorn vs OpenEBS: Cloud-Native Storage Comparison

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- Longhorn
- OpenEBS
- Kubernetes persistent storage
- Helm
- CSI StorageClasses
- NFS / RWX storage patterns
- LVM
- ZFS
- NVMe-oF / SPDK

## Sources Consulted
- Longhorn install with Helm: https://longhorn.io/docs/latest/deploy/install/install-with-helm/
- Longhorn RWX volumes: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/rwx-volumes/
- Longhorn V2 data engine quick start: https://longhorn.io/docs/latest/v2-data-engine/quick-start/
- Longhorn storage class parameters: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Longhorn CNCF project page: https://www.cncf.io/projects/longhorn/
- Longhorn upstream README: https://github.com/longhorn/longhorn
- OpenEBS installation guide: https://openebs.io/docs/quickstart-guide/installation
- OpenEBS Replicated PV Mayastor storage class creation: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-create-storageclass
- OpenEBS Replicated PV Mayastor storage class parameters: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-storage-class-parameters
- OpenEBS Local PV Hostpath overview: https://openebs.io/docs/user-guides/local-storage-user-guide/local-pv-hostpath/hostpath-overview
- OpenEBS Local PV LVM storage class docs: https://openebs.io/docs/user-guides/local-storage-user-guide/local-pv-lvm/configuration/lvm-create-storageclass
- OpenEBS RWX via NFS on Replicated PV Mayastor: https://openebs.io/docs/Solutioning/read-write-many/nfspvc
- OpenEBS upstream README: https://github.com/openebs/openebs
- OpenEBS CNCF project page: https://www.cncf.io/projects/openebs/

## Issues Found
- The post described OpenEBS using an outdated engine lineup. I updated it to reflect the current OpenEBS 4.x focus on Replicated PV Mayastor plus Local PV Hostpath, LVM, and ZFS, because Jiva is no longer part of the current mainstream OpenEBS 4.x documentation and has been moved to the legacy/archive track.
- The RWX comparison was incorrect. I changed Longhorn from `No` to built-in RWX support via share-manager/NFS, and OpenEBS from `No` to RWX support via NFS backed by Replicated PV Mayastor, because both capabilities are documented officially.
- The OpenEBS UI claim was inaccurate. I removed the `Director` web UI wording and changed the comparison to `No built-in UI`, because current official OpenEBS docs center on Helm, kubectl, plugins, and observability integrations rather than a built-in storage web UI.
- The OpenEBS installation examples were misleading. I replaced the “LVM only” framing with the current official unified-chart behavior and the documented way to disable Replicated PV Mayastor, because the current `openebs/openebs` chart installs multiple engines by default.
- The Mayastor StorageClass example included an extra `ioTimeout` parameter that is not part of the primary current StorageClass examples. I simplified it to the documented `protocol` and `repl` parameters.
- The StorageClass examples did not consistently expose expansion even though the comparison table discussed it as a supported capability. I added `allowVolumeExpansion: true` where the official examples support it.
- The performance section used fixed latency and IOPS-style numbers that are not presented as universal official benchmarks. I replaced them with qualitative, technically safer descriptions tied to documented engine characteristics.
- The overview’s OpenEBS attribution was updated from a current-vendor phrasing to the project’s current CNCF framing, which is more accurate for the current project state.
- The Longhorn NVMe/NVMe-oF row was too absolute. I updated it to reflect that this capability exists in Longhorn’s V2 data engine technical preview rather than saying `No`.

## Review Notes
- Longhorn V2 data engine support is still documented as a technical preview, so production comparisons should distinguish between Longhorn’s default V1 behavior and optional V2 capabilities.
- OpenEBS comparisons are inherently engine-dependent. Features like HA, snapshots, expansion, and RWX differ between Hostpath, LVM, ZFS, and Replicated PV Mayastor.
- Performance claims for Kubernetes storage products are highly environment-specific. Qualitative guidance is safer than fixed latency or IOPS numbers unless a benchmark methodology is included.
