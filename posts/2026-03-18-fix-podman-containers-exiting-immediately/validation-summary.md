# Validation Summary: How to Fix Podman Containers Exiting Immediately

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Podman
- Containers
- Dockerfile / Containerfile CMD and ENTRYPOINT instructions
- Linux process lifecycle and signals
- Shell entrypoint scripts

## Sources Consulted
- Podman run manual: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman ps manual: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman command manual exit codes: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Dockerfile reference for CMD and ENTRYPOINT behavior: https://docs.docker.com/reference/dockerfile/
- Docker JSONArgsRecommended build check: https://docs.docker.com/reference/build-checks/json-args-recommended/

## Issues Found
- The post described shell-form `ENTRYPOINT /entrypoint.sh` as "runs in a shell that exits." Shell form runs through `/bin/sh -c`, but that does not inherently cause immediate exit. Updated the explanation to focus on the real technical issues: argument handling and signal behavior.
- The post said "`exec` keyword is critical" in a way that could imply every shell entrypoint without `exec` exits immediately. A foreground child process can keep the script alive, although `exec` is still preferred for PID 1 and signal handling. Updated the wording to tie the requirement to the shown background-process pattern.
- The signal propagation section said shell form can make containers appear to exit unexpectedly during orchestration restarts. The more accurate issue is that the application may not receive SIGTERM and may be killed after the orchestrator's grace period. Updated the sentence accordingly.

## Review Notes
The examples and commands are generally correct for current Podman and Dockerfile semantics. Podman was not installed in the local environment, so CLI verification used official Podman documentation rather than local `--help` output.
