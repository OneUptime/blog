# Validation Summary: How to Configure Chrony Time Sync on Talos Linux

## Status
not-technically-relevant

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux
- Chrony (NTP implementation)
- NTS (Network Time Security, RFC 8915)
- Talos system extensions
- Talos Image Factory
- `talosctl` CLI

## Sources Consulted
- siderolabs/extensions GitHub repository — listed every top-level extension category directory (`container-runtime`, `drivers`, `drm`, `dvb`, `firmware`, `guest-agents`, `misc`, `network`, `nvidia-gpu`, `power`, `storage`, `tools`): https://github.com/siderolabs/extensions
- Talos Image Factory official extensions catalog API: https://factory.talos.dev/version/v1.7.6/extensions/official
- Talos Linux time sync documentation: https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/system-configuration/time-sync
- Talos Image Factory UI: https://factory.talos.dev/?arch=amd64&platform=metal&target=metal&version=1.7.6

## Issues Found

The post is fundamentally inaccurate. Its central premise — that there is an official Chrony system extension for Talos Linux distributed by Sidero Labs — is false. The post cannot be repaired by editing individual lines; the entire installation, configuration, and operational narrative is built on a non-existent component.

Concrete factual problems verified against authoritative sources:

1. **No `chrony` system extension exists in the official Sidero Labs catalog.** The official extensions repo (github.com/siderolabs/extensions) contains no chrony directory in any category. The Talos Image Factory's official extension list (queried directly via `https://factory.talos.dev/version/v1.7.6/extensions/official`) contains 37 extensions covering firmware, drivers, guest agents, container runtimes, network tools (bird2, cloudflared, lldpd, nebula, tailscale, etc.), and storage — none for chrony or any other NTP implementation.

2. **The image reference `ghcr.io/siderolabs/chrony:latest` does not exist.** It is used throughout the post (machine config YAML examples in the "Installing Chrony as a System Extension", "Configuring Chrony", and "Disabling the Default Time Daemon" sections), but no such image is published.

3. **Talos Linux does not use Chrony at all.** Per official Sidero Labs documentation, "Talos Linux implements SNTP protocol to sync time with the NTP server." Time sync is handled by the built-in `timed` controller inside `machined`, not by a separate daemon, and there is no supported path to swap in Chrony.

4. **The `machine.files` approach for `/etc/chrony/chrony.conf` would not work even if Chrony were installed.** Talos has a largely read-only root filesystem and `machine.files` only supports a limited allowlist of paths. The correct mechanism for configuring a Talos extension service (when one exists) is the `ExtensionServiceConfig` document — not `machine.files`.

5. **The `talosctl logs ext-chrony` and `talosctl services | grep chrony` examples reference a service that does not exist on any Talos installation.**

6. **Minor secondary technical error:** The explanation of `makestep 1.0 3` in the "Key Configuration Directives" section says "allow steps up to 1 second during the first 3 updates". This is wrong even on its own terms — per `chrony.conf(5)`, the first parameter is a threshold *above which* stepping is allowed (i.e. step if the offset exceeds 1 second), not a maximum step size. But this is moot given the larger problem.

Because the entire post describes operating a piece of software (a Sidero-published Chrony extension) that does not exist, a reader following these instructions would fail at the very first step (`talosctl upgrade` with a non-existent extension image). The post cannot be salvaged through targeted edits — the title, premise, and every Talos-specific section would need to be rewritten or removed. Per the task instructions, this qualifies as content with "no salvageable value" in its current form, and is being marked `not-technically-relevant` rather than `validated`.

No edits were made to README.md because no minimal edit could make the post correct.

## Review Notes

- The generic Chrony directive descriptions (`server`, `pool`, `iburst`, `rtcsync`, `driftfile`, `ntsdumpdir`, `hwtimestamp`, `minsources`, `maxdistance`) are largely accurate as Chrony reference material in isolation. If a future post needed to cover Chrony in a different Linux context (a regular distro running chronyd), that material would be reusable.
- If the intent is to give Talos users guidance on time sync, the correct topic is the built-in `machine.time` configuration (servers, `bootTimeout`, `disabled`, PTP devices) rather than Chrony. That would make a legitimate, accurate post.
- If Sidero Labs publishes a Chrony extension in the future, the post would need to be rewritten against the actual published image name, the `ExtensionServiceConfig` configuration schema for that extension, and the real `ext-*` service name as it appears in `talosctl services` output.
