# Validation Summary: How to Create a Secret from an Environment Variable in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman secrets
- Bash
- CI/CD environment variables
- Container runtime secret injection

## Sources Consulted
- Podman official documentation: podman-secret-create, https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Podman official documentation: podman-secret-ls, https://docs.podman.io/en/latest/markdown/podman-secret-ls.1.html
- Podman official documentation: podman-secret-rm, https://docs.podman.io/en/latest/markdown/podman-secret-rm.1.html
- Podman official documentation: podman-create --secret option, https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman official documentation: podman-run environment option, https://docs.podman.io/en/latest/markdown/podman-run.1.html
- GNU Bash manual: History Interaction, https://www.gnu.org/software/bash/manual/bash.html#History-Interaction

## Issues Found
- The `export API_KEY="sk-abc123!@#$%"` example used double quotes around a value containing `!`. In interactive Bash shells, history expansion can treat `!` specially, so the command may fail or expand unexpectedly. Changed it to single quotes to preserve the literal example value.

## Review Notes
Podman's current documentation also supports `podman secret create --env=true name ENV_VAR_NAME` for reading directly from an environment variable. The post's `printf '%s' "$VAR" | podman secret create name -` approach remains valid because Podman documents `-` as stdin input for secret creation.
