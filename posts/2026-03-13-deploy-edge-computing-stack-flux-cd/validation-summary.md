# Validation Summary: How to Deploy Edge Computing Stack with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD HelmRelease and Kustomization resources
- Kubernetes Deployments, PersistentVolumeClaims, ConfigMaps, and Services
- Kustomize overlays and patches
- Eclipse Mosquitto MQTT broker
- InfluxDB 2 Helm chart
- Node-RED Docker image
- GitOps for edge Kubernetes clusters

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes patch documentation for custom resource patch caveats: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- bdclark Mosquitto Helm chart README and values: https://github.com/bdclark/helm-charts/tree/main/charts/mosquitto
- Eclipse Mosquitto configuration manual: https://mosquitto.org/man/mosquitto-conf-5.html
- InfluxData influxdb2 Helm chart README and values: https://github.com/influxdata/helm-charts/tree/master/charts/influxdb2
- InfluxDB configuration options: https://docs.influxdata.com/influxdb/v2/reference/config-options/
- Node-RED Docker documentation: https://nodered.org/docs/getting-started/docker

## Issues Found
- The Mosquitto HelmRelease used a hypothetical `edge-charts` repository, version `4.x`, and values such as `existingSecretRef` and raw `config` keys that did not match the documented public Mosquitto chart values. Updated the snippet to use the documented bdclark Mosquitto chart version range and its `config.allowAnonymous`, `auth.secretRef`, `persistence`, and TLS service values.
- The post included a standalone Mosquitto ConfigMap that was not referenced by the HelmRelease and would not configure the documented chart. Removed that unused snippet and repository-structure entry.
- The InfluxDB chart exposes service port `80` by default while the Node-RED environment variable used port `8086`. Added `service.port: 8086` and `service.targetPort: 8086` to the InfluxDB Helm values so the in-cluster URL is correct.
- The Node-RED Deployment referenced `node-red-pvc`, but the repository structure and examples did not define that PVC. Added a PVC manifest and listed `pvc.yaml` in the repository structure.
- The Node-RED Docker documentation shows `FLOWS` as a flow file name under `/data`, not an absolute path. Updated `FLOWS` from `/data/flows.json` to `flows.json`.

## Review Notes
- The Flux `HelmRelease` and `Kustomization` API versions used in the post are current.
- The Kustomize patch example is syntactically valid, but teams should be cautious when patching custom resources because strategic merge behavior for custom resources is limited without schema support.
- Node-RED flows mounted from a ConfigMap are version-controlled but read-only at runtime; teams that edit flows through the Node-RED UI should use a different synchronization workflow.
