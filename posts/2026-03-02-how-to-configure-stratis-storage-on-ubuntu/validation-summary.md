# Validation Summary: How to Configure Stratis Storage on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Stratis
- stratisd
- stratis-cli
- systemd
- XFS
- Linux block devices
- /etc/fstab
- Bash

## Sources Consulted
- Stratis official how-to: https://stratis-storage.github.io/howto/
- Stratis CLI man page: https://www.mankier.com/8/stratis
- Red Hat Enterprise Linux Stratis documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_file_systems/setting-up-stratis-file-systems
- Ubuntu Packages search for official package availability: https://packages.ubuntu.com/search?keywords=stratis&searchon=names&suite=all&section=all
- stratis-cli upstream package documentation: https://pypi.org/project/stratis-cli/

## Issues Found
- Ubuntu repository availability was incorrect. The post claimed `stratisd` and `stratis-cli` are available in Ubuntu repositories starting with Ubuntu 20.04, but Ubuntu's official package search shows no Stratis packages in the current indexed suites, and old Focal source package lookups also returned no Stratis source package. I changed the installation section to state that Stratis is not currently packaged in Ubuntu's official repositories and that the remaining commands assume upstream or organization-provided packages are installed.
- The version check was incomplete. `stratis --version` reports the CLI version, not the daemon version. I added `stratis daemon version`.
- The `/etc/fstab` guidance used the older `x-systemd.requires=stratisd.service` option. Current Stratis documentation recommends `x-systemd.requires=stratis-fstab-setup@<pool-uuid>.service` so the pool is started before the filesystem mount. I updated the fstab text and examples accordingly.
- The snapshot cleanup script parsed the first column from `stratis filesystem list`, which is the pool name, not the filesystem or snapshot name. I changed it to filter and print the filesystem-name column.
- The pool and filesystem description was slightly outdated. Current `stratis pool list` output includes properties, UUID, and alerts, and current Stratis supports optional filesystem sizing. I updated those statements.
- The cleanup example only unmounted and destroyed one filesystem before destroying the pool even though the tutorial created two. I added commands for the `projects` filesystem.

## Review Notes
The post is technically relevant and the core Stratis pool, filesystem, mount, snapshot, monitoring, and logging commands are consistent with current Stratis documentation once Stratis is installed. The main caveat is that this remains a poor fit for a simple Ubuntu apt-based tutorial unless the article later adds a fully verified upstream build or repository installation path.
