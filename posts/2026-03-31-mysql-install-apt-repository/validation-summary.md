# Validation Summary: How to Install MySQL Using the APT Repository

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 / 8.4 LTS
- APT package manager
- Ubuntu (20.04, 22.04, 24.04)
- Debian (11, 12)
- mysql-apt-config package
- systemd (systemctl)
- APT version pinning

## Sources Consulted
- MySQL APT Repository Quick Guide: https://dev.mysql.com/doc/mysql-apt-repo-quick-guide/en/
- MySQL APT Repository download page: https://dev.mysql.com/downloads/repo/apt/
- MySQL 8.0 Reference Manual — Installing MySQL on Linux Using the MySQL APT Repository: https://dev.mysql.com/doc/refman/8.0/en/linux-installation-apt-repo.html
- Debian APT Pinning documentation: https://wiki.debian.org/AptConfiguration

## Issues Found
No technical issues found.

## Review Notes
- The `mysql-apt-config` package version (`0.8.29-1`) referenced in the download URL will become outdated as Oracle releases newer versions. The URL pattern `https://dev.mysql.com/get/mysql-apt-config_VERSION_all.deb` is correct, but readers should check https://dev.mysql.com/downloads/repo/apt/ for the latest version number.
- The sample `apt update` output and `mysql.list` contents use `jammy` (Ubuntu 22.04) as an example. Users on other distributions will see their own codename (e.g., `focal`, `noble`, `bullseye`, `bookworm`).
- The description mentions "GPG key verification" but the post does not include explicit GPG key verification steps. This is acceptable because the `mysql-apt-config` .deb package automatically installs the MySQL GPG signing key during `dpkg -i`, so manual key import is not required.
- `mysql-workbench-community` is listed as an available package. MySQL Workbench availability may vary by platform and Ubuntu/Debian version; it may not be available on all supported distributions.
- The `md5sum` verification step could recommend SHA-256 instead, as it is a stronger hash. However, MySQL's download page does provide MD5 checksums, so the command is not incorrect.
