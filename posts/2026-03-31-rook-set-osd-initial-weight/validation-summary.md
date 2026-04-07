# Validation Summary: How to Set OSD Initial Weight in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CRUSH map, OSD weight, reweight)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl exec into toolbox pod)

## Sources Consulted
- Ceph official documentation on CRUSH map and OSD weight: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph OSD configuration reference (`osd_crush_initial_weight`): https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph CLI reference for `ceph osd reweight` and `ceph osd crush reweight`: https://docs.ceph.com/en/latest/man/8/ceph/

## Issues Found
- **Fabricated Rook config option**: The post claimed Rook supports a `startWithZeroWeight` option and an `initialWeight` device config field in the CephCluster spec. Neither of these exist in Rook's CRD. Replaced the entire section with the correct approach: using `ceph config set osd osd_crush_initial_weight 0` to set the Ceph-native config option before adding OSDs, then resetting it afterward with `ceph config rm`.

## Review Notes
- The distinction between CRUSH weight (`ceph osd crush reweight`) and reweight (`ceph osd reweight`) is correctly explained. CRUSH weight is the persistent weight in the CRUSH map (typically matching disk size in TB), while reweight is a temporary multiplier (0.0–1.0) applied on top.
- The `ceph osd reweight` values 0.25, 0.5, 0.75, 1.0 are correct — this command accepts values in the 0.0–1.0 range.
- The `ceph osd crush reweight` command syntax is correct.
- The `watch` command inside kubectl exec should work in the Rook toolbox container, which includes standard Linux utilities.
