# Validation Summary: How to Drop Unnecessary Linux Capabilities in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose Specification
- Linux capabilities
- Linux `no_new_privs`
- libcap tools (`capsh`, `getpcaps`)

## Sources Consulted
- Docker Engine: Runtime privilege and Linux capabilities: https://docs.docker.com/engine/containers/run/
- Docker Compose services reference (`cap_add`, `cap_drop`, `security_opt`, `read_only`, `tmpfs`, `user`): https://docs.docker.com/reference/compose-file/services/
- Docker Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer docs, Add a new container: https://docs.portainer.io/sts/user/docker/containers/add
- Portainer docs, Advanced container settings: https://docs.portainer.io/sts/user/docker/containers/advanced
- Linux kernel documentation for `no_new_privs`: https://docs.kernel.org/userspace-api/no_new_privs.html
- `capsh(1)` manual page: https://man7.org/linux/man-pages/man1/capsh.1.html
- `getpcaps(8)` manual page: https://man7.org/linux/man-pages/man8/getpcaps.8.html
- `capabilities(7)` manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html

## Issues Found
- Removed the top-level Compose `version: "3.8"` from the YAML example because current Docker Compose treats the `version` field as obsolete and only informative.
- Corrected the Portainer UI instructions. Current Portainer docs place capability controls under **Advanced container settings** > **Capabilities**, not under **Runtime & Resources > Capabilities**.
- Fixed the “high-risk capabilities” guidance to distinguish Docker defaults from capabilities that are not granted by default. The original wording implied several capabilities should be dropped from the default set even though Docker does not grant them by default.
- Tightened the capability-use table by removing the generic claim that databases may need `DAC_OVERRIDE`, and added a caveat that the table is a starting point rather than a guarantee.
- Fixed the capability verification example so it no longer decodes a hardcoded capability mask unrelated to the reader’s actual container. The updated text tells the reader to decode the `CapEff` value they retrieved.
- Clarified that `getpcaps` depends on the tool being present in the container image.
- Corrected the restriction-testing examples. The original `mount` example tried to mount to `/tmp/test` without creating the mount point first, which could fail for the wrong reason. The updated example creates the directory first.
- Clarified that `ping` is not a universal `NET_RAW` test on every distro/kernel combination, so the original “should fail” wording was too absolute.
- Expanded the `no-new-privileges` explanation to include file capabilities, which are also blocked by `no_new_privs`, not only SUID/SGID binaries.

## Review Notes
- Validation was documentation-based. `docker` is not installed in this workspace, so the commands were not runtime-tested locally.
- The capability-by-use-case table remains heuristic guidance even after correction; the exact set should still be validated against the specific container image, entrypoint behavior, and vendor documentation.
