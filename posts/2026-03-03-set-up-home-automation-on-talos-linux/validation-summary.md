# Validation Summary: How to Set Up Home Automation on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes Deployments, Services, PersistentVolumeClaims, hostPath volumes, and CronJobs
- Home Assistant Container
- Zigbee2MQTT
- Eclipse Mosquitto
- Node-RED
- USB serial device passthrough for Zigbee and Z-Wave adapters

## Sources Consulted
- Talos Linux machine configuration reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux CLI reference for `talosctl get`: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux kernel module configuration guide: https://docs.siderolabs.com/talos/v1.10/build-and-extend-talos/custom-images-and-development/kernel-module
- Kubernetes hostPath volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Home Assistant Container installation documentation: https://www.home-assistant.io/installation/generic-x86-64
- Zigbee2MQTT configuration documentation: https://www.zigbee2mqtt.io/guide/configuration/
- Zigbee2MQTT all settings reference: https://www.zigbee2mqtt.io/guide/configuration/all-settings.html
- Eclipse Mosquitto Docker Official Image documentation: https://hub.docker.com/_/eclipse-mosquitto/
- Node-RED Docker documentation: https://nodered.org/docs/getting-started/docker

## Issues Found
- The Talos udev rule created a stable `/dev/zigbee` symlink, but the Home Assistant and Zigbee2MQTT manifests still mounted `/dev/ttyUSB0`. Updated the Kubernetes `hostPath`, container `mountPath`, and Zigbee2MQTT serial port to use `/dev/zigbee` consistently so the manifests benefit from the stable device name.
- The Zigbee2MQTT frontend environment variable used `ZIGBEE2MQTT_CONFIG_FRONTEND`, which does not match the documented nested `frontend.enabled` setting. Changed it to `ZIGBEE2MQTT_CONFIG_FRONTEND_ENABLED`.
- The backup CronJob copied into `/backup/ha-$(date +%Y%m%d)/` without creating that directory first, which would fail when the dated backup directory did not exist. Updated the command to create the directory before copying.
- The backup CronJob command used `\$(...)` inside a YAML double-quoted scalar, which is invalid YAML because `\$` is not a recognized YAML escape sequence. Changed the command to a single-quoted YAML scalar while keeping the shell escape required by the heredoc.
- The comment describing the `ch341` kernel module said it was common for Z-Wave sticks. Adjusted the comment to the more accurate CH340/CH341 USB serial adapter wording.

## Review Notes
- The manifests are valid Kubernetes YAML after the corrections. They still assume the cluster has a default StorageClass for PVC provisioning and a LoadBalancer implementation such as MetalLB or a cloud provider load balancer.
- `privileged: true` and `hostPath` device mounts are technically valid for USB passthrough, but they carry the security risks documented by Kubernetes and should be kept scoped to trusted home-lab workloads.
