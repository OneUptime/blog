# Validation Summary: How to Configure crush_location for OSDs in Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (CRUSH map, OSD configuration)
- Rook (Kubernetes-based Ceph orchestrator)
- Kubernetes (node labels, topology)
- ceph.conf configuration format

## Sources Consulted
- Ceph CRUSH Maps Documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- Rook CephCluster CRD Documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph Monitoring OSD Documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/

## Issues Found

1. **Incorrect OSD startup behavior claim**: The post stated that `crush_location` is only used "if the OSD is not already in the CRUSH map with a location." This is incorrect. By default (`osd crush update on start = true`), every time an OSD starts it verifies that it is in the correct location in the CRUSH map and moves itself if it is not. Fixed the explanation to accurately describe this behavior and mention the controlling option.

2. **Incorrect `ceph osd find` syntax**: The post used `ceph osd find osd.0`, but `ceph osd find` takes a numeric OSD ID, not the `osd.N` notation. Fixed to `ceph osd find 0`.

## Review Notes
- The `crush_location_hook` option is used in the `[osd]` section, which is correct since the canonical full name `osd crush location hook` has its `osd` prefix implicitly supplied by the section. This is valid Ceph configuration practice.
- The example hook script does not parse the `--cluster`, `--id`, and `--type` arguments that Ceph passes to hook scripts. The script still works because it derives location from `hostname -s` and ignores unused arguments, but production scripts should parse these arguments for robustness.
- The `ceph osd find` expected output omits the `ip` field that is present in real output. This is acceptable for a tutorial focusing on CRUSH location, but readers should be aware the actual output contains additional fields.
- The Rook topology labels shown (`topology.kubernetes.io/region`, `topology.kubernetes.io/zone`, `topology.rook.io/datacenter`, `topology.rook.io/rack`) are all valid. Rook supports additional labels (`topology.rook.io/room`, `topology.rook.io/pod`, `topology.rook.io/pdu`, `topology.rook.io/row`, `topology.rook.io/chassis`) that are not mentioned but are not required for the tutorial's scope.
