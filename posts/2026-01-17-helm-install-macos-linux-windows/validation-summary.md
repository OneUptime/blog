# Validation Summary: How to Install Helm on macOS, Linux, and Windows

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Helm
- Kubernetes
- macOS package managers: Homebrew and MacPorts
- Linux package managers: apt, dnf, and Snap
- Windows package managers: Chocolatey, Winget, and Scoop
- Shell completion for Bash, Zsh, and PowerShell

## Sources Consulted
- Helm official installation guide: https://helm.sh/docs/intro/install/
- Helm official CLI command documentation: https://helm.sh/docs/helm/
- Helm GitHub repository README and release/support notes: https://github.com/helm/helm
- Helm security notice for the former `baltocdn.com` APT mirror: https://helm.sh/blog/security-notice-baltocdn/
- Helm 4 release announcement and Helm 3 support dates: https://helm.sh/blog/helm-4-released/
- Homebrew Helm formula: https://formulae.brew.sh/formula/helm
- MacPorts `helm-4.2` port: https://ports.macports.org/port/helm-4.2/
- Bitnami Helm charts repository instructions: https://charts.bitnami.com/

## Issues Found
- The Debian/Ubuntu APT instructions used the former `baltocdn.com` mirror. Helm's security notice says that domain is no longer a Helm APT mirror and should not be used. Updated the APT commands to use the current `packages.buildkite.com` repository and key fingerprint verification from Helm's official install guide.
- The post described the APT repository as official. Helm documents APT as a community-provided package manager method, so the wording was changed to "current Helm apt repository."
- The installer script URLs used `get-helm-3`, but Helm 4 is the current stable release. Updated the macOS and Linux script examples to use `get-helm-4`.
- The manual binary download examples used Helm `v3.14.0`, which is outdated for a current generic install guide. Updated Linux and Windows manual binary examples and the expected `helm version` output to `v4.2.2`, the current Helm stable version shown in the checked sources.
- The MacPorts command used `helm-3`, which is no longer the current MacPorts Helm port. Updated it to `sudo port install helm-4.2`.
- The Linux dnf/yum section claimed broad RHEL/CentOS/Fedora repository support and used a `baltocdn.com` RPM repository. Helm's current docs only list Fedora 35+ via the official Fedora repository. Updated the section to Fedora and removed the obsolete repository setup commands.
- The Tiller troubleshooting row said only Helm 3 does not use Tiller. Updated it to "Helm 3 and later" to remain correct for current Helm.

## Review Notes
The remaining package-manager commands for Homebrew, Chocolatey, Winget, Scoop, Snap, Helm repository setup, shell completion, `helm version`, `helm list --all-namespaces`, and `helm env` matched the checked official or authoritative documentation. The post still uses package-manager methods that Helm classifies as community-provided rather than directly supported by the Helm project.
