# Validation Summary: How to Add and Remove Admin Capabilities in Ceph RGW

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- radosgw-admin CLI
- Ceph RGW Admin REST API
- AWS SigV4 authentication (via curl)
- jq for JSON processing

## Sources Consulted
- Ceph RGW Admin Ops API documentation: https://docs.ceph.com/en/latest/radosgw/adminops/
- Ceph radosgw-admin CLI reference: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- curl --aws-sigv4 documentation: https://curl.se/docs/manpage.html

## Issues Found

1. **Misleading AWS CLI example in "Using the Admin API" section**: The original example used `aws s3api list-buckets`, which is a standard S3 API operation that does not require admin capabilities. This was misleading in a section about using the admin API. Replaced with a `curl` command to the `/admin/bucket` endpoint, which actually requires admin capabilities (`buckets=read` or `buckets=*`).

2. **Broken security audit script**: The `radosgw-admin user list` command outputs a JSON array (e.g., `["alice", "bob"]`). The original script piped this directly to `xargs`, which would fail because `xargs` cannot parse JSON array syntax (brackets, quotes, commas). Added `jq -r '.[]'` to extract individual user IDs before passing to `xargs`. Also removed the unnecessary `--uid ""` flag, which is not a valid argument for `user list`.

## Review Notes
- The `--aws-sigv4` flag in curl requires curl 7.75.0 or later. Older systems may need a different signing approach. This is a minor compatibility note, not an error.
- The available capabilities table is accurate for current Ceph releases (Reef/Squid). Older releases may have fewer capabilities available (e.g., `info` was added in later versions).
- All `radosgw-admin caps add` and `caps rm` command syntax is correct and uses the proper `--uid` and `--caps` flags.
