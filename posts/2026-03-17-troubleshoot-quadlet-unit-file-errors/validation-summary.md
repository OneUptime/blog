# Validation Summary: How to Troubleshoot Quadlet Unit File Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- Quadlet
- systemd
- Linux shell commands
- SELinux volume labeling

## Sources Consulted
- Podman Quadlet systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman container Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Podman volume Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-volume.unit.5.html
- Podman network Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-network.unit.5.html
- Podman run volume and SELinux labeling documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman Quadlet generator source reference: https://github.com/containers/podman

## Issues Found
- The introduction listed only `.container`, `.volume`, `.network`, and `.kube` files. Current Podman documentation also includes Quadlet types such as `.pod`, `.image`, and `.build`, with newer docs also mentioning `.artifact`. Updated the wording to say "files such as" and include the common current types without implying an exhaustive list.
- The first troubleshooting step only mentioned `systemctl --user daemon-reload`, even though the same section also discusses rootful containers. Updated it to distinguish rootless `systemctl --user daemon-reload` from rootful `systemctl daemon-reload`.
- The invalid directive example used `section "Container"`, while Quadlet generator messages commonly report unsupported keys as being in a `group`. Updated the example wording to match the generator's terminology.

## Review Notes
The dry-run command path `/usr/lib/systemd/system-generators/podman-system-generator --user --dryrun` matches the current upstream Podman documentation, but some distributions may install the generator under a different libexec path. The `:z` and `:Z` SELinux volume suffix guidance is technically correct, with the usual caveat that relabeling can be expensive or inappropriate for system directories.
