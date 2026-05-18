# Validation Summary: How to Set Up Velociraptor for Endpoint Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide — step-by-step installation and configuration walkthrough for Velociraptor on Ubuntu, covering server setup, client deployment, VQL basics, custom artifacts, hunts, and event-based monitoring.

## Technologies Covered
- Velociraptor (open-source EDR/DFIR platform by Velocidex)
- VQL (Velociraptor Query Language)
- Ubuntu Linux
- systemd (service unit files)
- YAML (artifact definitions)
- TLS / self-signed PKI

## Sources Consulted
- Velociraptor CLI reference — https://docs.velociraptor.app/docs/cli/
- `config` command group — https://docs.velociraptor.app/docs/cli/config/
- `artifacts` command group — https://docs.velociraptor.app/docs/cli/artifacts/
- `user` command group — https://docs.velociraptor.app/docs/cli/user/
- Deployment example — https://docs.velociraptor.app/docs/deployment/server/deployment_example/
- Managing artifacts — https://docs.velociraptor.app/docs/artifacts/managing/
- Artifact references for `Linux.Sys.Crontab`, `Linux.Sys.BashHistory`, etc. — https://docs.velociraptor.app/artifact_references/
- Velociraptor GitHub releases (binary naming/URL pattern) — https://github.com/Velocidex/velociraptor/releases

## Issues Found

1. **Invalid flag `--self_signed` on `config generate`.** The post used `velociraptor config generate --self_signed`. Per the official CLI docs, `config generate` accepts only `-i/--interactive`, `--merge`, `--merge_file`, `--patch`, and `--patch_file`. Running it with no flag already produces a self-signed deployment by default. Fixed by removing the flag and updating the comment to explain the default behavior.

2. **Misspelled subcommand `config rotate_key`.** The correct subcommand is `config rotate_keys` (plural). Fixed by adding the trailing `s`.

3. **Non-existent `artifacts upload` subcommand.** The post instructed readers to run `velociraptor … artifacts upload <file>`. The `artifacts` command group exposes `list`, `show`, `collect`, `reformat`, and `verify` — no `upload`. Custom artifacts are added to the server through the web UI ("View Artifacts" → "Add an Artifact"), via VQL's `artifact_set()`, or by loading them from a directory at runtime with `--definitions`. Fixed by replacing the upload command with UI-based instructions plus an `artifacts verify` example using `--definitions` for local validation.

## Review Notes
- The pinned version `0.72.3` is reasonable as a documentation snapshot but will date over time; readers should consult the GitHub releases page for the current binary.
- VQL examples (`pslist()`, `glob()`, `netstat()`, `now() - 3600`, `watch_monitoring()`, `Mode.IsSetuid`) match current VQL plugin/function names and idioms.
- Built-in artifact names referenced (`Linux.Sys.Users`, `Linux.Network.NetstatEnriched`, `Linux.Proc.Modules`, `Linux.Detection.YaraProcess`, `Linux.Sys.Crontab`, `Linux.Mounts`, `Linux.Sys.BashHistory`) are all valid current artifacts.
- Default ports (Frontend `8000`, GUI `8889`) and config field names (`Frontend.hostname`, `Datastore.location`, `Datastore.filestore_directory`) match the generated config schema.
- The post's security guidance to bind the GUI to `127.0.0.1` and tunnel via SSH for non-public deployments aligns with the project's recommended hardening.
- The systemd unit files run Velociraptor as `root`, which the post does not call out. This is acceptable for a client (needs broad access for forensic collection) and common for the server, but future revisions could mention dropping privileges for the server via the documented `Frontend.username`/`Frontend.group` settings.
