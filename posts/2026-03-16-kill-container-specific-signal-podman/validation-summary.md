# Validation Summary: How to Kill a Container with a Specific Signal in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- Unix/Linux signals
- Shell scripting
- Nginx container examples

## Sources Consulted
- Podman `podman kill` official documentation: https://docs.podman.io/en/latest/markdown/podman-kill.1.html
- Podman `podman stop` official documentation: https://docs.podman.io/en/latest/markdown/podman-stop.1.html
- Podman `podman run` official documentation for volume mount options: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Linux `signal(7)` manual page: https://man7.org/linux/man-pages/man7/signal.7.html

## Issues Found
- The post said `podman stop` always sends SIGTERM followed by SIGKILL. Podman stops containers with the configured stop signal, which defaults to SIGTERM, then falls back to SIGKILL after the timeout. Updated the introduction, Kill vs Stop example, and summary to reflect this.
- The post described signal numbers as absolute. Linux signal numbers can vary by architecture, so the numeric examples now say they apply on most Linux architectures.
- The post described `podman kill --all` as killing all running containers. Current Podman documentation says `--all` signals running and paused containers. Updated the comments in the examples.

## Review Notes
The remaining `podman kill`, `--signal` / `-s`, `--all`, `podman stop -t`, bind mount option, and shell examples are consistent with current official documentation. Podman is not installed in the local environment, so commands were verified against official documentation rather than executed locally.
