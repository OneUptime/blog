# Validation Summary: How to Run Home Assistant in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Home Assistant Container / Home Assistant Core
- Podman
- Podman Quadlet and systemd
- Linux device passthrough
- YAML automations

## Sources Consulted
- Home Assistant Linux installation documentation: https://www.home-assistant.io/installation/linux/
- Home Assistant Container common tasks: https://www.home-assistant.io/common-tasks/container/
- Home Assistant automation YAML documentation: https://www.home-assistant.io/docs/automation/yaml/
- Home Assistant automation trigger documentation: https://www.home-assistant.io/docs/automation/trigger/
- Home Assistant light integration documentation: https://www.home-assistant.io/integrations/light/
- Home Assistant developer note on Kelvin color temperature migration: https://developers.home-assistant.io/blog/2024/12/14/kelvin-preferred-color-temperature-unit/
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman restart policy documentation: https://docs.podman.io/en/v4.6.1/markdown/options/restart.html
- Podman Quadlet/systemd documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman generate systemd documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html

## Issues Found
- The automation example used older singular YAML keys (`trigger`, `condition`, `action`) and `platform` under the trigger. Updated it to the current documented `triggers`, `conditions`, and `actions` structure with `trigger: sun`.
- The automation action used `service: light.turn_on`. Updated it to `action: light.turn_on`, matching current Home Assistant action terminology and YAML examples.
- The light action used deprecated mired-based `color_temp: 370`. Updated it to `color_temp_kelvin: 2700`, matching Home Assistant's Kelvin color temperature migration.
- The systemd section used `podman generate systemd`, which Podman marks as deprecated. Replaced it with a Quadlet `.container` unit using the documented `/etc/containers/systemd/` location and `Restart=always` in the `[Service]` section.
- The prerequisite said Podman 4.0 or later without noting Quadlet's cgroup requirement. Updated it to mention cgroup v2 for the Quadlet systemd service.

## Review Notes
The Podman `--restart unless-stopped`, host networking, volume mounts, D-Bus mount, USB `--device` mapping, Home Assistant image URL, and update flow align with official Home Assistant and Podman documentation. The `--privileged` flag is valid but broad; future revisions could explain a least-privilege device-specific alternative.
