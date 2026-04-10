# Validation Summary: How to Use Ceph with oVirt for VM Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes-based Ceph orchestrator)
- Ceph RBD (RADOS Block Device)
- oVirt 4.4+ (upstream of Red Hat Virtualization)
- Managed Block Storage (cinderlib-based storage domains)
- oVirt REST API v4
- Kubernetes (kubectl for Ceph toolbox access)

## Sources Consulted
- oVirt Managed Block Storage / cinderlib integration feature page: https://www.ovirt.org/develop/release-management/features/storage/cinderlib-integration.html
- oVirt Blog - Using Ceph-only storage for oVirt datacenter: https://blogs.ovirt.org/2021/07/using-ceph-only-storage-for-ovirt-datacenter/
- oVirt Storage Types documentation: https://www.ovirt.org/documentation/planning_and_prerequisites_guide/topics/con-Storage_Types.html
- oVirt Engine API Model 4.4: http://ovirt.github.io/ovirt-engine-api-model/4.4/
- Ceph Pools documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/pools/
- Ceph User Management documentation: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph RBD Quick Start: https://docs.ceph.com/en/reef/start/quick-rbd/
- Ceph RBD Commands documentation: https://docs.ceph.com/en/reef/rbd/rados-rbd-cmds/
- Ceph PG Autoscaler documentation: https://docs.ceph.com/en/latest/rados/operations/placement-groups/

## Issues Found

### Issue 1: Incorrect oVirt storage type "Ceph RBD" (Step 3)
- **What was wrong:** The post stated that oVirt has a "Ceph RBD" storage type selectable from the New Domain dialog, with fields for Monitor Address, Pool, Username, and Password. This storage type does not exist in oVirt. It also suggested "ISCSI (for block)" as an alternative, which is misleading since iSCSI for Ceph requires a separate iSCSI gateway.
- **What was changed:** Replaced "Ceph RBD" and the iSCSI suggestion with the correct storage type: "Managed Block Storage". Replaced the incorrect Monitor/Pool/Username/Password fields with the correct cinderlib driver parameters (`volume_driver`, `rbd_pool`, `rbd_ceph_conf`, `rbd_user`, `rbd_keyring_conf`).
- **Why:** oVirt integrates with Ceph RBD exclusively through Managed Block Storage, which uses cinderlib (the Cinder library) as a driver layer. This has been the supported path since oVirt 4.3.

## Review Notes
- The `ceph osd pool create ovirt 64 64` command specifies pgp_num explicitly as `64`. Since Ceph Nautilus (14.x), pgp_num is automatically managed to match pg_num, making the second argument redundant. It is not incorrect but is dated syntax.
- The post omits several prerequisites needed for Managed Block Storage to work: cinderlib and os-brick packages must be installed, and `engine-setup --reconfigure-optional-components` must be run on the engine host. For cluster levels below 4.6, `engine-config -s ManagedBlockDomainSupported=true` is also required. These omissions could cause users to fail during setup.
- oVirt and Red Hat Virtualization have largely been superseded by OpenShift Virtualization (KubeVirt). oVirt 4.5 was the last major release. Users should be aware of the project's reduced community activity.
- All Ceph CLI commands (pool creation, auth management, RBD operations, monitoring) are syntactically correct and use current syntax.
- The oVirt REST API v4 migrate endpoint format shown in Step 5 is correct per official API documentation.
