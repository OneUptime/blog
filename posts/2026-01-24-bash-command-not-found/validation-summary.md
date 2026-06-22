# Validation Summary: How to Fix 'Command Not Found' Errors in Bash Scripts

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Bash
- POSIX shell utilities
- PATH environment variable
- cron
- Python command discovery
- Node.js and nvm
- Docker
- kubectl

## Sources Consulted
- GNU Bash Reference Manual: Command Search and Execution - https://www.gnu.org/software/bash/manual/html_node/Command-Search-and-Execution.html
- GNU Bash Reference Manual: Aliases - https://www.gnu.org/software/bash/manual/html_node/Aliases.html
- GNU Bash Reference Manual: Bash Builtins - https://www.gnu.org/software/bash/manual/html_node/Bash-Builtins.html
- POSIX.1-2024 command utility - https://pubs.opengroup.org/onlinepubs/9799919799/utilities/command.html
- Local Bash 5.2 help output for `command`, `type`, and `shopt`
- Local crontab(5) manual page for crontab environment assignment behavior
- Docker Engine post-installation steps for Linux - https://docs.docker.com/engine/install/linux-postinstall/
- Docker CLI local help output for `docker info`
- Kubernetes kubectl version reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- nvm project README - https://github.com/nvm-sh/nvm

## Issues Found
- The initial command-resolution flowchart showed Bash checking builtins before functions and aliases. Bash aliases are expanded while input is read, and Bash command search checks shell functions before shell builtins and then PATH. Updated the flowchart to show alias expansion before function, builtin, and PATH lookup.
- The Docker troubleshooting snippet checked `docker info` before checking whether the user is in the `docker` group, then reported every failure as "Docker daemon is not running." `docker info` can also fail when the daemon is inaccessible due to permissions. Updated the snippet to check group membership first with `grep -qw docker` and changed the later message to "not running or is not accessible."

## Review Notes
The remaining examples are technically valid Bash-oriented troubleshooting patterns. Several snippets are intentionally Linux/distribution-specific, such as `apt`, `yum`, `/snap/bin`, and `systemctl`, so future edits could clarify platform scope further if the article is expanded.
