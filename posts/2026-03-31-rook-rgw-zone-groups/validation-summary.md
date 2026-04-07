# Validation Summary: How to Configure Zone Groups in Ceph RGW Multisite

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph Multisite (Realms, Zone Groups, Zones)
- Rook (Ceph operator for Kubernetes)
- radosgw-admin CLI
- kubectl

## Sources Consulted
- Ceph Multi-Site documentation: https://docs.ceph.com/en/latest/radosgw/multisite/
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph Pool Placement and Storage Classes: https://docs.ceph.com/en/latest/radosgw/placement/
- Ceph source (multisite.rst): https://github.com/ceph/ceph/blob/main/doc/radosgw/multisite.rst

## Issues Found

1. **"formerly region groups" was incorrect**: The post stated zone groups were "formerly region groups." Per official Ceph documentation, zone groups were formerly called "regions," not "region groups." Fixed to "formerly regions."

2. **Incorrect cross-zonegroup replication claim**: The post claimed zone groups "can replicate to other zone groups at a configurable interval." This is incorrect. In Ceph multisite, replication occurs between zones within the same zonegroup, not between zonegroups. Removed the bullet point.

3. **`--api-name` flag not a documented CLI flag**: The `api_name` field appears in zonegroup JSON configuration output, but `--api-name` is not a documented CLI flag for `radosgw-admin zonegroup create`. Removed from both zonegroup create commands.

4. **`--is-master=false` is not a valid flag**: The correct flag is `--master` (a boolean toggle). There is no `--is-master` CLI flag; `is_master` is only a field in the JSON output. For a non-master zonegroup, the flag should simply be omitted. Removed from the EU zonegroup create command.

## Review Notes
- The remaining commands (`zone create`, `zonegroup placement add`, `zone placement add`, `period update --commit`, `zonegroup get`, `zonegroup list`) are all correct and well-documented.
- The EU zone (eu-west) is created without `--master` or `--default` flags on the zone create command. In practice, the first zone added to a non-master zonegroup should typically use `--master --default` to designate it as the master zone within that zonegroup. This is not strictly an error since the behavior depends on the deployment, but users should be aware.
