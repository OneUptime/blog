# Validation Summary: How to Use the CephFS Shell

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph CephFS Shell (`cephfs-shell`)
- Rook-Ceph (Kubernetes operator for Ceph)
- Kubernetes (`kubectl`)
- CephFS extended attributes (xattrs) for layout and quota management

## Sources Consulted
- Ceph official documentation for cephfs-shell: https://docs.ceph.com/en/latest/cephfs/cephfs-shell/
- Ceph source code for cephfs-shell (src/tools/cephfs/shell.py) — verified CLI flags, command support, and prompt format
- Ceph man page for cephfs-shell — verified argument parser definitions and usage synopsis

## Issues Found

1. **Removed invalid pip install instructions (Installation section):** The blog listed `pip install cephfs` and `pip install cephfs-shell` as installation options. Neither package is published on PyPI. The `cephfs` Python module is a C extension distributed as part of Ceph system packages, and `cephfs-shell` has a `setup.py` only for local development builds. Removed both pip lines; kept the apt-get method with a note that the Ceph apt repository is required.

2. **Removed non-existent `--conf` flag (Basic Usage and Connect to Specific Filesystem sections):** The blog used `--conf /etc/ceph/ceph.conf` in two places. This flag does not exist in cephfs-shell. The tool's `-c`/`--config` flag points to the shell's own configuration file (`cephfs-shell.conf`), not to `ceph.conf`. The Ceph cluster configuration is discovered automatically by libcephfs using standard Ceph config lookup. Removed all `--conf` references.

3. **Fixed `du -h` to `du` (Interactive Commands and Non-Interactive sections):** The `du` command in cephfs-shell does not support a `-h` (human-readable) flag. It only supports `-r` (recursive). The `-h` would be interpreted as the argparse help flag. Changed `du -h .` to `du .` and `du -h /myapp` to `du /myapp`.

4. **Fixed shell prompt format (all interactive examples):** The blog showed prompts as `CephFS:/>` and `CephFS:/mydir>`. The actual cephfs-shell prompt format is `CephFS:~/>>>` (with a tilde prefix and triple `>>>` suffix). Corrected all prompt instances to match the real format (e.g., `CephFS:~/>>>` for root, `CephFS:~/mydir>>>` for subdirectories).

## Review Notes
- The `--fs` flag for specifying a target filesystem is correct and uses the long form properly.
- The `-b` flag for batch script mode is correct.
- The non-interactive syntax using `--` to separate options from commands is consistent with the documented synopsis.
- All interactive commands listed (ls, cd, mkdir, put, get, rm, stat, du, quit, setxattr, getxattr, chmod) are verified to exist in cephfs-shell.
- The batch script example uses `chmod` which is a valid cephfs-shell command, though the argument order in cephfs-shell is `chmod <mode> <path>` (matching standard POSIX convention), which the example follows correctly.
- The `cephfs-shell` package availability may vary by distribution; users may need to add Ceph repositories first.
