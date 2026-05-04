# Validation Summary: How to Set Up Corporate Proxy Environment Variables for IPv4 on Linux

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Linux shell environment variables (`http_proxy`, `https_proxy`, `ftp_proxy`, `no_proxy`)
- Bash / Zsh shell configuration (`~/.bashrc`, `~/.zshrc`)
- `/etc/environment` system-wide configuration
- URL encoding for proxy credentials
- apt (Debian/Ubuntu package manager) proxy configuration
- pip (Python package manager) proxy configuration
- git proxy configuration
- curl proxy configuration (`--proxy` flag, `~/.curlrc`)
- wget proxy configuration (`~/.wgetrc`)
- `env -u` for per-command variable unset

## Sources Consulted
- curl documentation on environment variables and `--proxy` flag (https://curl.se/docs/manpage.html)
- GNU wget manual for `~/.wgetrc` proxy options (https://www.gnu.org/software/wget/manual/wget.html)
- APT configuration documentation (apt.conf(5), Acquire::http::Proxy directive)
- pip user guide on proxy configuration (https://pip.pypa.io/en/stable/user_guide/#using-a-proxy-server)
- git-config documentation for `http.proxy` / `https.proxy` (https://git-scm.com/docs/git-config)
- Debian/Ubuntu documentation on `/etc/environment` and PAM env handling
- coreutils `env` documentation for the `-u` flag

## Issues Found
No technical issues found.

All commands, flags, and configuration formats verified against official documentation:
- Environment variable names and conventions are correct (lowercase + uppercase variants).
- `/etc/environment` format (key=value, no `export`) is accurate.
- URL-encoding mappings (`@` → `%40`, `:` → `%3A`, `#` → `%23`) are correct percent-encodings.
- `Acquire::http::Proxy` / `Acquire::https::Proxy` directives in `/etc/apt/apt.conf.d/` are valid.
- `~/.pip/pip.conf` `[global]` section with `proxy = ...` is a valid pip configuration.
- `git config --global http.proxy` and `https.proxy` are valid git config keys.
- `curl --proxy` flag and `~/.curlrc` `proxy = "..."` syntax are correct.
- `~/.wgetrc` keys (`http_proxy`, `https_proxy`, `use_proxy = on`) are valid.
- `env -u VAR command` correctly unsets a variable for a single command (POSIX coreutils).

## Review Notes
- **CIDR ranges in `no_proxy`**: The post includes CIDR notation (e.g., `10.0.0.0/8`, `192.168.0.0/16`) in `no_proxy`. CIDR support in `no_proxy` is not universal — curl supports it since 7.86.0 (released Oct 2022), and Go's `net/http` supports it, but many tools (older curl, Python `requests`, libcurl-using apps on older systems) only match exact hostnames/IPs or domain suffixes. With current curl 8.x, the example works as documented; users on older toolchains may need to enumerate hosts/IPs explicitly.
- **`~/.pip/pip.conf` location**: This is the legacy path and still recognized by pip for backward compatibility. The XDG-compliant modern path is `~/.config/pip/pip.conf` on Linux. Both work.
- **`git http.sslVerify false`**: The post correctly flags this as "Not recommended for production." A safer alternative for self-signed corporate proxy CAs is to add the CA cert to the system trust store or use `git config --global http.sslCAInfo /path/to/ca.pem`.
- **httpoxy caveat**: `HTTPS_PROXY` (uppercase) was historically problematic in CGI environments due to the httpoxy vulnerability (CVE-2016-5385 et al.), but for interactive shell / CLI usage as described here, this is not relevant.
- **`/etc/environment` parsing**: Variables defined here are loaded by PAM (`pam_env`) and are available to login shells but are not parsed as a shell script — only simple `KEY=value` assignments work, no shell expansion. The post correctly notes the absence of `export`.
