# Validation Summary: How to Use a Secret as an Environment Variable in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman secrets
- Container environment variables
- Linux `/proc/<pid>/environ`

## Sources Consulted
- Podman `--secret` option documentation: https://docs.podman.io/en/latest/markdown/options/secret.html
- Podman `podman secret create` documentation: https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Podman container inspect implementation and e2e tests: https://github.com/containers/podman
- Linux `proc_pid_environ(5)` manual page: https://www.man7.org/linux/man-pages/man5/proc_pid_environ.5.html

## Issues Found
- The post said a secret environment variable is not listed in `podman inspect --format='{{.Config.Env}}'`. Podman's inspect implementation includes the environment variable name but masks the value as `NAME=*******`, so the comment was updated to state that the secret value is masked.
- The security note said environment variables are visible to all processes inside the container. This was narrowed to the container process and its child processes, with `/proc/<pid>/environ` access subject to process permissions.

## Review Notes
The `--secret name,type=env,target=VAR_NAME` syntax, default target behavior, use of stdin with `podman secret create name -`, repeated `--secret` options, and mixing mounted secrets with env secrets are consistent with current Podman documentation.
