# Validation Summary: How to Provision LXD Containers with Terraform on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LXD (Canonical's system container and VM manager)
- Terraform (HashiCorp's IaC tool)
- `terraform-lxd/lxd` Terraform provider (v2.x)
- Ubuntu (20.04 / 22.04)
- ZFS storage pools
- LXD bridge networking (`lxdbr0`)
- Cloud-init (via LXD `user.user-data`)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- terraform-lxd/lxd provider docs (current master): https://github.com/terraform-lxd/terraform-provider-lxd/blob/master/docs/resources/instance.md
- terraform-lxd/lxd provider docs (current master): https://github.com/terraform-lxd/terraform-provider-lxd/blob/master/docs/index.md
- terraform-lxd/lxd provider docs (v2.0.0 tag): https://github.com/terraform-lxd/terraform-provider-lxd/blob/v2.0.0/docs/index.md and `/docs/resources/instance.md`
- terraform-lxd/lxd CHANGELOG.md: https://github.com/terraform-lxd/terraform-provider-lxd/blob/master/CHANGELOG.md
- terraform-lxd/lxd releases page: https://github.com/terraform-lxd/terraform-provider-lxd/releases
- Terraform Registry for terraform-lxd/lxd: https://registry.terraform.io/providers/terraform-lxd/lxd/latest/docs
- LXD documentation for instance/profile/network configuration keys (Canonical docs)

## Issues Found

1. **Invalid `wait_for_network = true` attribute on `lxd_instance`.**
   - Older versions of the provider (≤ v2.x early releases) used a `wait_for_network` boolean. In the current `~> 2.0` line (v2.7.x is the latest as of May 2026), this argument has been replaced with a `wait_for` block that accepts a `type` (`agent`, `delay`, `ipv4`, `ipv6`, `ready`) and optional `nic`.
   - **Fix:** Replaced `wait_for_network = true` with:
     ```hcl
     wait_for {
       type = "ipv4"
       nic  = "eth0"
     }
     ```

2. **Unquoted dotted keys in `device.properties` maps.**
   - In HCL2, map keys that contain characters that aren't part of an identifier (e.g., dots) must be quoted. The post correctly quotes `"limits.cpu"`, `"limits.memory"`, `"ipv4.address"` etc. in `config` maps elsewhere, but `ipv4.address` was used unquoted inside several `properties = { ... }` blocks. While some HCL parsers may accept the unquoted form, the documented/canonical syntax is quoted, and this also keeps the style consistent throughout the post.
   - **Fix:** Quoted three occurrences as `"ipv4.address"` in the `web_server`, `app` (for_each), and `on_custom_net` device blocks.

3. **Outdated remote provider block fields.**
   - The commented-out remote provider example used `scheme`, `port`, and `password`, which were the v2.0.0 schema. The provider refactored the remote block in v2.3.0 (Sep 2024); the `address` field now takes a full URL like `https://host:8443`, and the trust-password mechanism was replaced with `trust_token` / `bearer_token`. Since the version constraint `~> 2.0` resolves to the latest v2.x (currently 2.7.1), users following the post would have hit unknown-attribute errors.
   - **Fix:** Updated the commented example to use:
     ```hcl
     remote {
       name        = "my-server"
       address     = "https://lxd-host.internal:8443"
       trust_token = var.lxd_trust_token
     }
     ```

## Review Notes

- The post pins the provider with `version = "~> 2.0"`, which will install any v2.x release. All examples were validated against the current v2.7.x docs after the fixes above.
- `lxd_instance` (introduced in provider v2.0) is correctly used in place of the dropped `lxd_container` / `lxd_virtual_machine` resources.
- LXD config keys used in profiles and instances (`limits.cpu`, `limits.memory`, `security.nesting`, `security.privileged`, `boot.autostart`, `boot.autostart.delay`, `environment.LANG`, `user.access_interface`, `user.user-data`) are all valid LXD keys.
- ZFS storage pool config (`zfs.pool_name`, `size`) and network keys (`ipv4.address`, `ipv4.nat`, `ipv4.dhcp`, `ipv6.address`) are valid.
- Proxy device syntax (`listen = "tcp:0.0.0.0:8080"`, `connect = "tcp:127.0.0.1:80"`) is correct.
- CLI commands (`lxd init --minimal`, `lxc remote list`, `lxc config trust list`, `lxc list`, `lxc info`, `lxc console --show-log`, `lxc snapshot`, `lxc restore`, `lxc move`, `journalctl -u snap.lxd.daemon`) are all valid.
- Minor future caveat: the post references Ubuntu 20.04 / 22.04 in prerequisites. Ubuntu 24.04 LTS (and as of April 2026, Ubuntu 26.04 LTS) are now common; the instructions still work, but the post will look more dated over time. Left as-is since it isn't technically incorrect.
- Wider caveat: the LXD/Incus ecosystem split (Canonical's LXD vs. the community Incus fork) is not mentioned. Readers using Incus would need the `lxc/terraform-provider-incus` provider instead. Not technically wrong for an LXD-focused post, but worth flagging for future revisions.
