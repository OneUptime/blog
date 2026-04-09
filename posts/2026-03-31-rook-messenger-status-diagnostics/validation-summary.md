# Validation Summary: How to Check Messenger Status and Connection Diagnostics in Ceph

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Ceph (messenger layer, msgr1/msgr2 protocols)
- Rook (Kubernetes operator for Ceph)
- Kubernetes (kubectl, pod exec)
- Ceph admin socket and `ceph tell` CLI

## Sources Consulted
- Ceph Messenger v2 documentation: https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Ceph Network Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph Admin Socket documentation: https://docs.ceph.com/en/latest/rados/operations/admin-socket/
- Ceph Monitoring documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph source code (`global.yaml.in` for ms_cluster_mode valid values): https://github.com/ceph/ceph/blob/main/src/common/options/global.yaml.in
- Rook controller source (`spec.go` for pod labels): https://github.com/rook/rook/blob/master/pkg/operator/ceph/controller/spec.go
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/

## Issues Found

1. **OSD msgr2 port was incorrect (High severity):** The post claimed OSD msgr2 uses port `3302+`. This is wrong — OSDs use port range `6800+` for both msgr1 and msgr2 protocols. Only monitors have distinct ports (6789 for msgr1, 3300 for msgr2). Fixed to `6800+`.

2. **`ceph daemon` commands run from toolbox pod (Critical severity):** All `ceph daemon` commands were shown running from `deploy/rook-ceph-tools` (the Rook toolbox). `ceph daemon` requires access to the daemon's local Unix admin socket, which is only available inside the daemon's own pod. Fixed by: (a) adding a note explaining `ceph daemon` vs `ceph tell`, (b) converting most commands to `ceph tell` which routes through the monitor and works from the toolbox, (c) for commands requiring admin socket access (connection dumps), changed to exec into the actual daemon pod.

3. **`dump_connections` is not a standard OSD admin socket command (Medium severity):** The post used `ceph daemon osd.0 dump_connections` which is not a documented Ceph admin socket command for OSDs. Replaced with `objecter_requests` (for outgoing connections via admin socket) and `dump_ops_in_flight` (for in-flight operations via `ceph tell`).

4. **`ms_cluster_mode` value `none` does not exist (Medium severity):** The post listed three values: `secure`, `crc`, and `none`. The valid values are only `secure` and `crc`. The default is `"crc secure"` (a preference-ordered list). Removed `none` and added the default value information.

5. **Pod label selectors used non-standard Rook labels (Low severity):** The log-checking command used `-l ceph_daemon_type=osd,ceph_daemon_id=0`, which are internal Rook labels. Changed to the standard/primary Rook labels: `app=rook-ceph-osd,ceph-osd-id=0`.

6. **Summary section port references were misleading (Low severity):** The summary said "3300 for msgr2" without qualifying this applies only to monitors. Fixed to clarify: "3300 for MON msgr2, 6789 for MON msgr1, 6800+ for OSD msgr1/msgr2".

7. **Monitor connection command changed:** Changed `dump_connections` on the monitor to `sessions`, which is a documented monitor admin socket command for viewing client sessions.

## Review Notes
- The claim "Rook enables msgr2 by default on Ceph Nautilus and later" is technically Ceph's own default (`ms_bind_msgr2 = true`), not something Rook specifically enables. Acceptable for a blog audience but slightly imprecise.
- The `/dev/tcp` connectivity test technique is correct and well-suited for container environments where `nc`/`netcat` may not be installed. The explicit `bash -c` invocation correctly ensures bash handles the pseudo-device.
- The `AsyncMessenger::Worker-0` perf counter section name is correct. Readers should note there may be multiple worker sections (`Worker-0`, `Worker-1`, etc.).
- The `ceph tell` approach has one limitation vs `ceph daemon`: it requires a functioning monitor. If monitors are down, users would need to exec into daemon pods directly and use `ceph daemon` with the admin socket.
