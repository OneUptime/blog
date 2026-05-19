# Validation Summary: How to Set Up Environment Files for Services on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- systemd (unit files, EnvironmentFile=, Environment=, LoadCredentialEncrypted=, ExecReload=)
- systemd-creds (encrypted credential storage, systemd 250+)
- systemd-analyze verify
- Ubuntu (22.04 LTS, 22.10 systemd version differences)
- HashiCorp Vault CLI (login, kv get)
- Docker Compose (.env files, ${VAR:-default} syntax)
- Bash (here-strings, here-docs, sudo/tee patterns)

## Sources Consulted
- systemd.exec(5) — https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html (EnvironmentFile= format, comment handling, lack of variable expansion in env files)
- systemd.service(5) — Exec* directive parsing rules (no shell invocation)
- systemd-creds(1) — https://man7.org/linux/man-pages/man1/systemd-creds.1.html (verbs, options, --system flag scope)
- systemd GitHub issue #12527 — confirmation that inline `#` comments are NOT stripped in EnvironmentFile
- Ubuntu package archive (jammy/kinetic) — systemd version verification (22.04 ships systemd 249; 22.10 ships systemd 251)
- HashiCorp Vault CLI docs — `vault login -method=aws`, `vault kv get -mount=secret -field=...`
- Docker Compose docs — .env file variable substitution syntax

## Issues Found

1. **Inline comments in EnvironmentFile (Multiple Environment Files section).** The example `DATABASE_POOL_SIZE=20  # Override default for production` would actually set the variable to the literal string `20  # Override default for production` because systemd only strips full-line comments (lines beginning with `#` or `;`). Confirmed via systemd.exec(5) and upstream issue systemd/systemd#12527. **Fix:** Moved the comment onto its own line above the assignment and added a brief explanatory note that inline comments are not supported.

2. **Extraneous `--system` flag on `systemd-creds encrypt` (Handling Sensitive Values section).** The `--system` option in systemd-creds(1) is documented only for the `list` and `cat` verbs (to operate on system-wide credentials vs. those passed to the current execution context). It has no defined meaning with the `encrypt` verb. **Fix:** Removed `--system` from both `encrypt` invocations and added a short clarifying comment.

3. **Shell operator `&&` in ExecReload= (Docker Compose section).** systemd does not invoke a shell for `Exec*` directives — the line is parsed as executable + space-separated arguments, so `&&` would be passed as a literal argument to `docker compose pull`. **Fix:** Replaced the single-line `ExecReload=... && ...` with two sequential `ExecReload=` lines (which systemd runs in order, stopping on the first failure) and added a brief comment explaining the constraint.

## Review Notes

- The post's claim that `export` is unsupported in EnvironmentFile= is a reasonable safety recommendation. Older systemd versions strictly required `KEY=VALUE`. Some newer systemd builds may tolerate `export` as a no-op, but the advice in the post is the portable, correct guidance.
- The post correctly states that shell-style variable expansion (`${VAR}`) does not work inside EnvironmentFile= values — confirmed by systemd.exec(5).
- The Ubuntu/systemd version mapping is accurate at the time of review (22.04 LTS → systemd 249, 22.10 → systemd 251, 24.04 LTS → systemd 255). The `systemd-creds` / `LoadCredentialEncrypted=` features require systemd 250+.
- The `ExecStart=/bin/bash -c 'export DATABASE_PASSWORD=$(cat $CREDENTIALS_DIRECTORY/database-password) ...'` pattern works but can leak a trailing newline (left over from the `<<<` here-string used during encryption). Authors using this pattern in production may want to strip with `tr -d '\n'`. Not a correctness bug for the example shown — left as-is.
- The systemctl directive ordering and the override semantics of multiple `EnvironmentFile=` lines (later wins) are correctly described.
- The `JDBC_URL` example containing `&` and `?` characters is fine: env files do not interpret these as special.
