# Validation Summary: How to Set Pool Flags in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (OSD pool management, pool flags)
- Rook (Ceph operator for Kubernetes)
- CRUSH algorithm (object placement)
- Ceph PG autoscaler

## Sources Consulted
- Ceph official documentation: Pool operations and `ceph osd pool` CLI reference (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph source code for valid `ceph osd pool get` variable names
- Ceph documentation on CRUSH and HASHPSPOOL behavior (https://docs.ceph.com/en/latest/rados/operations/placement-groups/)
- Ceph configuration reference for `mon_allow_pool_delete` (https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/)
- Rook documentation for toolbox usage (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found

1. **Invalid command `ceph osd pool get mypool flags`**: The `flags` parameter is not a valid variable name for `ceph osd pool get`. This command would return an error like "unrecognized pool field." Fixed by replacing with `ceph osd pool ls detail | grep mypool` and `ceph osd pool get mypool all`, both of which are valid ways to view pool flags.

2. **Incorrect HASHPSPOOL expansion**: The post stated HASHPSPOOL stands for "Hash Placement and Scope Pool," which is not an official or accurate expansion. The flag name refers to hashing the pool ID into the PG seed calculation. Fixed by removing the incorrect acronym expansion and providing an accurate technical description of what the flag does.

## Review Notes
- All other CLI commands (`ceph osd pool set`, `ceph osd pool delete`, `ceph config set`, `ceph osd pool autoscale-status`) are syntactically correct and use valid flags/parameters.
- The `nodelete`, `nopgchange`, `nosizechange`, `hashpspool`, `bulk`, and `write_fadvise_dontneed` flags are all real Ceph pool flags with correct descriptions.
- The pool delete syntax `ceph osd pool delete mypool mypool --yes-i-really-really-mean-it` correctly shows the pool name repeated twice as required by Ceph's safety mechanism.
- The `mon_allow_pool_delete` configuration option is accurate for cluster-wide pool deletion protection.
- The Rook toolbox approach for setting flags post-creation is valid.
- The `bulk` flag was introduced in Ceph Pacific (16.2.x); the post does not mention version requirements, which is acceptable for a general guide but worth noting.
