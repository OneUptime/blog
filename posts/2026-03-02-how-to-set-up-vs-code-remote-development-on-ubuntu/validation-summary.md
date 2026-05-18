# Validation Summary: How to Set Up VS Code Remote Development on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- VS Code (Visual Studio Code)
- VS Code Remote Development extension pack (Remote-SSH, Dev Containers, Remote-Tunnels, WSL)
- OpenSSH (server and client)
- SSH key authentication (ed25519)
- Ubuntu (systemd, apt)
- Docker
- Dev Containers specification (devcontainer.json, features)
- VS Code CLI / Remote Tunnels (Microsoft tunnel relay)

## Sources Consulted
- VS Code Remote Development documentation: https://code.visualstudio.com/docs/remote/remote-overview
- VS Code Remote - SSH documentation: https://code.visualstudio.com/docs/remote/ssh
- VS Code Remote Tunnels documentation: https://code.visualstudio.com/docs/remote/tunnels
- Dev Containers specification: https://containers.dev/implementors/json_reference/
- Dev Container features repository: https://github.com/devcontainers/features
- OpenSSH client configuration manual (ssh_config(5))
- Ubuntu OpenSSH server documentation: https://documentation.ubuntu.com/server/how-to/security/openssh-server/
- Docker installation on Ubuntu documentation

## Issues Found
No technical issues found. All commands, configuration snippets, file paths, and field names verified against official documentation:

- The `openssh-server` install, `systemctl enable --now ssh`, and `ss -tlnp` commands are correct for Ubuntu.
- The `ssh-keygen -t ed25519`, `ssh-copy-id`, and `~/.ssh/config` syntax (HostName, IdentityFile, ServerAliveInterval, ServerAliveCountMax, ProxyJump, Port) all match the OpenSSH client manual.
- The VS Code server install path `~/.vscode-server/` is correct.
- The Remote Development extension pack contents (Remote-SSH, Dev Containers, Remote-Tunnels, WSL) match the marketplace listing.
- The `devcontainer.json` fields (`name`, `image`, `features`, `customizations.vscode.extensions`, `customizations.vscode.settings`, `postCreateCommand`, `remoteUser`, `mounts`) and feature reference paths (`ghcr.io/devcontainers/features/common-utils:2`, `node:1`, `python:1`) are valid per the Dev Containers spec.
- The Docker install via `docker.io`, `usermod -aG docker $USER`, and `docker run hello-world` are correct.
- The VS Code CLI download URL with `cli-alpine-x64` matches the official tunnels documentation (this build is statically linked and works on Ubuntu).
- `code tunnel`, `code tunnel service install`, and `code --list-extensions` are valid CLI commands.
- VS Code settings keys `files.watcherExclude`, `telemetry.telemetryLevel`, and `terminal.integrated.defaultProfile.linux` are correct.

## Review Notes
- The post describes the VS Code remote indicator as "green" in the bottom-left corner. The location (bottom-left status bar) is correct, but the color has varied across themes and VS Code versions — it is typically a darker blue/teal in recent versions. This is a minor stylistic detail, not a functional error.
- The `sudo systemctl enable --now code-tunnel` line after `./code tunnel service install` is technically redundant because the `service install` subcommand already registers and starts the service. It is harmless in most setups (it just re-enables an already-enabled unit) but not strictly necessary.
- The Dev Container `node:1` feature pulls Node.js 20 (as specified); the `python:1` feature pulls Python 3.11. Both are current as of 2026-05 but readers should be aware these features may continue to add newer versions (Node 22, Python 3.13+) over time.
- The example uses `ubuntu:22.04` as a base image; `ubuntu:24.04` is also a valid current LTS choice if readers want the newer base.
