# Validation Summary: How to Install Ubuntu Core for IoT and Embedded Devices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Core 24
- Snap packages / snapd
- Raspberry Pi (Pi 2, 3, 4, 5, Zero 2 W, CM3/3+/4/5)
- x86_64 / amd64 hardware (NUC, industrial PCs)
- ubuntu-image (image builder)
- snapcraft (snap packaging tool)
- Model assertions
- Ubuntu One / SSO authentication
- Landscape (fleet management)
- Telegraf (monitoring)
- MQTT (Mosquitto), InfluxDB, Grafana, Docker (example snap apps)

## Sources Consulted
- Ubuntu Core documentation: https://documentation.ubuntu.com/core/
- Snap docs — Managing updates: https://snapcraft.io/docs/how-to-guides/manage-snaps/manage-updates/
- Snap docs — Interface management: https://snapcraft.io/docs/interface-management/
- Ubuntu Core — Use Ubuntu One SSH: https://documentation.ubuntu.com/core/how-to-guides/manage-ubuntu-core/use-ubuntu-one-ssh/
- Ubuntu Core 24 cdimage: https://cdimage.ubuntu.com/ubuntu-core/24/stable/current/
- Model assertion reference: https://documentation.ubuntu.com/core/reference/assertions/model/
- snapcore/models reference repo: https://github.com/snapcore/models
- Sign a model assertion: https://ubuntu.com/core/docs/sign-model-assertion
- snap refresh --hold announcement: https://snapcraft.io/blog/hold-your-horses-i-mean-snaps-new-feature-lets-you-stop-snap-updates-for-as-long-as-you-need
- Ubuntu Core 24 + Landscape: https://canonical.com/blog/ubuntu-core-24-device-management
- Canonical Raspberry Pi support matrix: https://canonical-ubuntu-hardware-support.readthedocs-hosted.com/boards/how-to/ubuntu_supported/raspberry-pi/

## Issues Found

1. **Incorrect `refresh.schedule` syntax.** The post used `sudo snap set system refresh.schedule="00:00-04:00/mon-fri"`. The `/N` suffix in snap schedule syntax denotes refresh frequency, not days; days come first followed by times. Fixed to use the modern `refresh.timer` key with the correct ordering: `sudo snap set system refresh.timer="mon-fri,00:00-04:00"`.

2. **Deprecated `snap interfaces` command.** The post used `snap interfaces mosquitto` to list interfaces for a specific snap. `snap interfaces` has been deprecated for years in favor of `snap connections`. Changed to `snap connections mosquitto` and clarified the system-wide listing comment.

3. **Wrong Ubuntu One SSH keys URL.** The post said to add SSH keys at `ubuntu.com/login`. The canonical Ubuntu One SSH keys page is `login.ubuntu.com/ssh-keys`. Updated accordingly.

4. **Inaccurate Raspberry Pi architecture claim.** The post stated Pi 2/3/4/5 are supported with both `armhf` and `arm64`. Ubuntu Core 24 only ships an `arm64` image for Raspberry Pi — there is no Core 24 armhf raspi image. Updated the line to reflect arm64-only support and clarified the actual supported Pi models per Canonical's hardware matrix (Pi 2 v1.2+, 3, 4, 5, Zero 2 W, CM3/3+/4/5).

5. **Misnamed remote-management product.** The post called it "IoT Device Management portal (formerly known as Landscape for IoT)". Canonical's product is simply "Landscape", not "Landscape for IoT" — and there has never been a separately branded "IoT Device Management portal" predecessor. Rewrote the section to accurately describe Landscape and note that Core support was added in the Core 24 cycle.

## Review Notes

- The image download URLs (`ubuntu-core-24-arm64+raspi.img.xz` and `ubuntu-core-24-amd64.img.xz` under `cdimage.ubuntu.com/ubuntu-core/24/stable/current/`) are correct as of validation.
- Model assertion fields (`series: 16`, `grade: signed`, `default-channel: latest/stable` for snapd) match the official snapcore/models reference templates for Core 24.
- The `snap refresh --hold=48h <snap>` syntax is correct; the `--hold` flag was introduced in snapd 2.58 (Nov 2022).
- The `snap sign -k <key>` command syntax for signing model assertions is correct, but the post does not call out that a key must first be created via `snap create-key` and registered against the user's Ubuntu One store account — readers attempting this for the first time may stumble.
- The legacy `refresh.schedule` setting still functions on supported Core versions, but `refresh.timer` is the recommended modern option used in the fix.
- `snap interfaces` still exists as a deprecated alias and prints a deprecation warning; readers on older snapd versions will not see breakage if they continue to use it.
