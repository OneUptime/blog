# Validation Summary: How to Create Ceph CRUSH Map Custom

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph
- CRUSH maps
- Ceph OSD and pool management
- CRUSH device classes
- Erasure-coded pools
- `ceph` CLI
- `crushtool`

## Sources Consulted
- Ceph CRUSH Maps documentation: https://docs.ceph.com/en/reef/rados/operations/crush-map/
- Ceph manually editing CRUSH maps documentation: https://docs.ceph.com/en/reef/rados/operations/crush-map-edits/
- Ceph `crushtool` man page: https://docs.ceph.com/en/latest/man/8/crushtool/
- Ceph Pools documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph Erasure Code documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph monitor command API for CRUSH class and rule commands: https://docs.ceph.com/en/latest/api/mon_command_api/

## Issues Found
- The post described a CRUSH map as having four main components. Ceph documents six sections, including `types` and `choose_args`, so the component table was corrected.
- The explanation of `firstn 0` omitted the limit imposed by available matching buckets. The text now notes that selection is bounded by available buckets.
- The rack-level replicated examples used `choose firstn 0 type rack` followed by `chooseleaf firstn 1 type host` and claimed 3-way rack placement in a two-rack topology. The rules and comments were corrected to use rack as the failure domain and to state that enough racks must exist for the pool size.
- The erasure-coded rules used `firstn`. Ceph documents `indep` as the replacement strategy for erasure-coded pools, so the EC rule steps were changed to `chooseleaf indep`.
- The erasure-code pool example used `k=4 m=2` with a host failure domain in a four-host topology, which cannot place all six chunks on distinct hosts. The profile was changed to `k=2 m=2` so it fits the example topology.
- The pool creation example did not associate newly created pools with applications. Ceph requires pools to be associated with an application in Luminous and later, so application enable commands were added.

## Review Notes
Local `ceph` and `crushtool` binaries were not installed in the review environment, so command validation was performed against official Ceph documentation rather than live CLI help. The remaining advanced multi-datacenter examples are illustrative and still require enough datacenter or rack buckets for the requested replica or erasure-code chunk count.
