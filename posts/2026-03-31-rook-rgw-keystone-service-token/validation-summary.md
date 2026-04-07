# Validation Summary: How to Set Service Token Support for Keystone in Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Keystone (OpenStack Identity Service)
- Rook (Kubernetes Ceph Operator)
- OpenStack CLI
- Kubernetes (ConfigMap, kubectl)

## Sources Consulted
- Ceph RGW Keystone integration documentation: https://docs.ceph.com/en/latest/radosgw/keystone/
- Rook Ceph configuration override documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/#custom-cephconf-settings
- OpenStack CLI reference for user and role management: https://docs.openstack.org/python-openstackclient/latest/cli/

## Issues Found
- **Missing `rgw_keystone_admin_password` in Rook ConfigMap**: The Rook YAML section defined a Kubernetes Secret (`rgw-keystone-service-secret`) that was never referenced or mounted by any resource. Meanwhile, the `rook-config-override` ConfigMap was missing the `rgw_keystone_admin_password` setting, which is required for RGW to authenticate to Keystone. Without this, the RGW daemon would fail to obtain admin/service tokens from Keystone. Fixed by removing the unused Secret and adding `rgw_keystone_admin_password` directly to the ConfigMap config block.

## Review Notes
- Storing passwords in a ConfigMap (via `rook-config-override`) is not ideal for production. In a real deployment, operators should consider using a secrets management solution. However, `rook-config-override` is the standard mechanism for injecting arbitrary Ceph config in Rook, and Rook does not currently support referencing Kubernetes Secrets for individual Ceph config values.
- The `openstack token issue` command uses global `--os-*` authentication flags, which is correct but may require additional flags like `--os-auth-url` and `--os-project-domain-name` depending on the environment.
