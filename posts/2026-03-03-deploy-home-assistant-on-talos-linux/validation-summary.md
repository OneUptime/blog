# Validation Summary: How to Deploy Home Assistant on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config: `kernel.modules`, `udev.rules`)
- `talosctl` CLI (`patch mc`)
- Kubernetes (Deployment, Service, Ingress, PVC, CronJob)
- Home Assistant (`ghcr.io/home-assistant/home-assistant`)
- Zigbee2MQTT (`koenkk/zigbee2mqtt`)
- Zigbee Home Automation (ZHA) integration
- cert-manager / ingress-nginx
- USB device passthrough via hostPath `CharDevice`

## Sources Consulted
- Talos configuration patches: https://www.talos.dev/v1.6/talos-guides/configuration/patching/
- Talos CLI reference (Sidero Labs): https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos v1alpha1 config reference (`machine.kernel.modules`, `machine.udev.rules`): https://docs.siderolabs.com/talos/v1.12/reference/v1alpha1/config/
- Home Assistant Container install docs: https://www.home-assistant.io/installation/
- Kubernetes Volumes / hostPath types: https://kubernetes.io/docs/concepts/storage/volumes/
- Zigbee2MQTT Docker install guide: https://www.zigbee2mqtt.io/guide/installation/02_docker.html

## Issues Found
- **Incorrect `talosctl` subcommand for applying a partial patch.** The post originally used `talosctl apply-config --patch @talos-usb-patch.yaml --nodes <node-ip>`. `talosctl apply-config` is for applying a full machine configuration (via `-f`/`--file`); the `--patch`/`--config-patch` flag layers on top of a full config and is not the right tool for sending a standalone partial patch to a running node. The correct command for applying a partial patch to a live node is `talosctl patch mc --patch @talos-usb-patch.yaml --nodes <node-ip>`. Fixed.

## Review Notes
- `machine.kernel.modules` (list of `{name, parameters?}`) and `machine.udev.rules` (list of raw udev rule strings) are valid Talos `v1alpha1` machine config fields and used correctly.
- `ghcr.io/home-assistant/home-assistant:stable` is the official Home Assistant Container image; correct as written.
- The Kubernetes `hostPath.type: CharDevice` value is valid and appropriate for `/dev/ttyUSB0`.
- `koenkk/zigbee2mqtt:latest` (Docker Hub) still works and the project continues to publish there, but the project's current canonical image is `ghcr.io/koenkk/zigbee2mqtt`. The Docker Hub reference is not incorrect, so it was left as-is; consider switching to the GHCR image in a future revision.
- The CronJob backup script writes to a `ha-backup-storage` PVC that the post does not define. Readers will need to create that PVC themselves; this is not strictly a technical error, but worth flagging for future expansion.
- `hostNetwork: true` combined with `dnsPolicy: ClusterFirstWithHostNet` is correct and is the standard pattern for Home Assistant's discovery features (mDNS, SSDP).
