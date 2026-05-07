# Validation Summary: How to Fix 'ERRO[0000] cannot find UID/GID' Errors in Podman

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Podman
- Rootless containers
- Linux user namespaces
- `/etc/subuid` and `/etc/subgid`
- shadow-utils `usermod`, `newuidmap`, and `newgidmap`
- NSS and SSSD
- Dockerfile container users

## Sources Consulted
- Podman rootless mode documentation: https://docs.podman.io/en/v4.3/markdown/podman.1.html
- Podman `--userns` option documentation: https://docs.podman.io/en/v4.6.1/markdown/options/userns.container.html
- Podman `system migrate` documentation: https://docs.podman.io/en/v3.2.2/markdown/podman-system-migrate.1.html
- Podman troubleshooting guide: https://github.com/containers/podman/blob/main/troubleshooting.md
- SUSE rootless Podman documentation: https://documentation.suse.com/smart/container/html/rootless-podman/index.html
- Linux `subuid(5)` manual page: https://man7.org/linux/man-pages/man5/subuid.5.html
- Linux `subgid(5)` manual page: https://man7.org/linux/man-pages/man5/subgid.5.html
- Linux `user_namespaces(7)` manual page: https://man7.org/linux/man-pages/man7/user_namespaces.7.html
- SSSD LDAP attributes manual page: https://www.mankier.com/5/sssd-ldap-attributes
- SSSD 2.6.0 release notes: https://sssd.io/release-notes/sssd-2.6.0.html
- Local `usermod --help` output for subordinate UID/GID flags.

## Issues Found
- The post said Linux assigns each user subordinate UID/GID ranges. This was too broad because subordinate IDs are delegated by local files, subid NSS configuration, or account-management tooling rather than automatically assigned by the kernel for every user. Changed the wording to "Linux systems can assign" and "commonly defined" in `/etc/subuid` and `/etc/subgid`.
- The SSSD section claimed subordinate ID support required SSSD 2.0+ with the `files` provider. That was inaccurate. Replaced it with provider- and version-dependent guidance, noting SSSD 2.6 IPA support and LDAP subid attributes.
- The `--userns=auto` section did not distinguish rootless and rootful behavior. Added the rootful Podman caveat that automatic user namespaces use ranges for the special `containers` user by default, or the `root-auto-userns-user` configured in storage settings.
- The debugging section implied admins should directly fix missing setuid bits with `chmod`. Updated it to recommend restoring package permissions or reinstalling the distribution package first, with `chmod` presented only as a temporary repair on systems that package the helpers as setuid binaries.

## Review Notes
The main troubleshooting flow is consistent with Podman documentation: rootless Podman commonly needs subordinate UID/GID ranges, unique non-overlapping ranges are recommended, `podman system migrate` is appropriate after changing mappings, and `newuidmap`/`newgidmap` are required for rootless mode with multiple IDs. Podman was not installed in the local environment, so CLI behavior was verified against official documentation and local shadow-utils help output where available.
