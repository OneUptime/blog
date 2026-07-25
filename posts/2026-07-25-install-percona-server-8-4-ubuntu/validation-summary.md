# Validation Summary: Install Percona Server for MySQL 8.4 on Ubuntu Without Repository Conflicts

## Status
validated

## Post Type
Technical installation and repository-conflict prevention guide

## Technologies Covered
- Percona Server for MySQL 8.4 LTS
- Percona Server 8.4.10-10 PGO and non-PGO builds
- Ubuntu package management, including deb822 sources on Ubuntu 24.04 and later
- APT repositories, package candidates, transaction simulation, and pinning
- `percona-release`
- Debian packages and `debconf`
- systemd and the system journal
- MySQL 8.4 authentication plugins
- Percona installation-time and continuous telemetry

## Sources Consulted
- [Install Percona Server for MySQL from repositories](https://docs.percona.com/percona-server/8.4/installation.html)
- [Percona Server for MySQL 8.4.10-10 release notes](https://docs.percona.com/percona-server/8.4/release-notes/8.4.10-10.html)
- [Percona Release Lifecycle Overview](https://www.percona.com/release-lifecycle-overview/)
- [Profile-Guided Optimization and non-PGO builds](https://docs.percona.com/percona-server/8.4/pgo.html)
- [Use APT repositories for Percona Server for MySQL 8.4](https://docs.percona.com/percona-server/8.4/apt-repo.html)
- [Install the `percona-release` package](https://docs.percona.com/percona-software-repositories/installing.html)
- [Configure Percona repositories with `percona-release`](https://docs.percona.com/percona-software-repositories/percona-release.html)
- [APT pinning for Percona Server for MySQL 8.4](https://docs.percona.com/percona-server/8.4/apt-pinning.html)
- [Percona Server post-installation guidance](https://docs.percona.com/percona-server/8.4/post-installation.html)
- [Percona telemetry and data collection](https://docs.percona.com/percona-server/8.4/telemetry.html)
- [Percona Server authentication methods](https://docs.percona.com/percona-server/8.4/authentication-methods.html)
- [MySQL 8.4 native pluggable authentication](https://dev.mysql.com/doc/refman/8.4/en/native-pluggable-authentication.html)
- [MySQL 8.4 changes since MySQL 8.0](https://dev.mysql.com/doc/refman/8.4/en/mysql-nutshell.html)
- [Ubuntu package-management documentation](https://ubuntu.com/server/docs/package-management/)
- [Debian `sources.list(5)` manual](https://manpages.debian.org/testing/apt/sources.list.5.en.html)
- [Debian `apt-secure(8)` manual](https://manpages.debian.org/testing/apt/apt-secure.8.en.html)
- [Debian `apt-cache(8)` manual](https://manpages.debian.org/testing/apt/apt-cache.8.en.html)
- [Debian `apt-get(8)` manual](https://manpages.debian.org/testing/apt/apt-get.8.en.html)
- [Debian `apt_preferences(5)` manual](https://manpages.debian.org/testing/apt/apt_preferences.5.en.html)
- [Debian `dpkg-query(1)` manual](https://manpages.debian.org/testing/dpkg/dpkg-query.1.en.html)

## Issues Found
- The repository-audit commands matched only legacy one-line `deb` entries. Ubuntu 24.04 and later use deb822 `.sources` files by default, so an overlapping repository expressed with `Types:` and `URIs:` fields could be missed. Updated both source-inspection commands to display relevant fields from one-line and deb822 source definitions.
- The local `percona-release` installation was described as though APT authenticated the downloaded `.deb`. APT authenticates packages obtained through a signed repository metadata chain, but does not establish that chain for an arbitrary local package file. Changed the sentence to state accurately that APT installs and records the local package and resolves its dependencies.
- The transaction-simulation checklist implied that `apt-get --simulate` could reveal reuse of an existing data directory. Simulation prints planned package operations but does not execute maintainer scripts, where data-directory questions and checks occur. Moved the data-directory warning outside the simulated-operation list and documented the limitation.
- The pinning guidance did not make clear how to inspect the Release-file `Origin` value used by `Pin: release o=...`. Package-specific `apt-cache policy` output focuses on candidate selection, while `apt-cache policy` without package arguments displays source priorities and release metadata. Added the no-argument command requirement before repeating package-specific checks.

## Review Notes
- Percona's documentation identifies 8.4.10-10, released on June 30, 2026, as the current 8.4 release on the validation date. It confirms that 8.4.9-9 was not released, Ubuntu 26.04 support was added, and builds may be PGO or non-PGO depending on the platform and installation method.
- The `percona-release` download URL returned HTTP 200 with the expected Debian-package content type during validation.
- The documented `ps-84-lts` repository commands, package names, debconf behavior, telemetry environment variable, continuous-telemetry distinction, `mysql_native_password=ON` configuration, and removal of `default_authentication_plugin` in MySQL 8.4 were confirmed against official documentation.
- The installation commands were documentation-validated rather than executed because the review workspace is not the target Ubuntu database host and a live installation would modify the review system.
- The phrase "current Percona Server 8.4.10-10 release" is intentionally date-sensitive and should be rechecked when the post is republished or after a newer Percona 8.4 release appears.
