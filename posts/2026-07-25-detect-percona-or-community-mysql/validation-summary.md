# Validation Summary: How to Verify Whether a Host Is Running Percona Server or Community MySQL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Percona Server for MySQL 8.4
- MySQL Community Server 8.4
- MySQL command-line clients and SQL system metadata
- Linux systemd, procfs, and socket inspection
- Debian/Ubuntu APT and dpkg package management
- RPM and DNF package management
- Docker
- Kubernetes and kubectl

## Sources Consulted
- [Percona Server for MySQL 8.4 post-installation and version output](https://docs.percona.com/percona-server/8.4/post-installation.html)
- [Percona Server for MySQL 8.4 version-number format](https://docs.percona.com/percona-server/8.4/server-version-numbers.html)
- [Percona Server for MySQL 8.4 system variables](https://docs.percona.com/percona-server/8.4/percona-server-system-variables.html)
- [Percona Server for MySQL 8.4 telemetry option and component](https://docs.percona.com/percona-server/8.4/telemetry.html)
- [Percona Server for MySQL 8.4 APT installation](https://docs.percona.com/percona-server/8.4/apt-repo.html)
- [Percona Server for MySQL 8.4 DNF installation](https://docs.percona.com/percona-server/8.4/yum-repo.html)
- [Percona Server for MySQL 8.4 downloaded RPM package names](https://docs.percona.com/percona-server/8.4/yum-download-rpm.html)
- [MySQL 8.4 server system variables](https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html)
- [MySQL 8.4 information functions](https://dev.mysql.com/doc/refman/8.4/en/information-functions.html)
- [MySQL 8.4 client connection and TLS options](https://dev.mysql.com/doc/refman/8.4/en/connection-options.html)
- [MySQL 8.4 mysqladmin reference](https://dev.mysql.com/doc/refman/8.4/en/mysqladmin.html)
- [MySQL 8.4 component information](https://dev.mysql.com/doc/refman/8.4/en/obtaining-component-information.html)
- [MySQL 8.4 server/client version distinction](https://dev.mysql.com/doc/c-api/8.4/en/c-api-server-client-versions.html)
- [Debian dpkg-query reference](https://manpages.debian.org/trixie/dpkg/dpkg-query.1.en.html)
- [RPM query reference](https://rpm.org/docs/4.20.x/man/rpm.8)
- [DNF repoquery reference](https://dnf.readthedocs.io/en/latest/command_ref.html#repoquery-command)
- [systemctl reference](https://man7.org/linux/man-pages/man1/systemctl.1.html)
- [Linux procfs executable-link reference](https://man7.org/linux/man-pages/man5/proc_pid_exe.5.html)
- [GNU readlink reference](https://www.gnu.org/software/coreutils/manual/html_node/readlink-invocation.html)
- [Linux ss reference](https://man7.org/linux/man-pages/man8/ss.8.html)
- [Docker container inspect reference](https://docs.docker.com/reference/cli/docker/container/inspect/)
- [Docker image digest reference](https://docs.docker.com/reference/cli/docker/image/ls/)
- [Kubernetes image-name and digest behavior](https://kubernetes.io/docs/concepts/containers/images/)
- [kubectl JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/)

## Issues Found
- The `mysqladmin` example omitted the port and TLS verification mode used by the primary connection example, so it did not fully preserve the intended endpoint settings. Added `--port=3306` and `--ssl-mode=VERIFY_IDENTITY`. Also replaced the reference to a server description with connection details and allowed for both `mysqladmin Ver` and `mysql Ver` client banners, because this leading banner varies by build and describes the client while the `Server version` field comes from the server.
- The RPM examples used the legacy-style `Percona-Server-server` capitalization. Current Percona Server for MySQL 8.4 RPM repositories and package files use `percona-server-server`, so both RPM/DNF queries were updated to the current package name.

## Review Notes
- The Percona `8.4.10-10` example is current as of the validation date: `8.4.10` is the upstream MySQL base and the final `10` is Percona's build number.
- `docker inspect` exposes the container's configured image reference and local content-addressed image ID. For portable supply-chain provenance, retain a registry manifest digest; for Kubernetes, an image specified by digest is immutable even when a tag is also present.
- Percona-only variables and installed components remain supporting signals rather than definitive identifiers, as the post correctly states.
