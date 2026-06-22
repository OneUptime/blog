# Validation Summary: How to Fix 'Disk Full' Errors in Linux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Linux disk and inode usage
- GNU coreutils (`df`, `du`, `sort`, `truncate`)
- GNU findutils (`find`)
- Package managers (`apt`, `dnf`, `yum`, `dpkg`, `rpm`)
- systemd journal and timers
- logrotate
- lsof
- Docker cleanup commands
- Kubernetes kubelet container log settings
- LVM, ext4, and XFS filesystem resizing
- Linux disk quotas

## Sources Consulted
- GNU Coreutils `df` manual: https://www.gnu.org/software/coreutils/manual/html_node/df-invocation.html
- GNU Coreutils `du` manual: https://www.gnu.org/software/coreutils/manual/html_node/du-invocation.html
- Local GNU/Linux man pages for `find`, `resize2fs`, `logrotate`, `systemctl`, `systemd-analyze`, `apt-get`, and `dpkg`
- Debian `apt-get(8)` man page: https://manpages.debian.org/apt/apt-get.8
- DNF command reference: https://dnf.readthedocs.io/en/latest/command_ref.html
- Red Hat documentation for install-only kernel package retention: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-yum
- Red Hat Satellite documentation showing `dnf remove --oldinstallonly` for RHEL 8+ and `package-cleanup --oldkernels` for RHEL 7 and earlier: https://docs.redhat.com/en/documentation/red_hat_satellite/6.19/pdf/provisioning_hosts/Red_Hat_Satellite-6.19-Provisioning_hosts-en-US.pdf
- systemd `journalctl` manual: https://www.freedesktop.org/software/systemd/man/journalctl.html
- systemd timer manual: https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- Docker `system prune` reference: https://docs.docker.com/reference/cli/docker/system/prune/
- Docker `image prune` reference: https://docs.docker.com/reference/cli/docker/image/prune/
- Kubernetes kubelet configuration reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes logging architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- `lsof` documentation: https://lsof.readthedocs.io/
- `resize2fs(8)` manual: https://man7.org/linux/man-pages/man8/resize2fs.8.html
- `xfs_growfs(8)` manual: https://man7.org/linux/man-pages/man8/xfs_growfs.8.html
- Red Hat XFS grow documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/storage_administration_guide/xfsgrow

## Issues Found
- The RHEL/CentOS old-kernel cleanup example used `dnf install yum-utils` followed by `package-cleanup --oldkernels --count=2`. `package-cleanup` is the legacy yum-utils path for RHEL/CentOS 7 and earlier, while current dnf-based systems support `dnf remove --oldinstallonly`. Updated the example to separate the current dnf command from the legacy yum-utils command.
- The XFS filesystem resize example used `xfs_growfs /dev/mapper/vg-lv_root`. XFS grow examples and documentation commonly use the mounted filesystem path, and using the mount point avoids failures on systems that reject the block-device argument. Updated the command to `sudo xfs_growfs /`.

## Review Notes
Most commands are technically valid, but several cleanup operations are intentionally destructive or environment-specific. In particular, Docker prune commands, package autoremove commands, `find ... -delete`, log truncation, and quota setup should be reviewed against the target host before use. The Kubernetes log path and kubelet config path are common kubeadm/Linux defaults but can vary by distribution and container runtime configuration.
