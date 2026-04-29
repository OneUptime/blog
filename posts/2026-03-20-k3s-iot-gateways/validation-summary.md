# Validation Summary: How to Set Up K3s on IoT Gateways

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Raspberry Pi
- MQTT / Eclipse Mosquitto
- Node-RED
- InfluxDB
- Rancher System Upgrade Controller

## Sources Consulted
- K3s installation requirements: https://docs.k3s.io/installation/requirements
- K3s configuration options: https://docs.k3s.io/installation/configuration
- K3s automated upgrades: https://docs.k3s.io/upgrades/automated
- K3s upgrades overview: https://docs.k3s.io/upgrades
- Kubernetes namespaces: https://kubernetes.io/docs/tasks/administer-cluster/namespaces/
- Kubernetes StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes volumes and `hostPath` types: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes node-pressure eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction
- Kubernetes Services / NodePort: https://kubernetes.io/docs/concepts/services-networking/service/
- Node-RED Docker documentation: https://nodered.org/docs/getting-started/docker
- InfluxDB OSS v2 install documentation: https://docs.influxdata.com/influxdb/v2/install/
- Eclipse Mosquitto configuration reference: https://mosquitto.org/man/mosquitto-conf-5.html
- Rancher System Upgrade Controller reference: https://github.com/rancher/system-upgrade-controller

## Issues Found
- The Raspberry Pi preparation step was missing `linux-modules-extra-raspi`, which K3s documents as required for Ubuntu 21.10 through 23.10 on Raspberry Pi so Flannel VXLAN networking works. I added that package.
- The boot parameter edit added an extra `cgroup_enable=cpuset` flag that is not part of the K3s requirements guidance. I narrowed the command to the documented memory cgroup flags.
- The K3s config set only `eviction-hard=memory.available<100Mi`. Kubernetes documents that changing one hard-eviction threshold without setting the others causes the remaining defaults to drop to zero. I removed that override.
- All workload manifests used the `iot` namespace, but the post never created it. I added `kubectl create namespace iot` after the K3s install step.
- The Mosquitto deployment declared ports `8883` and `9001`, but the provided `mosquitto.conf` only configured a listener on `1883`. I removed the misleading extra container ports.
- The GPIO example claimed `hostNetwork: true` was needed for direct device communication. That is unrelated to GPIO, serial, and I2C host device access, so I removed it. I also added explicit `hostPath` types for the GPIO directory and character devices.
- The InfluxDB `StatefulSet` was missing the required headless Service and `serviceName` linkage used by StatefulSets. I added both so the manifest is valid.
- The System Upgrade Controller section described generic application OTA updates, but the official K3s upgrade flow uses it for K3s node upgrades. I replaced the example with the documented controller installation command and a valid K3s upgrade `Plan`.

## Review Notes
- The pinned image tags (`eclipse-mosquitto:2.0`, `nodered/node-red:3.1`, and `influxdb:2.7-alpine`) are valid examples, but they are version-specific and should be reviewed periodically as upstream images move forward.
- The GPIO example still uses the older sysfs GPIO interface (`/sys/class/gpio`). It can still work on systems that expose it, but newer Linux GPIO userspace guidance favors the character-device API.
