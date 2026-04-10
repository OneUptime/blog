# How to Configure Bootstrap Profiles in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Authentication

Description: Learn how Ceph bootstrap profiles work for initializing new daemons, what permissions they grant, and how they are used in Rook deployments.

---

## What Are Bootstrap Profiles

Bootstrap profiles are pre-defined monitor capability profiles that allow a new Ceph daemon to register itself with the cluster and obtain its permanent keyring. They are used during the initial deployment of OSD, MDS, RGW, and MGR daemons, providing just enough permission for the daemon to request its own key without having full cluster access.

## Available Bootstrap Profiles

Ceph provides the following bootstrap profiles:

| Profile | Used For |
|---|---|
| `bootstrap-osd` | Bootstrapping new OSD daemons |
| `bootstrap-mds` | Bootstrapping new MDS daemons |
| `bootstrap-mgr` | Bootstrapping new Manager daemons |
| `bootstrap-rgw` | Bootstrapping new RGW daemons |
| `bootstrap-rbd` | Bootstrapping RBD client users |
| `bootstrap-rbd-mirror` | Bootstrapping the RBD mirror daemon |

## Creating Bootstrap Users

Bootstrap users are typically created at cluster initialization. To manually create one:

```bash
ceph auth get-or-create client.bootstrap-osd \
  mon 'profile bootstrap-osd'
```

Export it for use during node provisioning:

```bash
ceph auth get client.bootstrap-osd -o /var/lib/ceph/bootstrap-osd/ceph.keyring
```

## How Bootstrap Works

When deploying a new OSD daemon on a node:

1. The `ceph-volume` tool reads the bootstrap keyring from `/var/lib/ceph/bootstrap-osd/ceph.keyring`
2. Using the bootstrap key, it authenticates to the monitors
3. The monitors allow the bootstrap user to call `auth get-or-create` on its own behalf
4. A new permanent OSD keyring is created and stored in `/var/lib/ceph/osd/ceph-<id>/keyring`
5. The OSD uses this permanent keyring from that point on

## Default Keyring Locations for Bootstrap

```text
/var/lib/ceph/bootstrap-osd/ceph.keyring
/var/lib/ceph/bootstrap-mds/ceph.keyring
/var/lib/ceph/bootstrap-mgr/ceph.keyring
/var/lib/ceph/bootstrap-rgw/ceph.keyring
```

## Bootstrap Profiles in Rook

In Rook, bootstrap is handled automatically by the operator. Rook creates all necessary daemon users during cluster initialization. You typically do not need to interact with bootstrap profiles directly in a Rook deployment.

However, if you are connecting an external Ceph cluster to Rook, you may need to extract the bootstrap keyring:

```bash
# Export the bootstrap-osd keyring for external provisioning
ceph auth get client.bootstrap-osd -o /tmp/bootstrap-osd.keyring

# Create a Kubernetes Secret from it
kubectl create secret generic ceph-bootstrap-osd \
  --from-file=keyring=/tmp/bootstrap-osd.keyring \
  -n rook-ceph
```

## Verifying Bootstrap User Capabilities

Inspect the capabilities of a bootstrap user:

```bash
ceph auth get client.bootstrap-osd
```

Sample output:

```text
[client.bootstrap-osd]
    key = AQB...==
    caps mon = "profile bootstrap-osd"
```

The `profile bootstrap-osd` cap only permits the user to create OSD daemon keys. It cannot create arbitrary users or access pools.

## Security Best Practices for Bootstrap Keys

Bootstrap keys should be:

- Restricted to hosts that are provisioning new daemons
- Rotated after cluster initialization is complete for stable clusters
- Stored with `chmod 600` permissions on provisioning hosts

```bash
# Verify permissions
ls -la /var/lib/ceph/bootstrap-osd/ceph.keyring
# Should show: -rw------- root root

# If wrong, fix:
chmod 600 /var/lib/ceph/bootstrap-osd/ceph.keyring
```

## Summary

Bootstrap profiles in Ceph provide limited, scoped permissions for new daemon initialization. They allow new OSD, MDS, MGR, and RGW daemons to register themselves and obtain permanent keyrings without requiring admin credentials. Rook handles bootstrap automatically, but understanding bootstrap profiles is useful for external cluster integrations and custom provisioning workflows.
