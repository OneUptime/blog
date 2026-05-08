# Validation Summary: How to Wait for a Container to Finish in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux shell scripting
- Container lifecycle management
- CI/CD container workflows

## Sources Consulted
- Podman official documentation: podman-wait - https://docs.podman.io/en/latest/markdown/podman-wait.1.html
- Podman official documentation: podman-run - https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman official documentation: podman-logs - https://docs.podman.io/en/latest/markdown/podman-logs.1.html
- Podman official documentation: podman-rm - https://docs.podman.io/en/latest/markdown/podman-rm.1.html

## Issues Found
- The basic usage example used `$?` after `podman wait`, which reports the `podman wait` command's shell exit status, not the container process exit code printed by `podman wait`. Changed the example to capture stdout with `EXIT_CODE=$(podman wait my-task)`.
- The multiple-container section said Podman waits for containers "simultaneously." Official documentation says Podman waits on multiple containers consecutively and prints return codes separated by newlines in the same order as the arguments. Updated the wording accordingly.
- The condition list omitted several currently documented supported conditions and did not mention that conditions other than `stopped` and `exited` emit `-1` instead of the container process exit code. Added the missing documented conditions and this caveat.

## Review Notes
The local environment did not have `podman` installed, so command behavior was verified against the official Podman documentation rather than local `--help` output. The remaining shell examples are syntactically valid and use current Podman command forms documented by Podman.
