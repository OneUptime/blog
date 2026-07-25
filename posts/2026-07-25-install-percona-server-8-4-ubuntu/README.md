# Install Percona Server for MySQL 8.4 on Ubuntu Without Repository Conflicts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona Server, MySQL, Ubuntu, APT, Database Installation

Description: Install Percona Server 8.4 from its official Ubuntu repository while detecting mixed package sources before they cause conflicts.

---

Percona recommends installing Percona Server for MySQL through its package repositories. On a clean Ubuntu host, the sequence is short. On a host that has seen Ubuntu MySQL packages, Oracle's MySQL APT repository, or another Percona product, the important work happens before `apt install`.

The safe objective is not merely to make APT finish. It is to ensure that:

- the host is supported by the chosen Percona release
- the Percona 8.4 LTS release repository supplies the server
- no Oracle MySQL repository can replace shared packages later
- APT's proposed transaction is reviewed before it changes the host
- an existing database is migrated or backed up rather than accidentally adopted

Use a new host for production migrations whenever possible. Installing over an existing server combines a package replacement, configuration migration, and data-directory upgrade into one rollback point.

## Start with a Supported, Dedicated Host

Check the Ubuntu release and architecture:

```bash
. /etc/os-release
printf '%s %s\n' "$PRETTY_NAME" "$(dpkg --print-architecture)"
```

Compare the result with Percona's current software and platform lifecycle before installing. Do not force a repository codename from another Ubuntu release into an unsupported host.

The current Percona Server 8.4.10-10 release adds Ubuntu 26.04 support. Percona did not publish an 8.4.9-9 release, so the jump from 8.4.8-8 to 8.4.10-10 is expected. Starting with 8.4.10-10, Percona publishes a mixture of profile-guided optimization (PGO) and non-PGO builds; the build you receive depends on the operating system, architecture, and installation method. Both are supported, and APT normally selects the build for the platform rather than offering a PGO switch at install time. Record the exact package build used by staging and production instead of assuming that every 8.4.10-10 artifact is compiled the same way.

Confirm whether a MySQL-compatible service is already running:

```bash
systemctl status mysql --no-pager
systemctl status mysqld --no-pager
ss -ltnp 'sport = :3306'
```

If an existing instance owns the data you need, stop here and plan a migration. Do not purge packages or initialize a data directory as an installation shortcut.

## Audit Existing Packages and Repository Files

List relevant installed packages:

```bash
dpkg-query -W \
  -f='${binary:Package}\t${Version}\t${Status}\n' \
  'percona-*' 'mysql-*' 'mysql-community-*' 2>/dev/null
```

Inspect configured sources without changing them:

```bash
grep -RHE '^[[:space:]]*deb ' \
  /etc/apt/sources.list \
  /etc/apt/sources.list.d 2>/dev/null
```

Look specifically for:

- `repo.percona.com`
- `repo.mysql.com`
- PPAs that publish MySQL or Percona packages
- old Percona 8.0, Innovation, XtraDB Cluster, testing, or experimental locations

Ubuntu's normal distribution repositories can remain enabled for operating-system dependencies. The dangerous combination is multiple third-party vendors or multiple Percona product tracks offering overlapping database packages.

The `percona-release setup` command manages Percona repository locations. It does not promise to disable Oracle's MySQL APT repository or an unrelated PPA. Disable those source files explicitly through configuration management after confirming they are not needed by another package.

For example, if the audit finds the exact file `/etc/apt/sources.list.d/mysql.list`, preserve it as a disabled file:

```bash
sudo mv \
  /etc/apt/sources.list.d/mysql.list \
  /etc/apt/sources.list.d/mysql.list.disabled
```

Do not copy this command with a guessed filename or a wildcard. Resolve each repository file from the audit first. The rename is recoverable if you later need to inspect or restore the source.

## Install the Official Repository Manager

Refresh package indexes and install the download and signing prerequisites:

```bash
sudo apt update
sudo apt install -y curl gnupg2 lsb-release
```

Download the current generic `percona-release` package from Percona:

```bash
curl -O \
  https://repo.percona.com/apt/percona-release_latest.generic_all.deb
```

Install the local package:

```bash
sudo apt install -y \
  ./percona-release_latest.generic_all.deb
```

APT verifies and records the package. Avoid piping a downloaded script into a root shell.

## Select the Percona Server 8.4 LTS Track

Use `setup` with the exact product identifier:

```bash
sudo percona-release setup ps-84-lts --scheme https
sudo percona-release enable ps-84-lts release --scheme https
sudo apt update
```

Percona documents that `setup` disables current Percona repository locations, enables those needed for the selected product, and refreshes package metadata. `enable` makes the intended GA `release` component explicit. Do not enable `testing` or `experimental` on production hosts.

Review enabled Percona locations:

```bash
sudo percona-release show
grep -RHE '^[[:space:]]*deb ' \
  /etc/apt/sources.list.d/percona* 2>/dev/null
```

`percona-release show` lists enabled Percona repositories, not the packages APT will ultimately choose. Candidate inspection is still required.

## Verify Candidates Before Installing

Ask APT where relevant packages would come from:

```bash
apt-cache policy \
  percona-server-server \
  percona-server-client \
  percona-server-common \
  mysql-server \
  mysql-community-server
```

The candidate for each Percona server package should come from the Percona 8.4 LTS release location for this Ubuntu release and architecture.

Simulate the transaction:

```bash
sudo apt-get --simulate install percona-server-server
```

Read the complete output. Stop if APT proposes to:

- remove an existing production database unexpectedly
- mix Oracle and Percona server or common packages
- install a version from testing or experimental
- downgrade shared libraries without an approved reason
- reuse a data directory whose upgrade path has not been tested

A simulation is especially valuable in automation because the dependency solution can change when repositories publish new builds.

## Decide Whether APT Pinning Is Necessary

Percona documents APT pinning for environments that need to prefer its packages. Pinning is not a substitute for removing an unintended repository, and a priority above 1000 can authorize downgrades.

On a dedicated database host with an approved mixed-source requirement, a narrowly scoped preference might be:

```text
Package: percona-server-*
Pin: release o=Percona Development Team
Pin-Priority: 1001
```

Store it in `/etc/apt/preferences.d/00percona.pref`, then repeat `apt-cache policy` and the simulated install. Confirm the actual `Origin` string in `apt-cache policy`; do not assume a copied pin matches current repository metadata.

If there is no approved reason to keep an overlapping Oracle repository, disabling it is clearer than relying on competing priorities.

## Install Percona Server

Install the server package:

```bash
sudo apt install -y percona-server-server
```

The `-y` option only answers APT's confirmation. Package maintainer scripts can still ask `debconf` questions depending on the Ubuntu and package build. For unattended installations, first install the exact package interactively on a lab image and inspect its templates:

```bash
sudo debconf-show percona-server-server
```

Preseed only question names and choices verified for that package version. Never place a production root password in a committed provisioning script or broad shell history.

Current Percona packages include optional telemetry. Installation-time telemetry and continuous telemetry use separate controls. Review Percona's telemetry documentation before installation if policy requires an opt-out. The install-time form documented by Percona is:

```bash
sudo PERCONA_TELEMETRY_DISABLE=1 \
  apt install -y percona-server-server
```

That environment variable does not by itself disable the continuous telemetry component and agent.

## Handle Authentication Deliberately

Percona Server 8.4 inherits MySQL 8.4's authentication change: `mysql_native_password` is disabled by default. New installations should use `caching_sha2_password` and current connectors.

If a legacy application still requires native password authentication, the temporary compatibility option belongs under `[mysqld]`:

```ini
[mysqld]
mysql_native_password=ON
```

Restarting with that option only restores temporary compatibility. Inventory and migrate accounts, drivers, replication users, and monitoring clients. MySQL removed the plugin as of MySQL 9.0.0, so it is not a durable design.

Do not add the removed `default_authentication_plugin` variable to an 8.4 configuration.

## Verify the Running Server and Package Origin

Check service state and logs:

```bash
systemctl status mysql --no-pager
journalctl -u mysql --since '-10 minutes' --no-pager
```

Query the running server:

```bash
mysql --user=root --password \
  --execute="SELECT VERSION(), @@version_comment;"
```

The result should identify Percona Server and show the expected 8.4 base plus Percona build suffix.

Confirm package state:

```bash
dpkg-query -W \
  -f='${binary:Package}\t${Version}\t${Status}\n' \
  'percona-server-*'

apt-cache policy percona-server-server
```

Then run the normal post-installation security procedure, create named least-privilege administrative accounts, configure backups, and establish monitoring before accepting application traffic.

## Protect Future Upgrades

Installation is not finished until the next unattended APT run is predictable.

- Keep only the approved Percona LTS and required dependency sources enabled.
- Manage repository files and any pin through configuration management.
- Alert if `apt-cache policy percona-server-server` changes origin or release track.
- Review Percona release notes before applying a build.
- Rehearse package upgrades against a restored copy and a representative workload.
- Hold packages only as a time-bounded incident measure; permanent holds silently block security updates.

Back up both data and configuration before every server upgrade. A package downgrade is not a general rollback mechanism for a data directory that a newer server has upgraded.

## Troubleshooting Repository Conflicts

If APT reports conflicts, do not immediately run broad commands such as `apt purge 'mysql*'`. First collect:

```bash
apt-cache policy \
  percona-server-server \
  percona-server-common \
  mysql-common \
  mysql-community-server

dpkg -l | grep -E 'percona|mysql'

sudo apt-get --simulate \
  -o Debug::pkgProblemResolver=yes \
  install percona-server-server
```

Identify the specific package and source that competes with Percona. Resolve it by correcting repository scope or by migrating from the existing server on a separate host. Preserve `/var/lib/mysql` and configuration backups according to a tested recovery plan; package conflict troubleshooting is not authorization to delete either.

## Official Documentation

- [Install Percona Server for MySQL from repositories](https://docs.percona.com/percona-server/8.4/installation.html)
- [Percona Server 8.4.10-10 release notes](https://docs.percona.com/percona-server/8.4/release-notes/8.4.10-10.html)
- [Percona PGO and non-PGO builds](https://docs.percona.com/percona-server/8.4/pgo.html)
- [Use an APT repository for Percona Server 8.4](https://docs.percona.com/percona-server/8.4/apt-repo.html)
- [Install the percona-release repository package](https://docs.percona.com/percona-software-repositories/installing.html)
- [Configure repositories with percona-release](https://docs.percona.com/percona-software-repositories/percona-release.html)
- [Percona Server APT pinning](https://docs.percona.com/percona-server/8.4/apt-pinning.html)
- [Percona Server post-installation](https://docs.percona.com/percona-server/8.4/post-installation.html)
- [Percona telemetry and data collection](https://docs.percona.com/percona-server/8.4/telemetry.html)
- [Percona Server authentication methods](https://docs.percona.com/percona-server/8.4/authentication-methods.html)
