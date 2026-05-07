# Validation Summary: How to Install the Podman AI Lab Extension

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Podman
- Podman machine
- Podman Desktop
- Podman Desktop extensions
- Podman AI Lab
- Flatpak
- Homebrew

## Sources Consulted
- Podman AI Lab official documentation: https://podman-desktop.io/docs/ai-lab
- Podman AI Lab installation documentation: https://podman-desktop.io/docs/ai-lab/installing
- Podman Desktop extension installation documentation: https://podman-desktop.io/docs/extensions/install
- Podman Desktop Linux installation documentation: https://podman-desktop.io/docs/installation/linux-install
- Podman Desktop macOS downloads page: https://podman-desktop.io/downloads/macos
- Podman Desktop troubleshooting logs documentation: https://podman-desktop.io/docs/troubleshooting/access-logs
- Podman installation documentation: https://podman.io/docs/installation
- Podman machine set documentation: https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman machine inspect documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman AI Lab upstream README: https://github.com/containers/podman-desktop-extension-ai-lab

## Issues Found
- The Homebrew command for installing Podman Desktop was missing the `--cask` flag. Changed it to `brew install --cask podman-desktop`, matching the official macOS download instructions.
- The post used nonexistent `podman desktop extension install`, `list`, and `remove` commands. Replaced those with the documented Podman Desktop Extensions UI catalog/custom-image flow.
- The post showed `podman machine inspect` memory and disk values as MB/GB, but the documented inspect fields report bytes. Updated the output labels to bytes.
- The resource recommendation said 8GB RAM, while the upstream Podman AI Lab README recommends 12GB memory and at least 4 CPUs for the Podman machine. Updated the recommendation to 12GB.
- The post implied Podman machine resource settings apply generally. The Podman documentation states several `podman machine set` resource options apply to QEMU-backed machines, so the commands now call that out.
- The "Set the Model Storage Directory" section did not set a storage directory. Renamed it to "Check Model Storage Space" while keeping the original intent.
- The post used an undocumented `label=ai-lab` container filter to verify backend containers. Replaced it with the official verification steps: check the left navigation icon and Installed tab.
- The log-checking section used platform-specific file paths instead of the documented Podman Desktop logs workflow. Replaced it with the official Troubleshooting > Logs / Gather Logs steps.
- The summary still referred to CLI installation. Updated it to mention the catalog and custom extension image flows.

## Review Notes
The local review environment did not have the `podman` binary installed, so CLI validation was performed against official Podman and Podman Desktop documentation rather than local `--help` output.
