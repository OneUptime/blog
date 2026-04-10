# How to Associate Pools with Applications in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Storage, Kubernetes, Operation

Description: Learn how to associate Ceph pools with applications using pool application tags to improve cluster management, health reporting, and access control.

---

## What Are Pool Application Tags

Ceph tracks which application is using each storage pool through pool application tags. When you enable an application on a pool, Ceph records this metadata and uses it in several ways:

- Health checks generate warnings for pools with no application tag (`POOL_APP_NOT_ENABLED`)
- The dashboard groups pools by application
- Access controls and monitoring can target specific applications
- Certain features are only available for pools tagged with specific applications

Every pool should typically have one application tag set. While Ceph allows multiple tags per pool, it will warn and require `--yes-i-really-mean-it` if you try to add a second tag, since one application per pool is the only tested configuration. The three built-in applications are `rbd`, `rgw`, and `cephfs`. Custom tags are also allowed.

## Enabling an Application on a Pool

Use the `application enable` subcommand to tag a pool:

```bash
ceph osd pool application enable <pool-name> <application-name>
```

For a Ceph Block Device (RBD) pool:

```bash
ceph osd pool application enable rbd-pool rbd
```

For a RADOS Gateway (RGW) pool:

```bash
ceph osd pool application enable rgw-data rgw
```

For a CephFS metadata or data pool:

```bash
ceph osd pool application enable cephfs-meta cephfs
ceph osd pool application enable cephfs-data cephfs
```

## Viewing Application Associations

List the applications associated with all pools:

```bash
ceph osd pool application get
```

Check a specific pool:

```bash
ceph osd pool application get rbd-pool
```

You can also see application tags in the pool detail listing:

```bash
ceph osd pool ls detail
```

Look for the `application:` line in the pool info output.

## Fixing the POOL_APP_NOT_ENABLED Warning

If your cluster shows a `POOL_APP_NOT_ENABLED` health warning, list which pools are missing tags:

```bash
ceph health detail | grep POOL_APP_NOT_ENABLED
```

Then enable the appropriate application on each pool:

```bash
# Example: fixing an untagged pool
ceph osd pool application enable my-unnamed-pool rbd
```

After tagging all pools, verify health clears:

```bash
ceph -s
```

## Using Custom Application Tags

You can define custom application names for non-standard workloads:

```bash
ceph osd pool application enable metrics-pool myapp
ceph osd pool application enable logs-pool logging
```

Custom tags work the same as built-in ones for health and display purposes. They do not enable any special Ceph features, but they document pool intent and suppress the `POOL_APP_NOT_ENABLED` warning.

## Disabling an Application Tag

If you need to change the application tag on a pool, first disable the current tag:

```bash
ceph osd pool application disable rbd-pool rbd --yes-i-really-mean-it
```

Then enable the correct one:

```bash
ceph osd pool application enable rbd-pool myapp
```

Note: disabling and re-enabling tags does not move or modify any data.

## Application Tags in Rook

In Rook-managed clusters, application tags are set automatically based on pool type. For a `CephBlockPool`, Rook sets the `rbd` tag. For object store pools, it sets `rgw`. For filesystem pools, it sets `cephfs`.

To verify in a Rook cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool application get
```

## Summary

Pool application tags in Ceph are essential metadata that link each pool to its workload. Always enable the correct tag (`rbd`, `rgw`, or `cephfs`) after pool creation to avoid health warnings and improve cluster management. Custom tags are supported for non-standard applications. In Rook-managed clusters, tags are set automatically, but you can verify and adjust them using the Ceph toolbox container.
