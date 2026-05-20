# Validation Summary: How to Configure Desktop Notifications on Ubuntu Server (Headless)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- libnotify / notify-send
- D-Bus desktop notifications
- OpenSSH
- ntfy
- systemd service failure handling
- cron
- Slack incoming webhooks
- wall

## Sources Consulted
- notify-send local help output (`notify-send --help`)
- OpenSSH ssh-keygen local help output (`ssh-keygen -?`)
- systemd.unit local manual page and installed systemd 255 documentation (`man systemd.unit`)
- ntfy official publishing documentation: https://docs.ntfy.sh/publish/
- ntfy official configuration documentation: https://docs.ntfy.sh/config/
- ntfy official installation documentation: https://docs.ntfy.sh/install/
- Slack official incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks
- util-linux wall local help output (`wall --help`)
- curl local help output (`curl --help`)

## Issues Found
- Corrected the desktop notification explanation: `notify-send` is a notification client, not a backend, and headless Ubuntu systems usually lack a graphical user session bus and notification daemon even if system D-Bus is running.
- Fixed the SSH notification command to shell-escape `urgency`, `summary`, and `body` before passing them to the remote shell, so quotes and shell metacharacters in notification text do not break the command.
- Added creation of the `notification-sender` account and `/etc/notification-keys` directory before generating a key as that user.
- Replaced the unsafe/broken `authorized_keys` command restriction example with guidance to use a wrapper that validates `SSH_ORIGINAL_COMMAND`; the original example would not correctly execute the intended notify-send command and encouraged unsafe shell handling.
- Updated ntfy download examples from v2.7.0 to the current v2.23.0 examples from the official docs and corrected the tarball copy path to `ntfy_*_linux_amd64/ntfy`.
- Updated the ntfy server install path to use the official `archive.ntfy.sh` Debian/Ubuntu repository before falling back to a current `.deb` download.
- Changed the self-hosted ntfy publishing user from an admin account to a regular `publisher` account with `write-only` ACLs, matching the stated publishing-only purpose.
- Fixed the systemd `OnFailure=` drop-in section from `[Service]` to `[Unit]` and changed the specifier from `%n` to `%N` to avoid creating unit names like `service-failure-notify@nginx.service.service`.
- Updated the notification service template to pass `%i.service` to the handler so the script checks the original service name after using `%N` in the trigger.
- Removed unsupported Slack webhook `channel` and `username` overrides from the payload and generated the JSON payload with Python's `json` module so titles/messages containing quotes or newlines remain valid JSON.

## Review Notes
- The ntfy and Slack examples are intentionally minimal and still require real topics, URLs, credentials, and firewall/proxy setup in production.
- The Slack example uses legacy attachments, which Slack still documents as supported message formatting, but Block Kit would be preferable for a future modernization pass.
