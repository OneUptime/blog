# Validation Summary: How to Configure QoS Parameters for Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- radosgw-admin CLI
- Ceph configuration (ceph.conf)
- S3/Swift object storage QoS
- Rook (tagged but not directly used in examples)

## Sources Consulted
- Ceph official documentation: RGW Rate Limiting (https://docs.ceph.com/en/latest/radosgw/rate-limiting/)
- Ceph official documentation: RGW Admin CLI (https://docs.ceph.com/en/latest/radosgw/admin/)
- Ceph official documentation: RGW Quota Management (https://docs.ceph.com/en/latest/radosgw/admin/#quota-management)
- Ceph official documentation: Configuration Reference (https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/)

## Issues Found

1. **Per-user rate limit commands were completely wrong.** The post used `radosgw-admin user modify --rate-limit-enabled=true --max-read-ops=...` which is not a valid command. Replaced with the correct `radosgw-admin ratelimit set --ratelimit-scope=user --uid=alice ...` followed by `radosgw-admin ratelimit enable --ratelimit-scope=user --uid=alice`. Rate limiting uses its own dedicated `ratelimit` subcommand and enabling is a separate step.

2. **Per-bucket rate limit commands used a non-existent subcommand.** The post used `radosgw-admin bucket limit set` and `radosgw-admin bucket limit get`, which do not exist. Replaced with `radosgw-admin ratelimit set --ratelimit-scope=bucket --bucket=<name> ...` and the corresponding `ratelimit enable` and `ratelimit get` commands.

3. **Global rate limiting used wrong command.** The post used `radosgw-admin zone modify --rgw-zone=default --max-read-ops=...` which is not how global rate limits are configured. Replaced with `radosgw-admin global ratelimit set --ratelimit-scope=user ...` and `radosgw-admin global ratelimit enable --ratelimit-scope=user`.

4. **Inline comments after backslash line continuations broke bash syntax.** Several commands had patterns like `--max-read-bytes=536870912 \    # 512MB/s` where the inline comment after the backslash would prevent proper line continuation in bash. Removed all inline comments from multi-line commands.

5. **Rate limit unit comments were incorrect.** Comments described byte rate limits as "per second" (e.g., "512MB/s") but Ceph RGW rate limits are per minute. Updated comments to reflect correct units (e.g., "512MB/min").

6. **Misleading ops rate comment.** The original comment said "1000 ops/minute" but the values set were 500 read + 200 write = 700 ops. Updated the comment to accurately describe the configured values.

7. **Deprecated configuration option `rgw_num_rados_handles`.** This option was deprecated and removed in modern Ceph versions (Nautilus and later). Removed from the thread pool configuration example.

8. **Per-bucket quota syntax was incorrect.** The post used `radosgw-admin quota set --quota-scope=bucket --uid=alice --bucket=uploads` which conflates user-level default bucket quota with individual bucket quota. For targeting a specific bucket, the correct syntax is `radosgw-admin quota set --bucket=uploads ...` without `--quota-scope` or `--uid`. Similarly fixed `quota enable` for the specific bucket.

9. **Rate limit check command was suboptimal.** The post used `radosgw-admin user info | grep rate` to check rate limits. Replaced with the purpose-built `radosgw-admin ratelimit get --ratelimit-scope=user --uid=alice` command.

## Review Notes
- The "mClock backend limits" mentioned in the overview section is not covered in the tutorial body. This is fine as a mention but readers may expect a section on it.
- The thread pool configuration section assumes a traditional systemd-managed Ceph deployment. For Rook/cephadm-managed clusters (which the tags suggest), configuration would be applied differently via CephCluster CR or `ceph config set` commands rather than editing ceph.conf directly.
- The `rgw_thread_pool_size` option is primarily relevant to the CivetWeb frontend. For the Beast frontend (default since Nautilus), thread count is controlled via the `rgw_frontends` configuration parameter.
