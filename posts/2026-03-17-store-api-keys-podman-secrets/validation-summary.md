# Validation Summary: How to Store API Keys as Podman Secrets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman secrets
- Container environment variables
- Container file-mounted secrets
- AWS SDK credentials
- Google Cloud service account credentials
- Bash
- Python
- Node.js
- Go

## Sources Consulted
- Podman `podman secret create` documentation: https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Podman `podman run --secret` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html#secret-secret-opt-opt
- Podman `podman secret inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-secret-inspect.1.html

## Issues Found
- The post claimed Podman secrets ensure API keys are delivered without appearing in process listings, inspect output, or shell history. This was too broad because the examples typed literal secret values into shell commands, which can expose the values through shell history, and `type=env` intentionally exposes the secret as an environment variable inside the container. I revised the wording to say Podman secrets keep values out of image layers and source control, and that file-mounted secrets avoid exposing values as container environment variables.
- The secret creation examples used `echo -n "literal-secret-value" | podman secret create ...`, which demonstrates putting the secret directly in the shell command. I changed these examples to `printf '%s' "$VARIABLE" | podman secret create ...` so the examples create secrets from stdin without showing literal secret values in the command text.
- The summary repeated the overbroad claim that Podman secrets prevent exposure through environment variable listings, process tables, container inspection, and shell history. I updated it to recommend file mounts for maximum security, environment variables only when required, and creating secrets from files, stdin, or CI/CD variables instead of typed literals.

## Review Notes
The Podman command syntax for `podman secret create`, `podman run --secret`, `type=env`, and absolute file mount targets is consistent with current Podman documentation. Environment-variable secrets remain less isolated than file-mounted secrets because the application receives them as environment variables, so the post now presents that mode as a compatibility option rather than the most secure default.
