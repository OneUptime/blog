# Validation Summary: How to Edit CRUSH Maps Manually in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage system)
- CRUSH (Controlled Replication Under Scalable Hashing) maps
- crushtool (CRUSH map compilation/decompilation utility)
- Rook (Ceph orchestrator for Kubernetes, mentioned in tags)

## Sources Consulted
- Ceph official documentation on CRUSH maps: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph official documentation on CRUSH map editing: https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/
- crushtool man page: https://docs.ceph.com/en/latest/man/8/crushtool/
- Ceph CRUSH map rule syntax reference: https://docs.ceph.com/en/latest/rados/operations/crush-map/#crush-map-rules

## Issues Found
No technical issues found.

## Review Notes
- The post omits the `tunables` section from the CRUSH map structure overview. Tunables control algorithmic behavior (e.g., `choose_total_tries`, `straw_calc_version`) and are present in all real CRUSH maps. This is an acceptable simplification for an introductory tutorial but readers editing production CRUSH maps should be aware tunables exist.
- The type hierarchy example omits `chassis` and `region` types that appear in default Ceph CRUSH maps. Since CRUSH types are user-definable, the simplified example is valid, but readers should know the default hierarchy is more granular.
- The post correctly recommends `straw2` as the bucket algorithm, which is the modern default and recommended choice over legacy `straw`, `list`, `tree`, or `uniform` algorithms.
- All CLI commands (`ceph osd getcrushmap`, `crushtool -d/-c`, `ceph osd setcrushmap`, `ceph osd crush tree`, etc.) are verified correct with proper flags and syntax.
- The `crushtool --test` command with `--show-statistics`, `--rule`, `--num-rep`, `--min-x`, and `--max-x` flags is correct and is a best practice before injecting a modified CRUSH map.
