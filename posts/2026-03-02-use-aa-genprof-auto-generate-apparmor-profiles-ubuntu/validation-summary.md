# Validation Summary: How to Use aa-genprof to Auto-Generate AppArmor Profiles on Ubuntu

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- AppArmor (Linux Mandatory Access Control)
- `aa-genprof` (AppArmor utility)
- `aa-logprof` (AppArmor utility)
- `apparmor_parser`
- `aa-status`
- `aa-enforce`
- systemd / journalctl
- Ubuntu (apt package manager)

## Sources Consulted
- Local Ubuntu installation: `/etc/apparmor.d/abstractions/` directory listing (115 abstractions verified)
- `dpkg -l` and `apt-cache show apparmor-utils` to confirm package availability and naming
- AppArmor upstream documentation conventions (https://gitlab.com/apparmor/apparmor/-/wikis/home)
- Ubuntu AppArmor wiki (https://wiki.ubuntu.com/AppArmor) — referenced in the post itself
- Known behavior of `aa-genprof` interactive prompts and the apparmor-utils Python tooling

## Issues Found
1. **Incorrect abstraction name in decision guidelines.** The post originally referenced `abstractions/ssl` as the abstraction for `/usr/lib/x86_64-linux-gnu/libssl.so`. This abstraction does not exist in the Ubuntu apparmor-utils package — the SSL-related abstractions are `openssl`, `ssl_certs`, `ssl_keys`, and `crypto`. Changed `abstractions/ssl` to `abstractions/openssl`, which is the correct abstraction for processes that link against the OpenSSL libraries.

## Review Notes
- The example menu output for path access prompts (`(A)llow / [(D)eny] / (I)gnore / (G)lob / Glob with (E)xt / (N)ew / Abo(r)t / (F)inish`) is slightly simplified — real `aa-genprof` output also includes `(O)wner` and `(M)ore` options, and for benign read accesses typically defaults to `[(A)llow]` rather than `[(D)eny]`. However, the defaults shown vary by severity and version, so this is treated as illustrative example output rather than a technical error.
- The `apache2-common` abstraction referenced in the example output exists (verified locally) but would only be a suggested abstraction by `aa-genprof` if Apache profile data is installed. It is unusual but not incorrect to appear in example output.
- The `sudo aa-genprof /usr/sbin/myserviced &` pattern (backgrounding an interactive tool and using `fg`) is awkward — running `aa-genprof` in a dedicated terminal is generally cleaner — but the technique is technically valid and the post explains the foreground recovery step.
- `aa-logprof -f /var/log/syslog` is syntactically correct; on modern Ubuntu systems with systemd-journald, AppArmor kernel messages may not always appear in `/var/log/syslog`. `aa-logprof` will fall back to its default log source when needed.
- The closing "Reloaded AppArmor profiles in enforce mode" line is stylized. In practice, `aa-genprof` may prompt the user to choose between complain and enforce when finishing — the shown output assumes the user chose enforce.
