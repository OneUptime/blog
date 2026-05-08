# Validation Summary: How to Open a Shell Inside a Running Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- Container shell access
- Bash, sh, and ash shells
- Linux package managers: apt and apk

## Sources Consulted
- Podman exec command reference: https://docs.podman.io/en/latest/markdown/podman-exec.1.html
- Podman ps command reference: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman run command reference: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman container inspect command reference: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Local Bash and sh behavior for inherited PS1 environment variables

## Issues Found
- The opening quote said shell access gives "full interactive access". This overstated the behavior because `podman exec` runs commands inside the container under the configured or specified user and container isolation still applies. Changed it to "direct interactive access".
- The introduction said the guide covers "all the ways" to open shell sessions. The post covers common `podman exec` patterns, not every possible approach. Changed it to "common ways".
- The helper function used `test -f` to choose a shell. Changed it to `test -x` so the function checks that the shell path is executable, which better matches the intended command behavior.
- The troubleshooting section described `/etc/shells` as showing what shells are available in the image. That file, when present, lists registered login shells and may not include every executable shell. Updated the comment to reflect that.
- The troubleshooting section suggested a non-standard entrypoint can block `podman exec`. `podman exec` runs commands in an already running container; an entrypoint is more relevant when a container exits immediately and therefore cannot be exec'd into. Updated the comment and inspect format to check both entrypoint and command in that case.

## Review Notes
The core `podman exec -it`, `-w`, `--user`, `-e`, `-d`, `podman ps --format`, `podman ps --filter name=...`, and `podman inspect --format` usage is consistent with the official Podman documentation. Podman was not installed in the local environment, so command verification was performed against official documentation and available local shell behavior rather than live Podman execution.
