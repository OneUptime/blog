# Validation Summary: How to Run Scripts at First Boot with cloud-init on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- cloud-init (runcmd, bootcmd, write_files modules)
- Ubuntu
- YAML cloud-config
- Bash / POSIX shell scripting
- systemd unit files
- MIME multipart user-data
- Python `email.mime` module
- Docker (in error-handling example)

## Sources Consulted
- cloud-init official documentation: https://cloudinit.readthedocs.io/
- cloud-init modules reference: https://cloudinit.readthedocs.io/en/latest/reference/modules.html
- cloud-init runcmd module: https://cloudinit.readthedocs.io/en/latest/reference/modules.html#runcmd
- cloud-init bootcmd module: https://cloudinit.readthedocs.io/en/latest/reference/modules.html#bootcmd
- cloud-init scripts-per-instance / per-boot / per-once module docs
- cloud-init source code (`cc_runcmd`, `util.shellify`) for shell behavior
- Python `email.mime.multipart` / `email.mime.text` documentation
- POSIX shell vs bash redirection semantics (`&>` is a bashism, not supported by `dash`)

## Issues Found

1. **Incorrect path for "per-instance" scripts directory.**
   - The "Script Frequency" section listed `/var/lib/cloud/instance/scripts/` as where scripts placed by the user "run once per instance." That path is where cloud-init *extracts* user-data scripts; it is not the documented `scripts-per-instance` module location.
   - **Fix:** Changed to `/var/lib/cloud/scripts/per-instance/`, which is the actual directory the `scripts-per-instance` module scans (and matches the sibling `per-boot` / `per-once` paths shown below it).

2. **Bash-only redirect (`&>`) used inside `runcmd` block.**
   - The error-handling example used `command -v docker &>/dev/null` inside a `runcmd` multi-line script. `runcmd` commands are written to a script with `#!/bin/sh` and executed via `/bin/sh`, which on Ubuntu is `dash`. `dash` does not support the `&>` operator, so this line would silently misbehave (it would background `command -v docker` and then attempt an invalid redirect).
   - **Fix:** Changed to POSIX-compatible `>/dev/null 2>&1`.

## Review Notes

- The `write_files` script and the standalone "User Data as a Shell Script" example both use a `#!/bin/bash` shebang, so the bash-specific constructs in those blocks (`exec > >(tee …)`, brace expansion in `mkdir -p /opt/myapp/{bin,config,logs,data}`, etc.) are valid in those contexts and were left as-is.
- The MIME multipart structure (`text/cloud-config`, `text/x-shellscript`, `multipart/mixed` boundary format) matches what cloud-init documents and supports.
- The Python `MIMEText(content, 'cloud-config', 'utf-8')` / `MIMEText(content, 'x-shellscript', 'utf-8')` calls correctly produce parts with the cloud-init-recognized Content-Types.
- The `bootcmd` vs `runcmd` table is accurate: `bootcmd` runs on every boot at a very early stage, `runcmd` runs once per instance after the cloud-config modules complete.
- Statement that "by default a failing command in `runcmd` logs the error but continues" is correct — cloud-init does not propagate non-zero exit codes from individual `runcmd` items by default.
- `/dev/xvdb` (used in the `bootcmd` mount example) is appropriate for older AWS Xen-based instance types; on Nitro instances the device would appear as `/dev/nvme1n1` (as the post correctly demonstrates in the per-boot example). This is illustrative rather than incorrect.
- Minor stylistic observation (no change made): the comparison table's "Use case" row for `runcmd` says "package config," which is fine, though strictly speaking package installation is normally handled by the `packages` cloud-config key, not `runcmd`.
