# Validation Summary: How to List Secrets in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman secrets
- Container inspection
- Shell scripting

## Sources Consulted
- Podman `podman-secret-ls` official documentation: https://docs.podman.io/en/latest/markdown/podman-secret-ls.1.html
- Podman `podman-container-inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman `podman-inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman `--secret` option official documentation: https://docs.podman.io/en/v4.6.0/markdown/options/secret.html
- Podman `podman-secret-exists` official documentation: https://docs.podman.io/en/v5.0.1/markdown/podman-secret-exists.1.html

## Issues Found
- The description said readers would "view secrets", which could imply viewing secret values. Changed it to "view secret metadata" because `podman secret ls` lists metadata, not secret contents.
- The post used `podman secret ls --format json`, but the official `podman-secret-ls` documentation describes `--format` as a Go template format and does not document `json` as a supported format for this command. Replaced it with a Go-template JSON-style line output example.
- The audit section claimed to find secrets created more than 30 days ago, but the shell pipeline only printed each secret name and creation timestamp. Updated the comment to describe what the command actually does.

## Review Notes
Podman was not installed in the local review environment, so CLI behavior was checked against current official Podman documentation rather than local `--help` output.
