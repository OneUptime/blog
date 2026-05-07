# Validation Summary: How to Enable mod_remoteip to Log Real Client IPv4 Behind a Proxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server 2.4
- `mod_remoteip`
- `mod_log_config`
- `mod_headers`
- Debian/Ubuntu Apache administration commands (`a2enmod`, `a2enconf`, `apache2ctl`)
- Reverse proxy client IP forwarding via `X-Forwarded-For` and `X-Real-IP`

## Sources Consulted
- Apache `mod_remoteip` documentation: https://httpd.apache.org/docs/current/en/mod/mod_remoteip.html
- Apache `mod_log_config` documentation: https://httpd.apache.org/docs/current/mod/mod_log_config.html
- Apache `mod_headers` documentation: https://httpd.apache.org/docs/current/mod/mod_headers.html
- Apache expression syntax documentation: https://httpd.apache.org/docs/current/expr.html
- Debian `a2enmod(8)` man page: https://manpages.debian.org/bookworm/apache2/a2enmod.8.en.html
- Debian `a2enconf(8)` man page: https://manpages.debian.org/bookworm/apache2/a2enconf.8.en.html
- Debian `apache2ctl(8)` man page: https://manpages.debian.org/bookworm/apache2/apache2ctl.8.en.html
- Debian Apache package file list: https://packages.debian.org/sid/amd64/apache2/filelist

## Issues Found
- The config snippet manually loaded `mod_remoteip` with `LoadModule` even though the post already enables the module with `a2enmod remoteip`. On Debian/Ubuntu, `a2enmod` creates the module symlink in `mods-enabled`, so the extra `LoadModule` line was removed to avoid duplicate-loading guidance.
- The `RemoteIPInternalProxy` explanation said it was for proxies that do not append themselves to `X-Forwarded-For`. Apache documents it differently: it is for trusted internal proxies whose forwarded client IP may itself be private or intranet space. The prose and inline comment were corrected to match the documented behavior.
- The post labeled a `LogFormat` using `%O` as the standard combined format. Apache documents standard combined format with `%b`; `%O` is provided by `mod_logio` and changes the meaning. The format strings were corrected to use `%b`.
- The extended log example claimed to show a proxy chain with `%{c}a`, but `%{c}a` only logs the underlying connection peer. The example was updated to include `%{remoteip-proxy-ip-list}n`, which Apache documents as the note containing the processed intermediate proxy list.
- The debug-header example used `Header always set X-Debug-Remote-Addr "%{REMOTE_ADDR}s"`, which is not valid for retrieving `REMOTE_ADDR` via `mod_headers`. It was replaced with the documented expression form `Header always set X-Debug-Remote-Addr "expr=%{REMOTE_ADDR}"`, and the verification commands now note the `mod_headers` dependency.
- The verification virtual host included `ProxyPass`, which introduced an unnecessary `mod_proxy` dependency unrelated to validating `mod_remoteip`. That line was removed so the example stays focused on the feature being tested.
- The example comment for CDN IPs was tightened to make clear the listed Cloudflare ranges are examples, not a complete provider allowlist.

## Review Notes
- The commands and file paths in the post are Debian/Ubuntu specific. They rely on `/etc/apache2/...`, `a2enmod`, `a2enconf`, and `apache2ctl`, which are not the generic layout used by every Apache distribution.
- Apache processes multi-valued `X-Forwarded-For` headers right to left and only trusts addresses presented by configured trusted proxies. The corrected post now aligns its logging example with that behavior.
