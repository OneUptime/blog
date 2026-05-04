# Validation Summary: How to Configure Restic Backup over IPv6

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Restic (backup tool)
- IPv6 networking
- SFTP / SSH (with `AddressFamily inet6`)
- restic REST server (rest-server)
- S3-compatible object storage (MinIO)
- Bash scripting
- systemd services and timers

## Sources Consulted
- Restic documentation – Preparing a new repository: https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html
- Restic GitHub releases (asset filename pattern): https://github.com/restic/restic/releases
- rest-server GitHub releases (asset filename pattern and tarball layout): https://github.com/restic/rest-server/releases
- RFC 3986 / 5952 (IPv6 in URIs and IPv6 textual representation; only hex digits 0–9, a–f are valid)
- Restic SFTP backend behavior (URL syntax with brackets, port placement, double-slash for absolute paths)

## Issues Found

1. **Broken restic binary download URL.** The post used `https://github.com/restic/restic/releases/latest/download/restic_linux_amd64.bz2`. GitHub's `latest/download/<asset>` only redirects when the asset filename matches exactly, and restic's release assets are versioned (`restic_0.18.1_linux_amd64.bz2`), so the URL returned 404. Replaced with a `VERSION=0.18.1` variable and the correct version-bearing filenames (with a comment to check the releases page for newer versions). The post-extraction filename used in `mv` was also corrected to match the actual binary name.

2. **Broken rest-server download URL and post-extraction path.** Same `latest/download/` issue (`rest-server_linux_amd64.tar.gz` does not exist; actual asset is `rest-server_0.14.0_linux_amd64.tar.gz`), and the tarball extracts into a `rest-server_<version>_linux_amd64/` directory — so `sudo mv rest-server /usr/local/bin/` would have failed because `rest-server` was not in the current directory. Replaced with versioned URL and corrected the `mv` source path to the extracted subdirectory.

3. **Malformed restic SFTP IPv6 URL.** The post used `sftp://backupuser@[2001:db8::backup]:/data/backups/myhost`. Two problems:
   - `2001:db8::backup` is not a valid IPv6 literal — `k`, `u`, `p` are not hex digits.
   - In restic's SFTP URL syntax, an absolute path requires a double slash (`//path`), and the trailing `:` before a single-slash path is malformed (it implies an empty port).
   Corrected to `sftp://backupuser@[2001:db8::1]:22//data/backups/myhost`, matching the documented form `sftp://user@[::1]:2222//srv/restic-repo`.

4. **Misleading `-e "ssh -6"` comment.** Restic has no `-e` option (that is rsync's flag). The correct ways to force IPv6 with the SFTP backend are SSH client config (`AddressFamily inet6`) or `-o sftp.args="-6"`. Replaced the misleading comment with the actual documented options.

5. **Invalid IPv6 literal in SSH config example.** `HostName 2001:db8::backup` is not parseable IPv6; changed to `2001:db8::1`.

6. **Invalid IPv6 literal in S3 endpoint.** `s3:http://[2001:db8::storage]:9000/...` — `storage` contains non-hex characters (`s`, `t`, `o`, `r`, `g`), so the URL would fail to parse. Changed to `[2001:db8::2]`.

## Review Notes
- Restic CLI surface used (`init`, `backup`, `snapshots`, `check`, `restore --target --include`, `mount`, `forget --prune --keep-*`, `--password-file`, `--exclude-caches`, `--exclude`, `--tag`, `--verbose`) was verified against current docs and is correct.
- `rest-server` flags `--path`, `--listen`, `--tls`, `--tls-cert`, `--tls-key` are correct and current.
- Restic environment variables (`RESTIC_REPOSITORY`, `RESTIC_PASSWORD`, `RESTIC_PASSWORD_FILE`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) are correct.
- The systemd unit pulls an `EnvironmentFile=/etc/restic/environment` while the script also sets `RESTIC_REPOSITORY` / `RESTIC_PASSWORD_FILE` itself; both will work, but the duplication is ergonomically odd. Not strictly incorrect, so left as-is.
- The `--listen "[::]:8000"` form on Linux will normally accept both IPv4 and IPv6 connections (dual-stack via `IPV6_V6ONLY=0`); operators who need pure IPv6 should set `net.ipv6.bindv6only=1` or run a dedicated listener. Left unchanged because the post's framing is correct for typical IPv6-enabled deployments.
- Pinning specific versions (0.18.1 / 0.14.0) in the binary download examples will become outdated; the inline comment instructing readers to consult the releases page mitigates this.
