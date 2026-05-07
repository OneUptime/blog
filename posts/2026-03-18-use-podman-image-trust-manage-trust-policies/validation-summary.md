# Validation Summary: How to Use podman image trust to Manage Trust Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Container image trust policies
- `policy.json`
- `containers/registries.d`
- Bash
- Python 3

## Sources Consulted
- Podman `podman-image-trust` man page: https://docs.podman.io/en/latest/markdown/podman-image-trust.1.html
- Podman `podman-image-sign` man page: https://docs.podman.io/en/latest/markdown/podman-image-sign.1.html
- `containers-policy.json(5)` upstream documentation: https://raw.githubusercontent.com/containers/image/main/docs/containers-policy.json.5.md
- `containers-registries.d(5)` upstream documentation: https://github.com/containers/image/blob/main/docs/containers-registries.d.5.md

## Issues Found
- The post said the CLI covered trust management without editing JSON files by hand and that the guide covered "all aspects". Current Podman also supports `sigstoreSigned`, and Podman still has no remove subcommand, so I softened those claims to avoid overstating the CLI's scope.
- The explanation of how the command uses `policy.json` was too narrow. I corrected it to reflect the documented policy lookup order and clarified that the examples explicitly update `/etc/containers/policy.json` with `--signature-policy`.
- Every `podman image trust set` example omitted `--signature-policy`, which the current Podman man page documents as required for `set`. I added it to all `set` commands and aligned verification commands to read the same policy file.
- The `show --json` example was labeled as raw JSON output, but the current CLI uses `--json` for machine-readable trust entries and `--raw` for the raw policy file. I corrected the commands and descriptions.
- The sample table output used incorrect/outdated values such as `docker` as the transport and `signedBy` as the displayed type. I replaced that with an accurate description of the table columns instead of keeping misleading sample rows.
- The signed-image section claimed to set trust "with a signature store URL", but `podman image trust set` only updates the trust policy. I corrected the wording and added the required note that signature storage lookup is configured separately in `/etc/containers/registries.d/*.yaml`.
- The removal section implied there might be a CLI reset path. I clarified that Podman does not provide a remove subcommand and that restoring default behavior requires removing the scope from `policy.json`.
- The audit script said a default `reject` policy rejects unsigned images, which is too narrow. Per `containers-policy.json(5)`, `reject` rejects every image and signature unless a more specific scope applies, so I fixed that explanation.
- The audit script only searched for `keyPath` and missed the documented `keyPaths` array form. I replaced the grep-based extraction with JSON parsing that handles both.

## Review Notes
- `podman image trust` is documented as unavailable with the remote Podman client, including macOS and Windows clients outside WSL2.
- For simple-signing verification, trust policy and signature storage configuration are separate concerns: `policy.json` controls acceptance rules, while `containers/registries.d` controls where signatures are read from.
- I did not run the Podman commands locally because `podman` is not installed in this workspace; validation was done against the current official Podman and containers/image documentation.
