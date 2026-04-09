# Validation Summary: How to Deploy Ceph Using ceph-salt

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ceph-salt (Salt-based Ceph deployment tool)
- Ceph (distributed storage system)
- cephadm (Ceph daemon management tool)
- SaltStack (Salt master/minion configuration management)
- SUSE Enterprise Storage / openSUSE

## Sources Consulted
- ceph-salt GitHub repository: https://github.com/ceph/ceph-salt
- ceph-salt source code (`cli/__init__.py` for CLI commands, `config_shell.py` for config paths)
- ceph-salt README and man pages
- Official SaltStack documentation for `salt-key` flags

## Issues Found

1. **Config shell paths used wrong casing and naming convention.** The blog used PascalCase paths like `/Cluster/Minions`, `/Cluster/Roles/Admin`, `/Cluster/Roles/Bootstrap`. The actual ceph-salt config shell uses lowercase/snake_case paths: `/ceph_cluster/minions`, `/ceph_cluster/roles/admin`, `/ceph_cluster/roles/bootstrap`. Fixed all config shell paths throughout the post.

2. **Non-existent `/Cluster/Roles/Tuned/Storage` role.** The blog referenced a "Tuned/Storage" role that does not exist in ceph-salt. The actual tuned roles are `latency` and `throughput`. Removed the fabricated role references and replaced with the required `/ceph_cluster/roles/cephadm` role assignments, which is the standard workflow shown in the official README.

3. **Non-existent `/Deployment/Bootstrap/Ceph_conf/MSGRv2 enable` path.** This config path does not exist. The top-level bootstrap config group is `/cephadm_bootstrap`, not `/Deployment/Bootstrap`. There is no `MSGRv2` sub-option. Removed this line and replaced with `/ssh generate` which is a required step in the ceph-salt workflow.

4. **Incorrect Mon_IP path.** `/Deployment/Bootstrap/Mon_IP` was changed to the correct `/cephadm_bootstrap/mon_ip`.

5. **`ceph-salt diag` does not exist.** There is no `diag` subcommand in ceph-salt. The valid CLI subcommands are: `config`, `status`, `export`, `import`, `apply`, `disengage-safety`, `purge`, `update`, `reboot`, `stop`. Changed to `ceph-salt status`, which validates configuration and reports errors.

6. **`--log-level` flag position was wrong.** `--log-level` is a global option on the parent CLI group, not a flag on the `apply` subcommand. `ceph-salt apply --log-level info` would fail. Changed to the correct `ceph-salt --log-level info apply`.

7. **`pip install ceph-salt` does not work.** ceph-salt is not published on PyPI. The primary installation method is via `zypper install ceph-salt` on SUSE/openSUSE. Alternatively, it can be installed from source by cloning the repo and running `pip install .`. Updated the installation section accordingly.

## Review Notes
- ceph-salt is primarily targeted at SUSE Enterprise Storage environments. The blog correctly notes this but readers on other distributions should be aware that package availability may be limited.
- The `salt-key -A` command is correct for accepting all pending keys.
- The post-deployment cephadm commands (`ceph orch apply osd`, `ceph status`, `ceph orch ls`) are all correct.
- The `ceph-salt apply node4.example.com` syntax for targeting a specific minion is confirmed correct from the source code.
