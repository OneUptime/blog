# Validation Summary: How to Checkpoint a Running Container with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- CRIU
- CRIT
- Linux containers
- Container checkpoint and restore

## Sources Consulted
- Podman official checkpoint tutorial: https://podman.io/docs/checkpoint
- Podman official `podman container checkpoint` reference: https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html
- Podman official `podman container restore` reference: https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html
- CRIU official kernel check documentation: https://criu.org/Check_the_kernel
- CRIU official TCP connection documentation: https://criu.org/TCP_connection
- CRIU official CRIT documentation: https://criu.org/CRIT

## Issues Found
- The prerequisites listed CRIU 3.15 or later as required. Podman's official checkpoint tutorial states that checkpointing requires CRIU 3.11 or later, so the prerequisite was corrected to CRIU 3.11 or later.
- The "Checkpoint with Verbose Output" section said that piping output through `tee` enabled verbose logging. That command captures normal command output; verbose logging is enabled by Podman's `--log-level=debug`. The wording was corrected.
- The "Working with Multiple Containers" section stated that there is no built-in command to checkpoint all containers at once. Podman supports `podman container checkpoint --all`, so the section was corrected to include the built-in option.

## Review Notes
- The post is technically relevant and includes working Podman command examples.
- Podman's checkpoint and restore support is Linux/rootful-oriented; the post correctly uses `sudo` and notes rootful requirements.
- Established TCP connections and file locks may require explicit Podman options in real workloads. The post mentions TCP connection state as optional, but a future expansion could show `--tcp-established` and `--file-locks` examples.
