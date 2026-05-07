# Validation Summary: How to Restrict Process Capabilities in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Compose / Compose Specification
- Linux capabilities
- Alpine Linux package management
- Fedora package management
- NGINX containers

## Sources Consulted
- Podman `run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `container inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Linux capabilities manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- Compose Specification, `cap_add` and `cap_drop`: https://compose-spec.github.io/compose-spec/spec.html
- Alpine package contents for `libcap-utils`: https://pkgs.alpinelinux.org/contents?branch=v3.22&name=libcap-utils&repo=main&arch=x86_64
- Fedora package information for `libcap`: https://packages.fedoraproject.org/pkgs/libcap/libcap
- NGINX process documentation: https://docs.nginx.com/nginx/admin-guide/basic-functionality/runtime-control/

## Issues Found
- Alpine capability tools package was outdated. Current Alpine packages `capsh` and `getpcaps` in `libcap-utils`, so the Alpine examples were changed from `apk add -q libcap` to `apk add -q libcap-utils`.
- The minimal nginx example added only `NET_BIND_SERVICE`. The official nginx image starts as root and uses worker processes under configured user/group credentials, so it commonly needs `SETUID` and `SETGID` as well. The example now adds `SETUID` and `SETGID`, and the related web-server comment was updated.
- The Compose example used the obsolete top-level `version` field. It was removed to match the current Compose Specification while leaving `cap_drop` and `cap_add` unchanged.

## Review Notes
- Podman was not installed in the local review environment, so commands could not be executed end to end. CLI flags and inspect fields were verified against official Podman documentation instead.
- `podman inspect --format '{{.EffectiveCaps}}'` is documented for local Podman, but the field is not available with the remote Podman client on Mac and Windows except WSL2.
