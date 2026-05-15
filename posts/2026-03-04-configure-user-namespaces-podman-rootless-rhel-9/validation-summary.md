# Validation Summary: How to Configure User Namespaces for Podman Rootless Containers on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman rootless containers
- Linux user namespaces
- Subordinate UID and GID mappings
- shadow-utils usermod, subuid, and subgid configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Building, running, and managing containers": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Podman run reference, `--userns`, `--uidmap`, `--gidmap`, `--subuidname`, and `--subgidname`: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman run reference explaining rootless `--uidmap` intermediate UID behavior: https://docs.podman.io/en/v5.3.0/markdown/podman-run.1.html
- Local `usermod --help` output for `--add-subuids` and `--add-subgids`
- Local `subuid(5)` man page for `/etc/subuid` file format and semantics

## Issues Found
- The prerequisite said Podman is included by default on RHEL. Red Hat's RHEL 9 container documentation shows installing the `podman` package from RHEL repositories, so the prerequisite now says Podman should be installed from the RHEL repositories.
- The post used `cat /proc/self/uid_map` to show a rootless Podman mapping. That command checks the current shell process, not Podman's rootless namespace. It now uses `podman unshare cat /proc/self/uid_map`.
- The subordinate ID section said user namespaces require subordinate UID and GID ranges. That is too broad; subordinate ranges are commonly required for useful rootless container mappings, but user namespaces themselves can exist without a full subordinate range. The wording was narrowed.
- The custom `--uidmap` and `--gidmap` examples treated the second field as a direct host ID in rootless mode. Podman documents that rootless mappings use an intermediate namespace, so the examples now use `1:1:65536` and explain the intermediate namespace behavior.
- The storage section said `podman system migrate` resets storage. Red Hat documents it as the command needed to apply manual `/etc/subuid` or `/etc/subgid` changes, so the section now says to run it after manual mapping changes and keeps `podman system reset` as the full reset fallback.
- The troubleshooting `grep` examples could match partial usernames. They now anchor the lookup with `^$(whoami):`.

## Review Notes
The post is now technically valid for its intended RHEL 9 and rootless Podman scope. The exact UID/GID mapping shown can vary based on the user's configured `/etc/subuid` and `/etc/subgid` ranges, which the post already presents as an example.
