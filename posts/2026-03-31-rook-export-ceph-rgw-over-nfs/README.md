# How to Export Ceph RGW Over NFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, NFS, Object Storage, Export

Description: Learn how to export Ceph RGW object buckets over NFS using the NFS-Ganesha integration, enabling POSIX clients to access S3 object storage via NFS mounts.

---

## Overview

Ceph RGW can be exported over NFS using NFS-Ganesha with the `FSAL_RGW` plugin. This allows clients without S3 support to access object storage buckets via standard NFS mounts. The NFS-Ganesha daemon translates NFS requests into RGW operations, bridging the POSIX and object storage worlds.

## Architecture

```text
NFS Client (POSIX) --> NFS-Ganesha (FSAL_RGW) --> Ceph RGW --> RADOS
```

NFS-Ganesha acts as a gateway, presenting RGW buckets as NFS exports. Each bucket maps to an NFS export path.

## Installing NFS-Ganesha with FSAL_RGW

```bash
# On the NFS-Ganesha host
# Install ganesha with RGW support
apt-get install nfs-ganesha nfs-ganesha-rgw

# Or on RHEL/CentOS
dnf install nfs-ganesha nfs-ganesha-rgw
```

## Configuring NFS-Ganesha for RGW

Create the Ganesha configuration file:

```bash
cat > /etc/ganesha/ganesha.conf << 'EOF'
NFS_CORE_PARAM {
    Nb_Worker = 256;
    Manage_Gids_Expiration = 3600;
    NFS_Protocols = 3,4;
}

EXPORT_DEFAULTS {
    Access_Type = RW;
    Protocols = 4;
    Transports = TCP;
    Squash = No_Root_Squash;
}

RGW {
    ceph_conf = "/etc/ceph/ceph.conf";
    name = "client.rgw.ganesha";
    cluster = "ceph";
}

EXPORT {
    Export_Id = 1;
    Transports = TCP;
    Path = /mybucket;
    Pseudo = /mybucket;
    Protocols = 4;
    Access_Type = RW;
    Squash = No_Root_Squash;
    FSAL {
        name = RGW;
        user_id = "nfs-user";
        access_key_id = "NFS_ACCESS_KEY";
        secret_access_key = "NFS_SECRET_KEY";
    }
}
EOF
```

## Creating the RGW User for NFS

```bash
# Create a dedicated RGW user for NFS access
radosgw-admin user create \
  --uid=nfs-user \
  --display-name="NFS Gateway User" \
  --access-key=NFS_ACCESS_KEY \
  --secret=NFS_SECRET_KEY
```

## Starting NFS-Ganesha

```bash
# Start and enable the service
systemctl start nfs-ganesha
systemctl enable nfs-ganesha

# Verify the service is running
systemctl status nfs-ganesha

# Check exports
showmount -e localhost
```

## Mounting the NFS Export

On a client system:

```bash
# Mount the bucket over NFS v4
mount -t nfs4 ganesha-host:/mybucket /mnt/rgw-bucket

# Verify contents
ls /mnt/rgw-bucket

# Permanently mount via /etc/fstab
echo "ganesha-host:/mybucket /mnt/rgw-bucket nfs4 defaults 0 0" >> /etc/fstab
```

## Rook: Ceph NFS CRD for RGW Exports

Rook provides the `CephNFS` CRD for NFS-Ganesha deployment with Ceph integration:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNFS
metadata:
  name: my-nfs
  namespace: rook-ceph
spec:
  server:
    active: 1
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
```

## Summary

Exporting Ceph RGW buckets over NFS-Ganesha enables POSIX clients to access object storage via standard NFS mounts. The FSAL_RGW plugin translates NFS operations into RGW calls. Each bucket is configured as a separate NFS export with its own RGW user credentials. In Rook deployments, the `CephNFS` CRD manages the Ganesha daemon lifecycle within the Kubernetes cluster.
