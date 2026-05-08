# Validation Summary: How to Troubleshoot Podman Machine Startup Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- Podman Machine
- Virtual machines
- macOS virtualization
- Linux KVM
- Shell commands
- jq

## Sources Consulted
- Podman machine inspect documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman machine start documentation: https://docs.podman.io/en/stable/markdown/podman-machine-start.1.html
- Podman machine stop documentation: https://docs.podman.io/en/latest/markdown/podman-machine-stop.1.html
- Podman machine init documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman machine set documentation: https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman machine list documentation: https://docs.podman.io/en/stable/markdown/podman-machine-list.1.html
- Podman machine rm documentation: https://docs.podman.io/en/v4.6.0/markdown/podman-machine-rm.1.html
- Podman system reset documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- Podman system connection list documentation: https://docs.podman.io/en/v4.4/markdown/podman-system-connection-list.1.html

## Issues Found
- `podman machine inspect` returns a JSON array in the official examples, but several `jq` commands treated the result as a single object. Updated the selectors from fields such as `.State`, `.Resources`, and `.ConnectionInfo.PodmanSocket.Path` to `.[0].State`, `.[0].Resources`, and `.[0].ConnectionInfo.PodmanSocket.Path` so the commands return the intended data.
- The socket cleanup example removed `/tmp/podman-machine-*.sock`, but current Podman examples show the API socket can be under a platform-specific temporary directory such as `/var/folders/.../T/podman/...`. Updated the command to read the socket path from `podman machine inspect` and remove that exact stale socket after stopping the machine.
- The port-conflict command tried to derive a port by extracting digits from the Podman Unix socket path. Updated it to use the documented SSH configuration field, `.[0].SSHConfig.Port`, before running `lsof`.
- The machine reinitialization example placed the machine name before `--cpus` and `--memory`. Updated it to match the documented synopsis and examples: `podman machine init --cpus 2 --memory 4096 my-machine`.
- The diagnostic script had the same incorrect `podman machine inspect` object selectors. Updated the script to use `.[0]` selectors so its JSON summary is populated correctly.

## Review Notes
Podman was not installed in the local review environment, so command behavior was verified against official Podman documentation rather than local `--help` output. Some remediation steps, such as replacing `/etc/resolv.conf` inside the VM, are valid as emergency troubleshooting but may be temporary depending on how the machine image manages DNS.
