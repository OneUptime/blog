# Validation Summary: How to Configure VS Code as the Default IDE in Google Cloud Workstations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Workstations
- Google Cloud CLI
- Code OSS for Cloud Workstations
- VS Code Remote - SSH
- VS Code Tunnels
- VS Code Settings Sync
- Dockerfile and shell startup scripts

## Sources Consulted
- Google Cloud Workstations preconfigured base images: https://docs.cloud.google.com/workstations/docs/preconfigured-base-images
- Google Cloud Workstations preconfigured IDEs: https://docs.cloud.google.com/workstations/docs/preconfigured-ides
- Google Cloud Workstations customize container images: https://docs.cloud.google.com/workstations/docs/customize-container-images
- Google Cloud Workstations develop code using a local VS Code editor: https://docs.cloud.google.com/workstations/docs/develop-code-using-local-vscode-editor
- Google Cloud Workstations SSH support: https://docs.cloud.google.com/workstations/docs/ssh-support
- Google Cloud CLI `gcloud workstations configs create`: https://docs.cloud.google.com/sdk/gcloud/reference/workstations/configs/create
- Google Cloud CLI `gcloud workstations start`: https://docs.cloud.google.com/sdk/gcloud/reference/workstations/start
- Google Cloud CLI `gcloud workstations ssh`: https://docs.cloud.google.com/sdk/gcloud/reference/workstations/ssh
- Google Cloud CLI `gcloud workstations start-tcp-tunnel`: https://docs.cloud.google.com/sdk/gcloud/reference/workstations/start-tcp-tunnel
- VS Code Remote Development using SSH: https://code.visualstudio.com/docs/remote/ssh
- VS Code command line and tunnels documentation: https://code.visualstudio.com/docs/editor/command-line
- VS Code Settings Sync: https://code.visualstudio.com/docs/editor/settings-sync
- VS Code keyboard shortcuts: https://code.visualstudio.com/docs/getstarted/keybindings

## Issues Found
- The extension installation example used `code-oss-cloud-workstations` directly in a Docker build step and described Marketplace IDs. Google documents extension installation for Code OSS for Cloud Workstations through Open VSX and shows the CLI being run as `user` from a startup script. I changed the example to copy a startup script into `/etc/workstation-startup.d/` and run `/opt/code-oss/bin/codeoss-cloudworkstations` with Open VSX extension IDs.
- The extension list included GitHub Copilot, which is not a reliable Open VSX example for Code OSS for Cloud Workstations. I removed it from the startup-script example.
- The settings script created the settings directory as root and only changed ownership of the file. I changed it to `chown -R user:user "${SETTINGS_DIR}"` so the workstation user owns the generated settings directory and file.
- The settings example configured `ms-python.python` as a Python formatter. The current Python extension no longer represents the formatter setup that way, so I removed that language-specific formatter entry.
- The local VS Code section said to install "Google Cloud Code" as the Cloud Workstations extension. Google documents the local VS Code flow using VS Code Remote - SSH, with Cloud Code as an optional local extension. I changed the step accordingly.
- The SSH setup used `gcloud workstations ssh --dry-run`, but the documented `gcloud workstations ssh` command does not include `--dry-run`. I replaced this with the documented `gcloud workstations start-tcp-tunnel` flow and updated the VS Code connection instructions to use `user@localhost:<port>`.
- The post claimed local VS Code extensions are used when connected remotely. VS Code Remote - SSH runs UI extensions locally but workspace extensions normally run on the remote host. I clarified that behavior.
- The VS Code tunnels section described tunnels as direct Cloud Workstations support and used the Alpine CLI download. I rephrased it as VS Code's own tunnel feature and changed the download to the Linux x64 CLI for the Cloud Workstations base image context.
- The keybindings example gave an unverified Cloud Workstations-specific path. I changed the instruction to use VS Code's documented "Preferences: Open Keyboard Shortcuts (JSON)" flow.
- The Settings Sync section implied extensions sync to remote SSH windows. VS Code documentation says extensions are not synchronized to or from remote windows, so I added that caveat.

## Review Notes
The primary Cloud Workstations configuration command and the predefined Code OSS image name are current in the Google Cloud CLI documentation. Some extension IDs in Open VSX can change availability over time, so teams should pin extension versions or use VSIX files from trusted sources for reproducible builds.
