# Validation Summary: How to Force Remove an Image in Use with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container images
- Containers
- Shell commands
- CI/CD cleanup

## Sources Consulted
- Podman `rmi` official documentation: https://docs.podman.io/en/stable/markdown/podman-rmi.1.html
- Podman `ps` official documentation: https://docs.podman.io/en/stable/markdown/podman-ps.1.html
- Podman `rm` official documentation: https://docs.podman.io/en/stable/markdown/podman-rm.1.html
- Podman `stop` official documentation: https://docs.podman.io/en/stable/markdown/podman-stop.1.html
- Podman `image prune` official documentation: https://docs.podman.io/en/v3.0/markdown/podman-image-prune.1.html
- Podman `system prune` official documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman `images` official documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `inspect` official documentation: https://docs.podman.io/en/stable/markdown/podman-inspect.1.html
- Podman `volume prune` official documentation: https://docs.podman.io/en/stable/markdown/podman-volume-prune.1.html

## Issues Found
- The post incorrectly stated that `podman rmi --force` leaves dependent containers running and only removes the image reference. Updated the explanation and examples because official Podman documentation states that `--force` removes containers using the image before removing the image.
- The rebuilding section incorrectly said containers lose their image reference after force removal. Updated it to state that dependent containers are removed and must be recreated.
- The opening warning said force removal bypasses safety checks designed to prevent breaking running containers. Updated it to warn that force removal removes containers using the image.
- The dependency-check script comment said it checked child images, but the command listed other tags pointing to the same image ID. Updated the comment to match the command.
- The `podman image prune -af` example was presented as an alternative way to clear the entire image store. Clarified that it removes unused images without prompting, because prune does not remove images referenced by containers.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was validated against official Podman documentation rather than local `--help` output.
