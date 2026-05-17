# Validation Summary: How to Set Up a Local APT Repository Mirror with apt-mirror on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- apt-mirror (Ubuntu package mirroring tool)
- Ubuntu 22.04 (Jammy) APT repositories
- nginx (serving the mirror over HTTP)
- cron (scheduled synchronization)
- bash scripting (sync wrapper script)
- APT/dpkg client configuration
- GPG / apt-key (Ubuntu archive signing key)

## Sources Consulted
- apt-mirror upstream project / source: https://github.com/apt-mirror/apt-mirror
- Ubuntu apt-mirror package documentation (default `/etc/apt/mirror.list` shipped by the package)
- Ubuntu Archive Mirrors documentation: https://help.ubuntu.com/community/Rsyncmirror
- nginx documentation for `location`, `autoindex`, `expires`, and nested locations: https://nginx.org/en/docs/
- wget `--limit-rate` syntax (used by apt-mirror's `limit_rate`): https://www.gnu.org/software/wget/manual/wget.html
- Ubuntu Archive Automatic Signing Key (2018) — key ID `3B4FE6ACC0B21F32` is the correct/canonical Ubuntu archive signing key.
- cron(5) man page for both user crontab and `/etc/cron.d/` formats.

## Issues Found
1. **Invalid apt-mirror config variable `spool_path`** — the post used `set spool_path $base_path/skel`, but apt-mirror has no such variable. The correct option is `set skel_path`. Fixed by renaming to `skel_path` and clarifying the comment.
2. **Invalid apt-mirror config variable `_retry`** — `set _retry 3` is not a recognized apt-mirror configuration option (apt-mirror's known variables are `base_path`, `mirror_path`, `skel_path`, `var_path`, `cleanscript`, `nthreads`, `_tilde`, `_autoclean`, `_contents`, `limit_rate`, `run_postmirror`, `unlink`, `use_proxy`, `http_proxy`, `https_proxy`, `proxy_user`, `proxy_password`, `no_check_certificate`, `defaultarch`, `postmirror_script`). Removed the line, and added the standard `set var_path` instead, which is the variable users actually may want to override.
3. **Misleading comment on `set _tilde 0`** — the original comment read "Log file location", which is wrong. `_tilde` controls whether files whose names contain a `~` character (tilde versions) are downloaded. Updated the comment.
4. **Misleading comment on `limit_rate`** — the original said "Bandwidth limit in kbps (0 = unlimited)". `limit_rate` is passed through to wget and uses wget's rate-limit syntax (bytes by default, `k` = KB/s, `m` = MB/s) — not kilobits per second, and `0` is not a special value. Updated the comment to reference the actual syntax.

## Review Notes
- `apt-key` is deprecated on Ubuntu 22.04+ and prints a warning, but still functions; the post correctly presents it only as a troubleshooting fallback rather than a primary setup step. The modern equivalent is placing the key in `/etc/apt/trusted.gpg.d/` or using `signed-by=` in the sources entry — worth a future revision.
- The post pins examples to Ubuntu 22.04 (Jammy). When Jammy reaches end-of-standard-support (April 2027), the examples will need to be re-pointed at a newer LTS (e.g., 24.04 Noble).
- The nested `location` blocks inside `location /` in the nginx config are valid (nginx allows nested locations); however, many operators prefer flattening them for readability. Not a correctness issue.
- The Ubuntu archive signing key ID `3B4FE6ACC0B21F32` is correct and is the current Ubuntu Archive Automatic Signing Key (2018), used by Jammy.
- apt-mirror itself is an older, lightly maintained tool. For new deployments, `apt-mirror2` (a Python rewrite) and `debmirror` are alternatives worth mentioning in a future update; the post does already mention `debmirror` for partial mirrors, which is good.
- The `clean` directive is correctly described — it removes files from the local mirror that no longer exist upstream.
- The cron formats (user crontab vs `/etc/cron.d/`) are both correct, including the required user field in the `/etc/cron.d/` entry.
