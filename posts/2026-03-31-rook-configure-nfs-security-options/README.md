# How to Configure NFS Security Options in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NFS, Kubernetes, Security

Description: Configure NFS security options in Rook including Kerberos authentication, export-level access control, and squash settings for CephNFS.

---

## NFS Security in Rook-Ceph

Rook exposes Ceph NFS (via NFS-Ganesha) through the `CephNFS` CRD. By default, NFS exports use IP-based access control and root squash is not applied (`no_root_squash`). For production environments, you should configure proper security: restrict client access by IP or hostname, apply user ID mapping (squash), and optionally enable Kerberos for encrypted and authenticated sessions.

## Configuring Export-Level Access Control

When you create a `CephNFS` export, you can restrict which clients are allowed to mount it. Use the `/exports` section of the `CephFilesystem` or the `ceph nfs export` commands through the toolbox.

Create a restricted export through the Ceph dashboard or via the toolbox:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- \
  ceph nfs export create cephfs \
    --cluster-id my-nfs \
    --pseudo-path /exports/secure \
    --fsname myfs \
    --path / \
    --client_addr 10.0.1.0/24
```

Only clients in the `10.0.1.0/24` subnet will be allowed to mount that export.

## Setting Root Squash

Root squash maps the root user from clients (UID 0) to an anonymous user on the server, preventing privilege escalation:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- \
  ceph nfs export apply my-nfs -i - <<EOF
{
  "export_id": 1,
  "path": "/",
  "pseudo": "/exports/secure",
  "access_type": "RW",
  "squash": "root_squash",
  "protocols": [4],
  "transports": ["TCP"],
  "fsal": {
    "name": "CEPH",
    "fs_name": "myfs"
  },
  "clients": [
    {
      "addresses": ["10.0.1.0/24"],
      "access_type": "RW",
      "squash": "root_squash"
    }
  ]
}
EOF
```

Available squash options:
- `no_root_squash` - root on client keeps root on server (not recommended in production)
- `root_squash` - root on client maps to anonymous UID (default safe choice)
- `all_squash` - all users on client map to anonymous UID

## Enabling NFSv4 with Kerberos

Kerberos provides mutual authentication and optional encryption for NFS traffic. To enable it, you need a KDC and a keytab provisioned as a Kubernetes Secret.

First, create a Secret containing the NFS service keytab:

```bash
kubectl -n rook-ceph create secret generic nfs-keytab \
  --from-file=krb5.keytab=/path/to/nfs.keytab
```

Then configure Kerberos in the `CephNFS` spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNFS
metadata:
  name: my-nfs
  namespace: rook-ceph
spec:
  server:
    active: 2
    logLevel: NIV_EVENT
  security:
    kerberos:
      principalName: nfs
      configFiles:
        volumeSource:
          configMap:
            name: krb5-config
      keytabFile:
        volumeSource:
          secret:
            secretName: nfs-keytab
            defaultMode: 0600
    sssd:
      sidecar:
        image: registry.access.redhat.com/rhel7/sssd:latest
        sssdConfigFile:
          volumeSource:
            configMap:
              name: sssd-config
              defaultMode: 0600
```

## Restricting Transport and Protocol Versions

To enforce NFSv4 only (dropping NFSv3) and restrict to TCP:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- \
  ceph nfs export apply my-nfs -i - <<EOF
{
  "export_id": 1,
  "pseudo": "/secure",
  "protocols": [4],
  "transports": ["TCP"],
  ...
}
EOF
```

NFSv4 is preferred because it supports stronger authentication, stateful sessions, and is firewall-friendly (single port 2049).

## Verifying Security Settings

Check active exports and their security configuration:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- \
  ceph nfs export ls my-nfs --detailed
```

View a specific export's JSON configuration:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- \
  ceph nfs export get my-nfs /exports/secure
```

## Summary

Rook NFS security is configured at two levels: the export (squash, client list, protocol version) and the service (Kerberos keytab, SSSD integration). For most clusters, enforcing `root_squash` and client IP restrictions is the minimum baseline. Add Kerberos for environments that require encrypted, mutually authenticated NFS sessions.
