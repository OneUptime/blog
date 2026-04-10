# Validation Summary: How to Configure Temporary Directory Settings in Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (storage cluster daemon configuration)
- Rook (Kubernetes Ceph operator)
- systemd tmpfiles.d
- Kubernetes (kubectl)

## Sources Consulted
- [Ceph source: global.yaml.in](https://github.com/ceph/ceph/blob/main/src/common/options/global.yaml.in) — verified `run_dir`, `tmp_dir`, and `admin_socket` option definitions, defaults, and flags
- [Ceph General Config Reference](https://docs.ceph.com/en/latest/rados/configuration/general-config-ref/) — verified config option semantics and metavariables
- [Ceph ceph-conf.rst documentation](https://github.com/ceph/ceph/blob/main/doc/rados/configuration/ceph-conf.rst) — verified metavariable list (`$cluster`, `$name`, `$type`, `$id`, `$pid`, `$host`)
- [Red Hat Ceph Metavariables Reference](https://docs.redhat.com/en/documentation/red_hat_ceph_storage/1.2.3/html/ceph_configuration_guide/metavariables) — cross-checked officially documented metavariables
- [Rook Toolbox Documentation](https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/) — verified toolbox pod naming and capabilities
- [rook/kubectl-rook-ceph#77](https://github.com/rook/kubectl-rook-ceph/issues/77) — confirmed admin socket commands cannot run from toolbox pod
- [systemd-tmpfiles(8) man page](https://man7.org/linux/man-pages/man8/systemd-tmpfiles.8.html) — verified tmpfiles command syntax

## Issues Found

1. **`ceph config set global run_dir` is invalid**: The `run_dir` option has the `startup` flag in Ceph source, meaning it cannot be set via the monitor config database (`ceph config set`). It must be configured in `ceph.conf` before daemon startup. Removed the `ceph config set` command and added a clarifying comment.

2. **Admin socket default template was wrong**: The config section presented `$cluster-$type.$id.$pid.$cctid.asok` as if it were the default template. The actual default is `$run_dir/$cluster-$name.asok`. Restructured the section to show the real default first, then the `$pid.$cctid` variant as an optional custom configuration for avoiding socket name collisions.

3. **Missing `$name` metavariable**: The variables list omitted `$name` (shorthand for `$type.$id`), which is the variable used in the actual default template. Added it.

4. **`$cctid` presented without context**: `$cctid` (CephContext identifier) is real but undocumented and not part of the default. Added a note clarifying its purpose (multi-instance processes).

5. **Rook toolbox cannot access daemon admin sockets**: The post incorrectly showed `ceph daemon osd.0 perf dump` and `ceph daemon osd.0 config show` being run from the toolbox pod. Admin sockets are Unix domain sockets local to each daemon pod and are not accessible from the toolbox. Fixed all Rook examples to exec into the specific daemon pod instead, and noted that the toolbox can still run cluster-wide commands via the monitor.

## Review Notes
- The `tmp_dir` option has the `runtime` flag, so `ceph config set global tmp_dir` is valid — this was confirmed correct.
- The `pid_file` default in Ceph source is an empty string that gets populated at runtime by `common_preinit()`. The blog's representation (`$cluster-$type.$id.pid`) is a reasonable approximation but not the literal config default. Left as-is since it correctly conveys the resulting path format.
- The `systemd-tmpfiles --create` command syntax was verified as correct.
- The tmpfiles.d permission modes (0755 for run dirs, 0750 for tmp) are reasonable. The blog's `chmod 750` for run_dir in the manual creation section is more restrictive than the 0755 in tmpfiles.d — this inconsistency is minor and left as-is since both are valid choices depending on security requirements.
