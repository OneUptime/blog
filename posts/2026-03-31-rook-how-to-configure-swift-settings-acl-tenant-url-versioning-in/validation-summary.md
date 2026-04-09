# Validation Summary: How to Configure Swift Settings in Ceph RGW

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- OpenStack Swift API
- OpenStack Keystone authentication
- python-swiftclient CLI
- radosgw-admin CLI

## Sources Consulted
- Ceph Object Gateway Config Reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph RGW Swift Auth: https://docs.ceph.com/en/latest/radosgw/swift/auth/
- Ceph Integrating with OpenStack Keystone: https://docs.ceph.com/en/latest/radosgw/keystone/
- Ceph RGW Multi-tenancy: https://docs.ceph.com/en/reef/radosgw/multitenancy/
- OpenStack python-swiftclient CLI docs: https://docs.openstack.org/python-swiftclient/latest/cli/index.html
- OpenStack Swift CORS docs: https://docs.openstack.org/swift/latest/cors.html
- Red Hat Ceph Storage 6 Object Gateway Guide: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/6/html/object_gateway_guide/configuration-reference

## Issues Found

1. **Misleading comment on `rgw_swift_account_in_url`**: The comment said "Allow cross-tenant ACLs" but this setting controls whether the Swift account name is included in the URL path (e.g., `/swift/v1/AUTH_<account>`). Fixed the comment to "Include Swift account name in the URL path."

2. **Misleading comment on `rgw_swift_enforce_content_length`**: The comment said "Set default ACL behavior" but this setting enforces the Content-Length header in Swift API responses, which is unrelated to ACLs. Fixed the comment to "Enforce Content-Length header in Swift API responses."

3. **Incorrect description of `rgw_max_chunk_size`**: The comment said "Configure max segment size in RGW" implying it controls Swift large object segmentation. In reality, `rgw_max_chunk_size` controls the internal RADOS I/O chunk size for read/write operations. Swift large object segmentation is handled client-side by the swift client. Fixed the comment to "Configure internal RADOS I/O chunk size (not Swift segment size)."

4. **Missing Swift subuser creation for tempauth**: The tempauth section created a user with `radosgw-admin user create` but did not create a Swift subuser, which is required for RGW's built-in Swift auth. Added `radosgw-admin subuser create` and `radosgw-admin key create` commands to generate a Swift subuser and key.

5. **Incorrect `--user` format in tempauth test**: The testing section used `--user testuser:testaccount` but the user was created with `--uid=testuser` and no subuser named `testaccount` existed. Fixed to `--user testuser:swift` to match the subuser created in the tempauth section.

6. **Missing Keystone v3 domain flags**: The Keystone v3 swift client test command was missing the required `--os-project-domain-name` and `--os-user-domain-name` parameters, which are mandatory for Keystone v3 authentication. Added `--os-project-domain-name default` and `--os-user-domain-name default`.

## Review Notes
- `rgw_keystone_admin_token` is deprecated in favor of using Keystone service account credentials (`rgw_keystone_admin_user`, `rgw_keystone_admin_password`, `rgw_keystone_admin_tenant`). The blog still shows the token approach, which works but is not recommended for production.
- `rgw_keystone_revocation_interval` references Keystone token revocation lists, which were deprecated and removed in later OpenStack Keystone releases. This setting is effectively obsolete in modern deployments.
- The `rgw_keystone_implicit_tenants` setting can also accept `s3` or `swift` values (not just `true`/`false`) to enable implicit tenants per-protocol, which is not mentioned in the post.
