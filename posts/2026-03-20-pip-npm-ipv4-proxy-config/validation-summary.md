# Validation Summary: How to Configure pip and npm to Use an IPv4 Proxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Python `pip`
- Node.js `npm`
- HTTP/HTTPS proxy configuration
- TLS/CA certificate configuration for intercepted HTTPS traffic

## Sources Consulted
- pip documentation, "Configuration": https://pip.pypa.io/en/stable/topics/configuration/
- pip documentation, "User Guide" (`Using a Proxy Server`): https://pip.pypa.io/en/stable/user_guide/
- pip documentation, "`pip` command reference": https://pip.pypa.io/en/stable/cli/pip/
- pip documentation, "HTTPS Certificates": https://pip.pypa.io/en/stable/topics/https-certificates/
- npm documentation, "Config": https://docs.npmjs.com/cli/v11/using-npm/config/
- npm documentation, ".npmrc": https://docs.npmjs.com/cli/v11/configuring-npm/npmrc/
- Local CLI help: `python3 -m pip install --help`
- Local CLI help: `npm config --help`

## Issues Found
- The pip config-file path note treated macOS like Linux. I corrected it to reflect pip's documented macOS user config locations: `~/Library/Application Support/pip/pip.conf` or `~/.config/pip/pip.conf`.
- The `trusted-host` example was formatted as a space-separated single line, which does not match pip's documented repeatable config format. I changed it to the multiline form pip documents for repeatable options.
- The comment above `trusted-host` described it as disabling SSL verification for corporate MITM proxies. I changed that wording because pip documents `trusted-host` as trusting specific hosts with invalid or missing HTTPS, while the preferred fix for corporate interception is providing the corporate CA certificate.
- The verification example `pip install --dry-run requests` would not reliably exercise proxy resolution if the package was already installed. I updated it to `pip install --dry-run --ignore-installed requests`, which matches pip's documented guidance for resolving without installing.
- The private PyPI mirror example said it would bypass the proxy while still passing `--proxy`. I removed the contradictory `--proxy` flag and clarified that bypass behavior depends on `no_proxy`.
- The npm private registry comment implied proxy bypass without showing the required `noproxy` configuration. I clarified that the registry should be added to `noproxy` if it is meant to bypass the proxy.

## Review Notes
- pip 24.2+ on Python 3.10+ uses system certificates in addition to `certifi` by default. On older pip/Python combinations, users may still need to provide a CA bundle explicitly when working behind SSL-intercepting proxies.
- The npm `proxy`, `https-proxy`, `noproxy`, `cafile`, and `strict-ssl` settings used in the post are current in npm v11 documentation.
