# Validation Summary: How to Set Up Connection Pooling for Ceph RGW

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- Beast HTTP frontend (Ceph RGW)
- RADOS (Reliable Autonomic Distributed Object Store)
- Python boto3 / botocore (AWS SDK for Python)
- Go AWS SDK v2
- HAProxy
- Kubernetes

## Sources Consulted
- [Ceph HTTP Frontends documentation (source)](https://github.com/ceph/ceph/blob/main/doc/radosgw/frontends.rst) — verified all Beast frontend configuration options
- [Ceph Object Gateway Config Reference (Nautilus)](https://ets.docs.euro-linux.com/ceph/nautilus/radosgw/config-ref.html) — searched for rgw_max_idle_connection_num, rgw_idle_connection_timeout, rgw_rados_pool_autoscale_bias
- [Ceph RGW config source (rgw.yaml.in)](https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in) — confirmed absence of fabricated config options
- [Red Hat Ceph Storage Object Gateway Config Reference](https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/object_gateway_guide/rgw-configuration-reference-rgw) — cross-referenced config options
- [Ceph Logging and Debugging documentation](https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/) — verified injectargs vs config set syntax
- [HAProxy configuration manual](https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/) — verified http-server-close / http-keep-alive interaction
- [HAProxy Ingress issue #1367](https://github.com/jcmoraisjr/haproxy-ingress/issues/1367) — confirmed http-server-close is overridden by http-keep-alive

## Issues Found

1. **`rgw_max_idle_connection_num` is not a valid Ceph config option.** This option does not exist in the Ceph source code (rgw.yaml.in) or any version of the official Ceph documentation. Removed the command and replaced with an explanation that Beast supports HTTP/1.1 keep-alive by default, controlled by the `request_timeout_ms` parameter already configured in the frontend string.

2. **`rgw_idle_connection_timeout` is not a valid Ceph config option.** Same as above — not found in any Ceph documentation or source code. Removed alongside the previous option.

3. **`rgw_rados_pool_autoscale_bias` is not a valid Ceph config option and is unrelated to connection pooling.** This option does not appear in the Ceph config reference. Even if a similar option existed, pool autoscale bias relates to PG autoscaler behavior, not RADOS connection handle pooling. Removed the command from the RADOS Connection Handles section.

4. **HAProxy: `option http-server-close` in defaults conflicts with `option http-keep-alive` in backend.** These options are mutually exclusive — the backend's `http-keep-alive` silently overrides the default's `http-server-close`, making the latter a no-op. For a connection pooling tutorial, having `http-server-close` in defaults is confusing. Removed it from the defaults section.

5. **Monitoring: `ceph tell osd.* injectargs --debug-rados 10` uses deprecated syntax.** Modern Ceph (Luminous and later) uses `ceph tell <daemon> config set <name> <value>` instead of `injectargs`. Updated to `ceph tell osd.* config set debug_rados 10`.

## Review Notes
- The `ss` command used to count established TCP connections on RGW pods may not be available in minimal Ceph container images. Users may need to install `iproute2` or use `netstat` as a fallback. Not changed since this is environment-dependent.
- Increasing `debug_rados` to level 10 on all OSDs is a heavy operation that generates large volumes of log output. It does not directly show connection pool utilization. A note about this could improve the monitoring section, but was not added to avoid scope creep.
- The Python boto3 and Go AWS SDK examples are correct and use current APIs.
- The `rgw_num_rados_handles` config option is confirmed valid and documented.
