# Validation Summary: How to Inspect a Secret in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman secrets
- Shell scripting
- Go template formatting for CLI output

## Sources Consulted
- Podman official documentation: `podman-secret-inspect` - https://docs.podman.io/en/latest/markdown/podman-secret-inspect.1.html
- Podman official documentation: `podman-secret-ls` - https://docs.podman.io/en/latest/markdown/podman-secret-ls.1.html
- Podman official documentation: `podman-secret` - https://docs.podman.io/en/latest/markdown/podman-secret.1.html
- Podman source implementation for `SecretInspect` - https://github.com/containers/podman/blob/main/pkg/domain/infra/abi/secrets.go
- Podman CLI source for `podman secret inspect` - https://github.com/containers/podman/blob/main/cmd/podman/secrets/inspect.go

## Issues Found
- The post stated that `podman secret inspect` shows metadata "without ever revealing the secret value." Current Podman supports `--showsecret`, and the official documentation states that this option displays secret data. Updated the wording to clarify that secret values are hidden by default unless `--showsecret` is explicitly used.
- The example secret ID used non-hex characters (`g`, `h`, `i`, `j`). Updated the sample ID to a plausible hex-style value for technical consistency.

## Review Notes
The local environment did not have the `podman` binary installed, so CLI behavior was verified against the current official Podman documentation and the upstream Podman source. The documented `--format`, `--showsecret`, `--pretty`, `.Spec.Name`, `.CreatedAt`, `.Spec.Driver.Name`, `.ID`, and `podman secret ls --format "{{.Name}}"` usage matches the official documentation.
