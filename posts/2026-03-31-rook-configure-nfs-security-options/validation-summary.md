# Validation Summary: How to Configure NFS Security Options in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph NFS (NFS-Ganesha)
- Kubernetes (CRDs, Secrets, ConfigMaps)
- NFSv4 / Kerberos authentication
- SSSD (System Security Services Daemon)

## Sources Consulted
- Ceph NFS Manager documentation: https://docs.ceph.com/en/latest/mgr/nfs/
- Ceph NFS Manager source docs (GitHub): https://github.com/ceph/ceph/blob/main/doc/mgr/nfs.rst
- Rook CephNFS CRD documentation: https://www.rook.io/docs/rook/latest-release/CRDs/ceph-nfs-crd/
- Rook NFS Security documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/NFS/nfs-security/
- Rook GitHub issue #8450 (RADOS pool deprecation): https://github.com/rook/rook/issues/8450

## Issues Found

1. **Confusing default squash wording (line 13)**: The original text said "with `no_root_squash` disabled" which is a double negative implying root squash IS enabled. The actual default is `no_root_squash` (root is NOT squashed). Fixed to: "root squash is not applied (`no_root_squash`)".

2. **Wrong CLI flag format for client address restriction (line 28)**: The `ceph nfs export create cephfs` command uses `--client_addr` (with underscore), not `--client-addr` (with hyphen). This is an inconsistency in Ceph's CLI where some flags use hyphens (`--cluster-id`, `--pseudo-path`) and others use underscores (`--client_addr`, `--cmount_path`). Fixed to `--client_addr`.

3. **Deprecated `rados` section in CephNFS spec (lines 88-89)**: The `spec.rados.pool` and `spec.rados.namespace` fields were deprecated starting with Rook v1.9 and fully removed in v1.10+. Since Ceph Pacific 16.2.7, the NFS RADOS pool (`.nfs`) is automatically managed. Removed the `rados` section from the YAML example.

4. **Incorrect CephNFS Kerberos YAML structure (lines 94-97)**: The blog used `security.kerberosPrincipalName` (a flat field) and `security.sssd.enabled: true`. The correct structure per Rook docs is:
   - `security.kerberos.principalName` (nested under a `kerberos` key), where `principalName` is just the service name (e.g., `"nfs"`), not the full principal
   - `security.kerberos.keytabFile` with a `volumeSource` referencing the Secret
   - `security.kerberos.configFiles` with a `volumeSource` for krb5 config
   - `security.sssd.sidecar` with `image`, `sssdConfigFile`, and other fields (not a simple `enabled: true` boolean)
   Fixed the entire YAML block to match the official Rook CRD structure.

## Review Notes
- The `principalName` field in the Rook CephNFS Kerberos config is just the service name (e.g., `"nfs"`). The full Kerberos principal is auto-constructed by Rook as `<principalName>/<namespace>-<name>@<realm>`.
- The SSSD sidecar image (`registry.access.redhat.com/rhel7/sssd:latest`) shown in official Rook docs may need updating to a RHEL 8+ based image depending on deployment requirements.
- The `logLevel: NIV_EVENT` and `--detailed` flag were verified as correct against official docs.
- The export JSON structure used with `ceph nfs export apply` is correct and well-formed.
- The squash options listed (`no_root_squash`, `root_squash`, `all_squash`) are accurate. NFS-Ganesha also supports `root_id_squash` but the three listed are the primary ones.
