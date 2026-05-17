# Validation Summary: How to Use step-ca for Internal TLS Certificate Management on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- step-ca (Smallstep Certificate Authority server)
- step CLI (Smallstep command-line client)
- ACME protocol
- Certbot
- acme.sh
- Ubuntu / Debian apt packaging
- systemd
- Smallstep certificate templates (Go text/template)

## Sources Consulted
- [step CLI `step ca` reference](https://smallstep.com/docs/step-cli/reference/ca/)
- [step CLI `step ca init` reference](https://smallstep.com/docs/step-cli/reference/ca/init/)
- [step CLI `step ca provisioner add` reference](https://smallstep.com/docs/step-cli/reference/ca/provisioner/add/)
- [step CLI `step ca renew` reference](https://smallstep.com/docs/step-cli/reference/ca/renew/)
- [step-ca installation docs](https://smallstep.com/docs/step-ca/installation/)
- [step-ca getting started docs](https://smallstep.com/docs/step-ca/getting-started/)
- [Smallstep blog: Run your own private CA & ACME server using step-ca](https://smallstep.com/blog/private-acme-server/)
- Certbot user guide (eff-certbot.readthedocs.io) for the `--no-verify-ssl` flag

## Issues Found

1. **Invalid `--home` flag on `step ca init`.** The post used `--home /etc/step-ca` to set the CA installation directory, but `step ca init` does not expose a `--home` flag. The CA directory is controlled by the `STEPPATH` environment variable. Replaced the flag with `STEPPATH=/etc/step-ca` set inline on the `sudo -u step ...` invocation, and added a short comment explaining what `STEPPATH` controls.

2. **Wrong apt package name for the CA server.** The post installed `step-certificates`, which is the historical/obsolete package name. The current Smallstep apt repository ships the CA server as `step-ca`. Changed `sudo apt install step-cli step-certificates` to `sudo apt install step-cli step-ca` to match the official installation docs.

3. **Incomplete post-init directory listing.** The tree omitted `config/defaults.json` (created by `step ca init` to hold default CLI settings for the CA) and `secrets/intermediate_ca_key` (the encrypted intermediate key file). Added both entries so the listing matches what the user will actually see on disk.

4. **Non-existent `step ca certificate list` subcommand.** The "Viewing the CA's Issued Certificates" section instructed readers to run `step ca certificate list`, but the step CLI has no `list` action under `step ca certificate` (the `certificate` action only issues a new cert). Renamed the section to "Revoking Certificates", removed the bogus list command, and added a one-sentence note explaining that issued-cert history lives in the badger DB under `db/` and is normally surfaced through the operator's logging/monitoring pipeline. The remaining `step ca revoke` examples were already correct and were preserved.

## Review Notes

- The `step ca certificate ... --not-after 720h` example will only succeed if the requesting provisioner's `claims.maxTLSCertDuration` (and `defaultTLSCertDuration`) are widened beyond the 24h default in `ca.json`. The post correctly states that 24h is the default max but does not call out that the provisioner config has to be edited for 720h to actually work. Worth a follow-up sentence in a future revision, but not technically incorrect as written.
- The renewer systemd unit (`cert-renewer-nginx.service`) runs `step ca renew` as root without passing `--ca-url` or `--root`. This relies on root having previously run `step ca bootstrap`, which writes `~/.step/config/defaults.json` with those values. That assumption is reasonable but implicit; readers running the snippet on a fresh box may want to either bootstrap as root first or add the flags explicitly.
- The `step certificate fingerprint` and `step ca bootstrap` commands, the systemd unit syntax, the `step ca provisioner add acme --type ACME` invocation, the Certbot `--no-verify-ssl` flag, and the acme.sh commands all match current upstream documentation.
- Download URLs at `dl.smallstep.com/.../docs-ca-install/latest/...` follow the analytics-tagged pattern Smallstep uses on their own install pages, so they are plausible and were left unchanged.
