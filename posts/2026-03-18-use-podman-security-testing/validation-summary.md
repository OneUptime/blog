# Validation Summary: How to Use Podman for Security Testing

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Podman
- Trivy
- Grype
- OWASP ZAP
- Container image security scanning
- Rootless containers and user namespaces
- Container secrets
- Container networking
- Bash
- Python

## Sources Consulted
- Podman official overview (`podman`): https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman `run` reference: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `network create` reference: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `inspect` reference: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman `container inspect` reference: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman `secret create` reference: https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Trivy container image documentation: https://trivy.dev/docs/latest/target/container_image/
- Trivy `image` CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Anchore Grype CLI reference: https://oss.anchore.com/docs/reference/grype/cli/
- OWASP ZAP Docker User Guide: https://www.zaproxy.org/docs/docker/about/

## Issues Found
1. **Incorrect Grype image source in containerized examples**: The post ran Grype inside a container but passed a plain image reference. Per Grype’s CLI docs, plain image refs default to the Docker daemon, while `registry:` pulls directly from a registry with no container runtime required. I changed both Grype examples to use `registry:docker.io/library/python:3.11`.
2. **Invalid rootless isolation demonstration**: The original rootless example used `ls /etc/shadow` as evidence of host filesystem isolation, but that path is inside the container filesystem, not the host’s. I replaced it with a user-namespace example based on `/proc/self/uid_map` plus a failed `mount` attempt, which better matches Podman’s documented rootless behavior.
3. **Section title overstated what the code did**: The “Comparing Rootless vs Rootful Security” section only inspected a rootless container and did not compare two execution modes. I renamed the section and updated the snippet docstrings/function name so the code matches the claim.
4. **Wrong inspect field for image user checks**: The hardening script and Python pipeline queried `{{.Config.User}}` from image inspection. Podman’s image inspect output exposes the image user as top-level `{{.User}}`. I switched these checks to `podman image inspect` with the correct field.
5. **ENTRYPOINT-sensitive hardening checks**: The SUID and shell checks assumed `podman run IMAGE COMMAND` always runs `COMMAND` directly, but Podman appends the command to an image’s existing `ENTRYPOINT` unless `--entrypoint` is used. I updated those checks to set `--entrypoint` explicitly so they run the intended utilities.

## Review Notes
- The post is technically sound after the fixes above.
- Several examples use mutable `:latest` tags. That is acceptable for a tutorial, but pinning versions or digests would be better for reproducible CI/CD pipelines.
- The read-only filesystem checks are still heuristic examples. Whether an image truly supports `--read-only` depends on its real startup path and whether it writes to the root filesystem at runtime.
- Current Podman docs note version-sensitive secret behavior around updates after container creation; this post does not rely on secret rotation semantics, so no change was required.
