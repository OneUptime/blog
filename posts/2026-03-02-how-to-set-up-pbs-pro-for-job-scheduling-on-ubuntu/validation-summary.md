# Validation Summary: How to Set Up PBS Pro for Job Scheduling on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- OpenPBS / PBS Pro (workload manager)
- Ubuntu 22.04 (server OS)
- PostgreSQL (PBS server backing store)
- NFS (kernel server / nfs-common) for shared home directories
- systemd / SysV init for service management
- Shell / qmgr / qsub / qstat / pbsnodes CLI tooling

## Sources Consulted
- OpenPBS official repository and INSTALL guide: https://github.com/openpbs/openpbs
- OpenPBS INSTALL build dependency list (Ubuntu 18.04 / 22.04 / 24.04): https://github.com/openpbs/openpbs/blob/master/INSTALL
- OpenPBS community forum on `resources_available.ncpus` configuration: https://community.openpbs.org/t/setting-resources-available-ncpus-52/2803
- OpenPBS community forum on node creation / queue configuration: https://community.openpbs.org/t/queue-and-associated-nodes/671
- PBS Professional Administrator's Guide (qmgr `create node`, `set node resources_available.*` syntax)
- TORQUE 3.x docs (for confirming `np=N` is TORQUE/legacy syntax, not OpenPBS): http://docs.adaptivecomputing.com/torque/archive/3-0-2/1.2configuring_torque_on_server.php

## Issues Found

1. **Incomplete build dependency list.** The original `apt install` line was missing several packages that the official OpenPBS INSTALL document lists as required for an Ubuntu build: `libtool`, `libical-dev`, `ncurses-dev`, `perl`, `postgresql-server-dev-all`, `swig`, `libxext-dev`, `libxft-dev`, `autoconf`, `automake`, and an explicit `g++`. Without them `./configure` and `make` will fail (notably `libical-dev` for date handling, `swig` for the Python bindings, and `postgresql-server-dev-all` for libpq headers). Also removed `libcjson-dev`, which is only listed for Ubuntu 24.04 and is not required for the Ubuntu 22.04 target used in this post. Replaced `build-essential` with the explicit `gcc`, `g++`, `make`, `autoconf`, `automake`, `libtool` toolchain list so the dependencies match the OpenPBS INSTALL guidance exactly.

2. **`np=8` is TORQUE syntax, not OpenPBS.** The `create node compute01 np=8` command uses the legacy TORQUE/OpenPBS-classic attribute. In modern OpenPBS / PBS Pro, ncpus is auto-detected by `pbs_mom` and is exposed/overridden via `resources_available.ncpus`. Changed both `create node` commands to use `resources_available.ncpus=8` and added a brief comment noting MOM auto-detects ncpus.

## Review Notes

- `resources_default.nodes = 1` on the workq is the legacy `nodes` resource syntax. It still works in OpenPBS for backward compatibility, but the modern recommendation is to use `resources_default.select` (chunk syntax). Left as-is because it remains functional and matches a lot of existing PBS documentation.
- `ngpus` on the example `gpu` queue is treated as a standard resource. OpenPBS ships with `ngpus` as a built-in resource (it appears in the default `resourcedef`), so this is fine, but in practice a site needs to expose GPU counts on the node (`set node compute01 resources_available.ngpus=N`) and typically install/configure NVIDIA drivers + a hook to manage `CUDA_VISIBLE_DEVICES`. Out of scope for the post but worth mentioning to future readers.
- `set server acl_hosts = headnode` only takes effect when `acl_host_enable = True`. The post does not enable it, so this line is effectively a no-op until `acl_host_enable` is set. Not technically wrong (it just doesn't restrict anything yet), so left untouched.
- The `sudo /etc/init.d/pbs start` invocation works because the OpenPBS install drops a SysV-style init script that systemd can shim; the post correctly shows the `systemctl` alternative right after.
- The `pbs_postinstall` path `/opt/pbs/libexec/pbs_postinstall` is correct and matches the official INSTALL doc.
- The `pbsnodes -c` (clear offline) and `pbsnodes -o` (mark offline) flags are correct.
- `qstat -B` for server status, `qhold`/`qrls` for job hold/release, and the `#PBS` directive syntax in the example job script are all correct.
