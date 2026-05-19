# Validation Summary: How to Configure Slurm Workload Manager on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Slurm Workload Manager
- MUNGE authentication
- Slurm cgroup resource enforcement
- SlurmDBD accounting
- MySQL/MariaDB
- Linux systemd services

## Sources Consulted
- Slurm official `slurm.conf` documentation: https://slurm.schedmd.com/slurm.conf.html
- Slurm official `cgroup.conf` documentation: https://slurm.schedmd.com/cgroup.conf.html
- Slurm official `slurmdbd.conf` documentation: https://slurm.schedmd.com/slurmdbd.conf.html
- Slurm official accounting and resource limits documentation: https://slurm.schedmd.com/accounting.html
- Slurm official QOS documentation: https://slurm.schedmd.com/qos.html
- Slurm official `sacctmgr` documentation: https://slurm.schedmd.com/sacctmgr.html
- Slurm official `sbatch` documentation: https://slurm.schedmd.com/sbatch.html
- Slurm official `srun` documentation: https://slurm.schedmd.com/srun.html
- Slurm official `scontrol` documentation: https://slurm.schedmd.com/scontrol.html
- Ubuntu package documentation for `slurm-wlm`: https://packages.ubuntu.com/noble/slurm-wlm
- Ubuntu package search results for Slurm daemon and plugin packages: https://packages.ubuntu.com/search?keywords=slurm

## Issues Found
- The introduction expanded Slurm as "Simple Linux Utility for Resource Management", which is historical branding rather than the current product name. Changed it to "Slurm Workload Manager".
- The install commands installed the `slurm-wlm` metapackage plus `slurmd` and `slurmctld` on all nodes, then repeated controller and compute installs. Updated the commands to install `munge` and `slurm-client` on all nodes, `slurmctld` on the controller, and `slurmd` on compute nodes.
- The accounting install command omitted Ubuntu's `slurm-wlm-mysql-plugin`, which is needed for Slurm's MySQL/MariaDB accounting plugin packaging. Added it to the accounting package list.
- The verification commands implied both `slurmctld` and `slurmd` were available everywhere. Split the comments by controller and compute node role.
- The sample `slurm.conf` used older `ControlMachine`/`ControlAddr` syntax. Updated it to the current `SlurmctldHost` syntax and showed the host-address form for environments without DNS.
- The sample `slurm.conf` included `CryptoType=crypto/munge`, `ReturnAddrBindTo=No`, and `JobCompType=jobcomp/none`, which are not valid current Slurm 25.11 `slurm.conf` parameters. Removed them.
- The accounting port key was misspelled as `AccountingStorageTPort`. Corrected it to `AccountingStoragePort`.
- The cgroup task plugin setup omitted `task/affinity`, which Slurm's cgroup documentation recommends for core constraints. Updated `TaskPlugin` to `task/cgroup,task/affinity`.
- The sample `cgroup.conf` used obsolete or misleading settings for current Slurm cgroup configuration. Replaced `CgroupAutomount` and `MaxRAMPercent=98` with `CgroupPlugin=autodetect` and `AllowedRAMSpace=100`.
- The service setup made `/var/spool/slurmd` owned by `slurm`. Slurm's file-permission guidance says `SlurmdSpoolDir` must be writable by root and have permissions allowing job scripts to execute. Updated ownership to `root:root` and set mode `755`.
- The post enabled SlurmDBD accounting in `slurm.conf` but did not mention that `slurmdbd` also requires a configured `/etc/slurm/slurmdbd.conf`. Added a short note so readers do not expect `sacct` and `sacctmgr` to work after package installation alone.

## Review Notes
The post is technically relevant and salvageable. A future improvement would be a dedicated SlurmDBD setup section with database creation, `/etc/slurm/slurmdbd.conf`, permissions, and `systemctl enable --now slurmdbd`, but that would be a larger content addition than this validation pass required.
