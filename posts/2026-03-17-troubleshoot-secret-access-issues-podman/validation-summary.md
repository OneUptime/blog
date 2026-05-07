# Validation Summary: How to Troubleshoot Secret Access Issues in Podman

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- Podman secrets
- Linux container file permissions
- Container environment variables

## Sources Consulted
- Podman `--secret` option documentation: https://docs.podman.io/en/v4.4/markdown/options/secret.html
- Podman `podman-secret-create` documentation: https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Podman `podman-secret-inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-secret-inspect.1.html
- Podman `podman-secret-rm` documentation: https://docs.podman.io/en/latest/markdown/podman-secret-rm.1.html
- Podman `podman-container-inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman v6 `InspectContainerConfig` and `InspectSecret` API definitions: https://pkg.go.dev/github.com/containers/podman/v6/libpod/define

## Issues Found
- The post checked attached secrets with `podman inspect --format='{{json .HostConfig.Secrets}}'`. Podman exposes mounted container secrets through the container config as `Config.Secrets`, so I changed both examples to `podman inspect --format='{{json .Config.Secrets}}'`.
- The Step 2 recreation example used `podman rm my-container` after showing a detached container created with `podman run -d`. Removing a running container requires force removal or stopping it first, so I changed the command to `podman rm -f my-container`.

## Review Notes
- Podman documents `type=mount` as the default secret type, with default target `/run/secrets/<secretname>`, default UID/GID `0`, and default mode `0444`; the post's permission and target guidance is consistent with that.
- Podman documents `type=env,target=ENV_NAME` for exposing a secret as an environment variable; the post's environment variable example is valid.
- `podman secret inspect --showsecret` is valid, but it prints secret data to the terminal. The post appropriately scopes this to a secure context.
