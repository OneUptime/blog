# Validation Summary: How to Use the STOPSIGNAL Instruction in Dockerfiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile
- Docker CLI
- Docker Compose
- Nginx
- Apache HTTP Server
- Python
- Java
- tini
- Unix signals

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker `docker container stop` CLI reference: https://docs.docker.com/reference/cli/docker/container/stop/
- Docker `docker container kill` CLI reference: https://docs.docker.com/reference/cli/docker/container/kill/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker JSONArgsRecommended build check: https://docs.docker.com/reference/build-checks/json-args-recommended/
- Nginx signal control documentation: https://nginx.org/en/docs/control.html
- Apache HTTP Server 2.4 stopping and restarting documentation: https://httpd.apache.org/docs/2.4/en/stopping.html
- Python 3.11 `signal` module documentation: https://docs.python.org/3.11/library/signal.html
- Python command-line `-u` documentation: https://docs.python.org/3/using/cmdline.html
- Local Docker CLI help for `docker stop`, `docker run`, `docker kill`, and `docker compose stop`
- Local inspection of current official `nginx:alpine` and `httpd:2.4` image metadata

## Issues Found
- The post described the Docker stop grace period as "10 seconds by default" without platform qualification. Docker documents 10 seconds for Linux containers and 30 seconds for Windows containers when no default is configured. Updated the text and diagram label to say 10 seconds by default for Linux containers.
- The `docker stop --time 30` example used a deprecated long flag. The installed Docker CLI reports `--time` as deprecated and recommends `--timeout`, so the command was updated to `docker stop --timeout 30 mycontainer`.
- The PID 1 section said that if the application is not PID 1, it will "never receive the signal." That was too absolute because forwarding behavior depends on the PID 1 process. Updated it to say the application will not receive the signal directly.
- The shell-form CMD example said "bash is PID 1." Docker's shell form uses `/bin/sh -c` by default unless the shell is changed with `SHELL`, so the example was updated to say `/bin/sh -c` is PID 1 and that the shell may not forward SIGTERM.

## Review Notes
- The Nginx and Apache signal examples were verified against upstream signal documentation and current official image metadata: `nginx:alpine` reports `SIGQUIT`, and `httpd:2.4` reports `SIGWINCH`.
- The Python example compiles successfully with Python 3 and uses supported signal APIs.
- The Docker Compose `stop_signal` and `stop_grace_period` keys are current and valid.
