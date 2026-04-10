# Validation Summary: How to Use Ceph Config from Kubernetes Secrets in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (RADOS Gateway / RGW)
- Kubernetes Secrets and ConfigMaps
- HashiCorp Vault (KMS integration)
- Ceph authentication (cephx keyrings)

## Sources Consulted
- Ceph LDAP Authentication docs: https://docs.ceph.com/en/latest/radosgw/ldap-auth/
- Rook Ceph Configuration docs: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- Rook CephObjectStore CRD docs: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook Key Management System docs: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/
- Ceph User Management docs: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Rook GitHub issues (rook/rook#9705) confirming `rook-ceph-admin-keyring` Secret name
- POSIX echo specification: https://pubs.opengroup.org/onlinepubs/9699919799/utilities/echo.html

## Issues Found

1. **Invalid Ceph config option `rgw_ldap_bindpw`**: This is not a valid Ceph configuration option. The correct option is `rgw_ldap_secret`, which specifies a file path containing the LDAP bind credentials. Changed `rgw_ldap_bindpw: "super-secret-password"` to `rgw_ldap_secret: "/etc/ceph/ldap-bindpw"`.

2. **Misleading CephObjectStore section description**: The text described referencing secrets "via the `config` map in the `CephObjectStore`" but the YAML example showed the `security.kms` section, which is specifically for KMS/encryption key management (e.g., Vault integration for server-side encryption), not general Secret-based config. Fixed the description to accurately reflect the KMS purpose.

3. **Fabricated operator ConfigMap key `ROOK_CEPH_SECRET_VOLUME_MOUNTS`**: This setting does not exist in Rook's operator ConfigMap. The correct mechanism for providing custom Ceph configuration overrides is the `rook-config-override` ConfigMap with a `config` key containing ceph.conf-format content. Replaced the entire section with the correct approach using `rook-config-override`.

4. **`ceph auth get-or-create` does not rotate keys**: The command `ceph auth get-or-create client.admin` returns the existing key if the entity already exists — it does not generate a new key. To rotate, the entity must be deleted first and then recreated. Fixed the procedure to use `ceph auth del` followed by `ceph auth get-or-create`.

5. **Incorrect admin capabilities (`profile rbd`)**: The `client.admin` entity requires `allow *` on all daemon types (mon, osd, mgr, mds), not `profile rbd` which is a restricted capability profile for RBD client users. Using `profile rbd` for admin would break cluster administration. Fixed to `mon 'allow *' osd 'allow *' mgr 'allow *' mds 'allow *'`.

6. **`echo -n` does not interpret escape sequences in bash**: The command `echo -n "[client.admin]\n\tkey = ${NEW_KEY}"` outputs literal `\n` and `\t` in bash rather than newline and tab. Replaced with `printf '[client.admin]\n\tkey = %s\n' "${NEW_KEY}"` which portably handles escape sequences.

7. **Misleading claim about operator synchronization**: The text stated "update the Secret and the operator will synchronize it" — Rook does not watch for manual admin keyring Secret changes and synchronize them to Ceph. The Ceph cluster is the source of truth for keys. Fixed the procedure to rotate the key in Ceph first, then update the Secret to match.

## Review Notes
- The `rook-config-override` ConfigMap is not a Secret, so the section title was changed from "Injecting Ceph Config from a Secret into Pods" to "Overriding Ceph Configuration" to reflect the actual mechanism. For truly sensitive values, the KMS/Vault approach shown in the CephObjectStore section is the appropriate Secret-based mechanism.
- The `base64 -w0` flag used in the keyring patch command is GNU coreutils-specific and will not work on macOS. Since these commands would typically run in a Linux-based CI/CD or admin environment, this was left as-is but is worth noting.
- Admin key rotation in a Rook-managed cluster is a dangerous operation that can cause cluster outage if done incorrectly. The procedure shown is simplified and should be tested in a non-production environment first.
- The `rgw_ldap_secret` option in Ceph expects a file path to a file containing the password, not the password value itself. The Secret example stores this as a config value which is correct for reference but the actual Ceph daemon would need the file to be mounted at that path.
