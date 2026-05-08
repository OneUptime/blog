# Validation Summary: How to Remove All Unused Volumes with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman volumes
- Podman storage cleanup commands
- Bash scripting
- Cron scheduling

## Sources Consulted
- Podman official documentation: `podman-volume-prune` - https://docs.podman.io/en/stable/markdown/podman-volume-prune.1.html
- Podman official documentation: `podman-volume-ls` - https://docs.podman.io/en/v5.1.1/markdown/podman-volume-ls.1.html
- Podman official documentation: `podman-system-prune` - https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman official documentation: `podman-system-df` - https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman official documentation: `podman-volume-create` - https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html
- Podman official documentation: `podman-volume-inspect` - https://docs.podman.io/en/latest/markdown/podman-volume-inspect.1.html

## Issues Found
- The "Protecting Important Volumes" section said a custom script was needed for selective cleanup and that built-in prune removes all unused volumes. Podman's official documentation confirms `podman volume prune --filter` supports label filters, including exclusion filters such as `label!=...`, so the section was corrected to use `podman volume prune --filter label!=keep=true --force` and keep the script only as an optional way to print each decision.
- The "Check What Will Be Removed" section described `podman system df -v` output as disk space that would be freed. Official documentation describes this command as detailed disk usage output, not a prune dry-run. The comment was changed to "Check volume disk usage details."

## Review Notes
Podman was not installed in the local environment, so command behavior was verified against official Podman documentation rather than local `--help` output. The remaining commands and flags are current in the consulted documentation, including `podman volume prune --force`, `podman volume list --filter dangling=true`, `podman system prune --volumes`, volume labels, Go-template formatting, and `podman system df -v`.
