# Validation Summary: How to Configure Ceph RGW as OpenStack Swift Replacement

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Ceph RADOS Gateway (RGW) — Swift-compatible API, Beast frontend
- OpenStack Keystone (v3 auth), python-swiftclient, Glance swift store

## Sources Consulted
- Ceph Documentation — https://docs.ceph.com/en/latest/radosgw/keystone/ (verified RGW Keystone option names: rgw_keystone_url, rgw_keystone_api_version, rgw_keystone_admin_domain, rgw_keystone_admin_project, rgw_keystone_admin_user, rgw_keystone_admin_password, rgw_keystone_accepted_roles, rgw_keystone_token_cache_size, rgw_s3_auth_use_keystone — all present; rgw_keystone_revocation_interval not present)
- Ceph Documentation — https://docs.ceph.com/en/latest/radosgw/config-ref/ (verified rgw_swift_account_in_url and rgw_swift_versioning_enabled exist with default false, and that rgw_frontends defaults to `beast port=7480`)
- Ceph issue tracker / mailing list — https://tracker.ceph.com/issues/22312 and related (confirmed rgw_keystone_revocation_interval is tied to PKI-token revocation, which OpenStack removed; not used with modern UUID/Fernet tokens)

## Issues Found
- Removed `rgw_keystone_revocation_interval = 900` from the Keystone config block. This option drove PKI-token revocation polling; PKI tokens were removed from OpenStack (Ocata era) in favor of Fernet/UUID tokens, and the option is no longer present in the current Ceph config reference. Leaving it in would be misleading/non-functional on a modern deployment.

## Review Notes
- All remaining Keystone option names were confirmed against the current Ceph Keystone integration page.
- `rgw_frontends = beast port=7480` matches the documented default frontend and port syntax.
- `rgw_swift_account_in_url = true` and `rgw_swift_versioning_enabled = true` are valid options (both default false), correctly enabling account-in-URL and Swift object versioning.
- `rgw_keystone_accepted_roles = member,admin,_member_` retains the legacy `_member_` role; it is deprecated in newer OpenStack but harmless to list, so it was left as-is.
- The Keystone CLI flow (`openstack service create ... object-store`, `openstack endpoint create ... object-store public/internal http://rgw.example.com:7480/swift/v1/AUTH_%(project_id)s`, user/role creation) and the python-swiftclient v3 auth example are consistent with standard Swift/RGW + Keystone setup.
- The Glance `[glance_store]` swift-store settings (`swift_store_auth_version = 3`, `swift_store_user = service:rgw`, etc.) are valid glance_store config keys.
- Note: the post is tagged Rook but the body configures RGW via ceph.conf directly (non-Rook/bare Ceph). The configuration shown is correct for a standalone Ceph cluster; Rook users would set these via the CephObjectStore CR / config overrides. Left as-is since the technical content is accurate.
