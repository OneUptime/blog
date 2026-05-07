# Validation Summary: How to Configure Unmasked Paths in Podman Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- Linux `/proc` and `/sys` filesystems
- Container security options
- Prometheus node exporter

## Sources Consulted
- Podman `podman run` documentation for `--security-opt`, `mask`, `unmask`, `no-new-privileges`, and default masked paths: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `--security-opt=option` documentation for colon-separated `unmask` paths, `unmask=ALL`, default masked paths, and default read-only paths: https://docs.podman.io/en/v4.4/markdown/options/security-opt.html
- Podman `podman container inspect` documentation for inspect output and `.HostConfig`: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Prometheus node exporter documentation for containerized host monitoring requirements: https://github.com/prometheus/node_exporter

## Issues Found
- The post said to specify `--security-opt unmask=` multiple times for multiple paths. Podman's official documentation describes multiple unmask paths as a colon-separated list, so the examples were changed to `--security-opt unmask=/proc/timer_list:/proc/sched_debug`.
- The post described `unmask=ALL` as removing only default path masking. Podman documents that it unmasks paths that are masked or made read-only by default, so the explanation was updated.
- The monitoring example implied `/proc/stat`, `/proc/meminfo`, and `/proc/cpuinfo` are normally masked and need unmasking. Podman's default masked-path list does not include those files, so the text and commands were corrected.
- Some examples implied that unmasking guarantees successful reads. Unmasking removes Podman's default mask, but kernel permissions, capabilities, and host kernel support still apply, so the post now states that caveat and uses commands that tolerate unavailable files.

## Review Notes
Podman is not installed in the local review environment, so commands could not be executed locally. The CLI syntax and behavior were reviewed against official Podman documentation instead.
