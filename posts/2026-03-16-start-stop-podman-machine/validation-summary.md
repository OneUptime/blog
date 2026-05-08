# Validation Summary: How to Start and Stop a Podman Machine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Machine
- Podman system connections
- macOS Launch Agents
- Container restart policies

## Sources Consulted
- Podman machine start documentation: https://docs.podman.io/en/stable/markdown/podman-machine-start.1.html
- Podman machine stop documentation: https://docs.podman.io/en/latest/markdown/podman-machine-stop.1.html
- Podman machine inspect documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman machine init documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman machine list documentation: https://docs.podman.io/en/latest/markdown/podman-machine-list.1.html
- Podman machine rm documentation: https://docs.podman.io/en/latest/markdown/podman-machine-rm.1.html
- Podman system connection default documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-default.1.html
- Podman system connection list documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-list.1.html
- Podman run restart policy documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman update restart policy documentation: https://docs.podman.io/en/latest/markdown/podman-update.1.html
- Podman container inspect documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html

## Issues Found
- Updated the `podman machine list` example output to match the current documented columns and default machine name.
- Replaced the claim that `podman machine stop` saves machine state with the accurate behavior that it shuts down the VM.
- Replaced broad `pkill` guidance for unresponsive machines with `podman machine rm -f`, which is the documented way to stop and delete a running machine without confirmation.
- Corrected the multiple-machine explanation from "active default" to "running" because current Podman documentation states only one Podman-managed VM can be active at a time.
- Clarified the macOS sleep automation snippet because the original script only created a script and did not actually register a sleep hook.

## Review Notes
Podman was not installed in the local review environment, so command verification was performed against the current official Podman documentation rather than local `--help` output.
