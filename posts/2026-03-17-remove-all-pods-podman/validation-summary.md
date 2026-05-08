# Validation Summary: How to Remove All Pods with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman pods
- Shell commands
- Bash scripting
- Container, volume, and network cleanup

## Sources Consulted
- Podman `pod rm` official documentation: https://docs.podman.io/en/v4.4/markdown/podman-pod-rm.1.html
- Podman `pod prune` official documentation: https://docs.podman.io/en/stable/markdown/podman-pod-prune.1.html
- Podman `pod ps` official documentation: https://docs.podman.io/en/stable/markdown/podman-pod-ps.1.html
- Podman `rm` official documentation: https://docs.podman.io/en/latest/markdown/podman-rm.1.html
- Podman `volume prune` official documentation: https://docs.podman.io/en/stable/markdown/podman-volume-prune.1.html
- Podman `network prune` official documentation: https://docs.podman.io/en/v4.3/markdown/podman-network-prune.1.html
- Podman `pod create` official documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html

## Issues Found
- The safety-check script used `{{.NumContainers}}` in `podman pod ls --format`, but the documented Go template placeholder is `{{.NumberOfContainers}}`. Updated the script so the formatted output works with documented Podman fields.
- The `podman pod prune --force` example described `--force` as skipping confirmation, but current Podman documentation describes it as forcing removal of running pods and their containers. Updated the comment to reflect that behavior.

## Review Notes
Podman was not installed in the local environment, so verification was performed against official Podman documentation instead of local `--help` output. The `podman pod rm --all --force`, `podman rm --all --force`, `podman volume prune --force`, `podman network prune --force`, `podman system df`, and `podman pod create --name test-pod -p 8080:80` commands match documented Podman CLI behavior.
