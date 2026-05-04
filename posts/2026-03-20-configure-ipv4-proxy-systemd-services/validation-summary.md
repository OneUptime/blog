# Validation Summary: How to Configure IPv4 Proxy Settings in systemd Services on Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- systemd (unit files, drop-ins, `system.conf.d`)
- `systemctl edit`, `systemctl daemon-reload`, `systemctl show`
- `Environment=`, `EnvironmentFile=`, `DefaultEnvironment=` directives
- HTTP/HTTPS proxy environment variables (`http_proxy`, `https_proxy`, `no_proxy` and uppercase variants)
- Docker daemon proxy configuration via systemd drop-in
- `journalctl` for log inspection
- `curl` for proxy verification

## Sources Consulted
- systemd.exec(5) — documents `Environment=` and `EnvironmentFile=` directives: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemd-system.conf(5) — documents `[Manager]` section and `DefaultEnvironment=`: https://www.freedesktop.org/software/systemd/man/systemd-system.conf.html
- systemd.unit(5) — documents drop-in files and the `.service.d/` directory pattern: https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- systemctl(1) — documents `systemctl edit` behavior (creates drop-in overrides): https://www.freedesktop.org/software/systemd/man/systemctl.html
- Docker docs: HTTP/HTTPS proxy via systemd: https://docs.docker.com/config/daemon/systemd/
- curl manual — environment variables (`http_proxy` is HTTP-only; `HTTPS_PROXY`/`https_proxy` is used for HTTPS URLs): https://curl.se/docs/manpage.html

## Issues Found
- **Verification test command would not actually exercise the proxy.** In the "Verifying Proxy is Used" section, the original command set only `http_proxy` but then ran `curl -I https://example.com`. curl uses `HTTPS_PROXY`/`https_proxy` (not `http_proxy`) when the target URL is HTTPS, so the proxy would have been bypassed in this test. Fixed by adding `https_proxy=http://proxy.corp.example.com:3128` to the `env` invocation so the HTTPS request actually routes through the proxy.

## Review Notes
- The post is technically accurate overall. The choice of using both lowercase and uppercase env-var variants is appropriate because applications differ (curl historically only checks lowercase `http_proxy`, while many other tools check uppercase `HTTP_PROXY`).
- CIDR ranges in `no_proxy` (e.g., `10.0.0.0/8`) are supported by modern clients (Go's `net/http`, recent curl), but some older or alternative clients still expect plain hostnames or IPs. Worth being aware of when adopting this pattern with mixed tooling.
- Leading-dot domain matching in `no_proxy` (e.g., `.local`, `.svc.cluster.local`) is widely supported but not universally — some clients require the suffix without the leading dot. The convention shown is the most portable.
- `DefaultEnvironment=` in `/etc/systemd/system.conf.d/` does affect every system service (including critical ones like networking/DNS), so the post's caution note is appropriate. Backslash line-continuation in unit files is supported per `systemd.syntax(7)`.
- The note about `/etc/environment` being read by PAM for login sessions (not by systemd services directly) is correct.
- Storing proxy credentials in a file with `chmod 600` and `chown root:root` is a reasonable baseline; for stronger protection on systems with systemd 250+, `LoadCredential=`/`SetCredential=` could be considered in future revisions.
