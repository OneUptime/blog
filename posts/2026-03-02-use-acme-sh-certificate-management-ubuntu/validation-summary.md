# Validation Summary: How to Use acme.sh for Certificate Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- acme.sh (ACME protocol shell client)
- Let's Encrypt, ZeroSSL, Buypass (ACME-compatible CAs)
- DNS-01 validation via Cloudflare (`dns_cf`) and AWS Route53 (`dns_aws`)
- HTTP-01 validation (webroot and standalone modes)
- nginx / Apache reload integration
- cron-based auto-renewal
- Custom acme.sh deploy hooks
- openssl, dig, sudoers/visudo

## Sources Consulted
- acme.sh main repository: https://github.com/acmesh-official/acme.sh
- acme.sh installation docs: https://github.com/acmesh-official/acme.sh/wiki/How-to-install
- acme.sh server/CA list: https://github.com/acmesh-official/acme.sh/wiki/Server
- acme.sh DNS API list (Cloudflare): https://github.com/acmesh-official/acme.sh/wiki/dnsapi
- acme.sh DNS manual mode: https://github.com/acmesh-official/acme.sh/wiki/dns-manual-mode
- ZeroSSL default CA change announcement: https://community.letsencrypt.org/t/the-acme-sh-will-change-default-ca-to-zerossl-on-august-1st-2021/144052
- Deploy hook examples: https://github.com/acmesh-official/acme.sh/blob/master/deploy/cpanel_uapi.sh and https://github.com/acmesh-official/acme.sh/blob/master/deploy/ssh.sh
- Cloudflare DNS API source: https://github.com/acmesh-official/acme.sh/blob/master/dnsapi/dns_cf.sh

## Issues Found

1. **Custom deploy hook example was fundamentally broken.** The post showed a plain bash script that read positional arguments at the top level and called `cp`/`systemctl` directly, then invoked it via `--deploy-hook custom_deploy`. acme.sh deploy hooks are not standalone scripts — acme.sh sources the hook file and calls a function named `<hookname>_deploy`. The argument order in the broken example was also wrong (`$2` was labeled CERT, `$3` KEY; the real order is `$2=key`, `$3=cert`, `$4=CA cert`, `$5=fullchain`). Rewrote the section to use the correct file layout (`~/.acme.sh/deploy/custom.sh`), wrap the logic in `custom_deploy()` with `_cdomain/_ckey/_ccert/_cca/_cfullchain` parameters in the right order, and invoke it with `--deploy-hook custom`.

2. **"acme.sh stores the API credentials encrypted" was incorrect.** acme.sh writes credentials to `~/.acme.sh/account.conf` (or the per-domain config) as plain-text shell variables via `_setopt`/`_saveaccountconf_mutable`. There is no encryption. Changed the wording to state credentials are stored in plain text in `account.conf` and reused on renewal.

3. **`--server buypass` is not a valid shortcut.** acme.sh's recognized CA name shortcuts are `zerossl`, `letsencrypt`, `letsencrypt_test`, `sslcom`, `google`, `googletest`, `actalis`. Buypass is not in `CA_NAMES`, so `--server buypass` does not work — you must pass the full directory URL. Updated the Buypass example to use `https://api.buypass.com/acme/directory`.

4. **Cron schedule was `5 0 * * *`; actual installer writes `0 0 * * *`.** The acme.sh installer code (`_installcronjob`) writes the cron line as `0 0 * * *`, not 00:05. Updated both the "what you should see" snippet and the logging variant to match the real format.

5. **Cloudflare `CF_Account_ID` was implied to be required.** Per `dnsapi/dns_cf.sh`, only `CF_Token` is required for the API-token flow; `CF_Account_ID` is optional and is only used to scope zone lookups when an account contains multiple zones. Added a clarifying comment so readers do not think both are mandatory.

## Review Notes

- The remaining CLI flags and subcommands (`--issue`, `--renew`, `--renew-all`, `--install-cert`, `--cert-file`, `--key-file`, `--fullchain-file`, `--reloadcmd`, `--webroot`, `--standalone`, `--httpport`, `--dns`, `--yes-I-know-dns-manual-mode-enough-go-ahead-please`, `--info`, `--list`, `--revoke`, `--remove`, `--pre-hook`, `--post-hook`, `--debug`, `--staging`, `--set-default-ca`) are all current and correct.
- The install one-liner `curl https://get.acme.sh | sh -s email=…` matches the documented form.
- Path `~/.acme.sh/example.com/fullchain.cer` is accurate (acme.sh uses `.cer` extensions and `fullchain.cer` for the fullchain file).
- The ZeroSSL-default-since-2021 claim is accurate (v3.0, August 1, 2021).
- The `sudoers` snippet uses `acme ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload nginx`, which is syntactically valid; the absolute path to `systemctl` may vary slightly between Ubuntu versions (`/usr/bin/systemctl` is correct on modern Ubuntu / systemd), so this is fine.
- Pre/post-hook semantics are accurate: `--post-hook` runs after `--cron` regardless of whether a cert was actually renewed; the post correctly notes that for service-reload-on-renewal use cases, `--reloadcmd` (set via `--install-cert`) is the right tool.
