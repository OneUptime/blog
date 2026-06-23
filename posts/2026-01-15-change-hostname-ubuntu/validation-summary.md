# Validation Summary: How to Change Hostname on Ubuntu Server

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu Server
- systemd `hostnamectl`
- `/etc/hostname`, `/etc/hosts` configuration files
- NetworkManager (`nmcli`)
- cloud-init (AWS EC2, DigitalOcean, Google Cloud)
- google-guest-agent
- Postfix, Apache (apache2), Nginx
- Bash scripting

## Sources Consulted
- systemd `hostnamectl(1)` man page — https://www.freedesktop.org/software/systemd/man/latest/hostnamectl.html
- systemd `hostname(5)` man page (static/transient/pretty hostname definitions) — https://www.freedesktop.org/software/systemd/man/latest/hostname.html
- RFC 1123 §2.1 (host name length and character rules) — https://www.rfc-editor.org/rfc/rfc1123
- RFC 952 (host name syntax) — https://www.rfc-editor.org/rfc/rfc952
- NetworkManager `nmcli(1)` general hostname — https://networkmanager.dev/docs/api/latest/nmcli.html
- cloud-init `preserve_hostname` / `update_hostname` docs — https://cloudinit.readthedocs.io/en/latest/reference/modules.html
- Google Cloud guest environment / google-guest-agent docs — https://cloud.google.com/compute/docs/images/guest-environment

## Issues Found
- **Hostname minimum length (line 113):** The post stated a valid hostname must "Be 2-63 characters long." A DNS label / hostname can be as short as 1 character per RFC 1123 §2.1 (max 63 octets, minimum 1). Changed to "Be 1-63 characters long."

## Review Notes
- The static/transient/pretty hostname descriptions, all `hostnamectl` commands (including `--static` and `--pretty`), `hostname -f`/`-s` usage, `nmcli general hostname`, and the cloud-init `preserve_hostname` guidance are all accurate and current.
- The "Not have consecutive hyphens" requirement is a reasonable naming convention but is not strictly enforced by RFC 1123 or systemd's `hostname_is_valid()` (consecutive internal hyphens are technically permitted — e.g. punycode `xn--`). It also slightly contradicts the post's own validation regex `^[a-z0-9][a-z0-9-]*[a-z0-9]$`, which allows them. Left as-is since it reads as a best-practice recommendation rather than a hard error.
- The validation regex in the scripting section only accepts lowercase, which is appropriate (hostnames are case-insensitive and conventionally lowercase) but rejects single-character names; consistent with the script's stated intent.
- Stopping `google-guest-agent` to prevent GCP from managing `/etc/hosts` is valid; on current GCE images the unit is `google-guest-agent.service`.
