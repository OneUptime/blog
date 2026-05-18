# Validation Summary: How to Use cloud-init Modules for Package Installation on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- cloud-init (cc_apt_configure, cc_package_update_upgrade_install, cc_snap modules)
- APT / dpkg package management
- Ubuntu cloud-config (`#cloud-config` YAML)
- debconf preseeding
- snapd / snap packages
- Third-party APT repositories: Docker, HashiCorp, Kubernetes (pkgs.k8s.io), NodeSource

## Sources Consulted
- cloud-init reference modules documentation: https://docs.cloud-init.io/en/latest/reference/modules.html
- cloud-init APT YAML examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/apt.html
- cloud-init Snap YAML examples: https://docs.cloud-init.io/en/latest/reference/yaml_examples/snap.html
- cloud-init JSON schema (`schema-cloud-config-v1.json`) on canonical/cloud-init main branch
- cloud-init issue #4076 (feature request: support key-by-URL in apt configure module — still open, not implemented)
- Docker official signing key fingerprint (`9DC858229FC7DD38854AE2D88D81803C0EBFCD88`)
- HashiCorp official packaging guide / signing key fingerprint (`798AEC654E5C15428C8E42EEAA16FCBCA621E701`)
- Kubernetes community apt instructions (per-version key at `pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key`)

## Issues Found

1. **Invalid `keyurl` option on `apt.sources.*` entries (multiple places).**
   The post used `keyurl: "..."` to point at a GPG key hosted at a URL. cloud-init's APT module does **not** support a `keyurl` key — the documented options are `source`, `key`, `keyid`, `keyserver`, `filename`, and `append` (see canonical/cloud-init schema and issue #4076 which is still open as of cloud-init 26.x). Using `keyurl` would silently fail the key import and `apt-get update` would then fail with `NO_PUBKEY`. Fixed by:
   - "Adding a Repository with a Key URL" section → renamed to "Adding a Repository with a Key ID" and switched the Docker example to `keyid: 9DC858229FC7DD38854AE2D88D81803C0EBFCD88` (key is published on `keyserver.ubuntu.com`). Added a sentence explicitly noting `keyurl` is not supported and pointing users at `runcmd` for keys hosted only at HTTP URLs.
   - "Multiple Repositories" section → Docker switched to `keyid: 9DC858229FC7DD38854AE2D88D81803C0EBFCD88`, HashiCorp switched to `keyid: 798AEC654E5C15428C8E42EEAA16FCBCA621E701`. The Kubernetes entry (whose per-version key is not on any public keyserver) was moved out of the apt sources block into a `runcmd` block that downloads the key, dearmors it into `/etc/apt/keyrings/`, writes the source list with `signed-by=`, then runs `apt-get update && apt-get install -y kubectl`. `kubectl` was removed from the `packages:` list accordingly.
   - "Package Not Found" remediation example → switched the Docker source from `keyurl` to `keyid: 9DC858229FC7DD38854AE2D88D81803C0EBFCD88`.

2. **Misleading "snaps" key reference in the Snap Package Installation section.**
   The post claimed there was an alternative `snaps` key for the snap module and shipped a code block containing only comments. cloud-init's `cc_snap` module only accepts `commands` and `assertions` — there is no top-level `snaps` key. Replaced the misleading block with a correct one-sentence note that the module also accepts `assertions` (e.g. for brand-store snaps), and that snap installs are always expressed under `commands`.

## Review Notes
- The "Adding a PPA" section uses NodeSource as the example, which is technically a third-party APT repository, not a Launchpad PPA. The code itself works (it uses `keyid`, which is valid), so this was left as-is to keep edits minimal — but a future revision could either use a true `source: "ppa:..."` shortcut or rename the section.
- The `terraform` snap shown in the Snap Package Installation section still exists in the snap store but is no longer actively maintained by HashiCorp; users wanting current Terraform versions should prefer the HashiCorp APT repo example earlier in the post. Not a correctness issue, just a freshness caveat.
- `apt-key list` is correctly flagged in the post as deprecated. On modern Ubuntu (22.04+) keys should live in `/etc/apt/keyrings/` or `/etc/apt/trusted.gpg.d/` and be referenced with `signed-by=` in the source line — which is exactly what the Kubernetes runcmd example now demonstrates.
- The claim that `package_reboot_if_required` checks `/var/run/reboot-required` is correct per the cloud-init source and current docs. Note that there are known cloud-init 24.x bugs where this option causes the final stage to report failure on Ubuntu 24.04 (canonical/cloud-init issues #5849 and #6151) — worth being aware of but not something to "fix" in the post.
- `apt.primary` / `apt.security` mirror configuration, `apt.preserve_sources_list`, `apt.conf`, `apt.http_proxy` / `apt.https_proxy`, and `apt.debconf_selections` are all valid per the current cloud-init schema and were left unchanged.
