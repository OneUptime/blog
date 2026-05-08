# Validation Summary: How to Remove a Secret in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman secrets
- Shell commands

## Sources Consulted
- Podman official documentation: `podman-secret-rm` - https://docs.podman.io/en/latest/markdown/podman-secret-rm.1.html
- Podman official documentation: `podman-secret-ls` - https://docs.podman.io/en/latest/markdown/podman-secret-ls.1.html
- Podman official documentation: `podman-secret-inspect` - https://docs.podman.io/en/stable/markdown/podman-secret-inspect.1.html
- Podman official documentation: `podman-secret-create` - https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Podman official documentation: container `--secret` option - https://docs.podman.io/en/latest/markdown/podman-create.1.html

## Issues Found
- The post said removing a secret used by a running container would fail. Official Podman documentation says `podman secret rm` is safe to use on secrets that are in use by a container because secret data is copied into the container at creation time. Updated the section to explain that removal is allowed and that existing containers keep their existing secret data.
- The rotation example said `podman restart` would pick up the recreated secret. Because Podman secrets are provided to containers when they are created, restarting an existing container is not enough to refresh the secret. Updated the example to recreate the container.
- The all-secrets cleanup examples used `podman secret ls` piped to `xargs`. This can work, but Podman provides the built-in `podman secret rm --all` command. Updated the examples to use the built-in command.
- The pattern-removal example used `xargs` without `-r`, which can invoke `podman secret rm` with no arguments when there are no matches on GNU systems. Added `-r` to avoid that empty invocation.
- The example secret ID included non-hex characters. Replaced it with a hex-looking example ID.

## Review Notes
The corrected examples are technically aligned with current Podman documentation. `xargs -r` is GNU-specific; the post already uses it elsewhere, so the pattern cleanup command is consistent with the rest of the article.
