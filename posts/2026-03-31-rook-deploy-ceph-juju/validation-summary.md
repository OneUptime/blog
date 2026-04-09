# Validation Summary: How to Deploy Ceph Using Juju

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage system)
- Juju (Canonical's model-driven operator framework)
- Juju Charms: ceph-mon, ceph-osd, ceph-radosgw, ceph-nfs
- MAAS (Metal as a Service)
- LXD (for local testing)

## Sources Consulted
- Charmhub ceph-mon charm documentation: https://charmhub.io/ceph-mon
- Charmhub ceph-mon configuration options: https://charmhub.io/ceph-mon/configurations
- Charmhub ceph-mon actions: https://charmhub.io/ceph-mon/actions
- Charmhub ceph-osd charm documentation: https://charmhub.io/ceph-osd
- Charmhub ceph-osd configuration options: https://charmhub.io/ceph-osd/configurations
- Charmhub ceph-radosgw charm documentation: https://charmhub.io/ceph-radosgw
- Charmhub ceph-nfs charm documentation: https://charmhub.io/ceph-nfs
- Juju 3.0 release notes (for `juju integrate` command)

## Issues Found

1. **Non-existent config option `osd-pool-default-size` on ceph-mon**: The blog used `juju config ceph-mon osd-pool-default-size=3` but this config option does not exist on the ceph-mon charm. Pool replication is set per-pool at creation time via the `create-pool` action's `replicas` parameter, not via a global charm config. Removed this incorrect line.

2. **Non-existent config option `public-address` on ceph-osd**: The blog used `juju config ceph-osd public-address=192.168.1.0/24` but this config option does not exist on the ceph-osd charm. The correct option is `ceph-public-network` and it is available on both ceph-mon and ceph-osd. Changed to `juju config ceph-mon ceph-public-network=192.168.1.0/24`.

3. **Incorrect config option name `cluster-network` on ceph-mon**: The blog used `juju config ceph-mon cluster-network=192.168.2.0/24` but the correct config option name is `ceph-cluster-network`. Changed accordingly.

4. **Non-existent `pg-num` parameter on `create-pool` action**: The blog used `pg-num=128` as a parameter to the `create-pool` action on ceph-mon, but this parameter does not appear in the documented action schema. Replaced with `replicas=3` which is a valid parameter for setting pool replication factor.

## Review Notes
- The `osd-journal` config option used in the OSD deployment command is technically valid but is a FileStore-era option. Since the expected status output shows Ceph 17.2.5 (Quincy), which uses BlueStore by default, modern deployments would typically use `bluestore-wal` and `bluestore-db` config options instead. This is not incorrect (the charm still supports it) but could be updated in a future revision to reflect modern BlueStore best practices.
- The `juju integrate` command syntax is correct for Juju 3.x. Users on Juju 2.x would need to use `juju add-relation` instead.
- All relation/integration endpoint names were verified as correct: `ceph-mon:osd`/`ceph-osd:mon`, `ceph-radosgw:mon`/`ceph-mon:radosgw`, and `ceph-nfs:ceph-client`/`ceph-mon:client`.
- The `juju status` expected output format is simplified (omits Channel/Store columns) but is reasonable for illustrative purposes.
