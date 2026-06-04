# Validation Summary: How to Implement Firmware Update Workflows for IoT Devices Using Kubernetes Jobs

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Jobs and Indexed Jobs
- Kubernetes CronJobs
- Kubernetes ConfigMaps, Secrets, and PersistentVolumeClaims
- kubectl
- Python 3.11
- Eclipse Paho MQTT Python client
- Docker

## Sources Consulted
- Kubernetes Job API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/
- Kubernetes Indexed Job task documentation: https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Eclipse Paho MQTT Python client documentation: https://eclipse.dev/paho/files/paho.mqtt.python/html/client.html
- Eclipse Paho MQTT Python changelog: https://eclipse.dev/paho/files/paho.mqtt.python/html/changelog.html

## Issues Found
- The main firmware update Job read `batch.kubernetes.io/job-completion-index` but did not set `completionMode: Indexed`. Kubernetes only provides stable completion indexes for Indexed Jobs, so the snippet would not reliably assign one device per pod. Added `completionMode: Indexed`.
- The rollback Job had the same missing `completionMode: Indexed` issue. Added `completionMode: Indexed`.
- The rollback Job used `envFrom` with Secret keys named `mqtt-username` and `mqtt-password`, but the Python code reads `MQTT_USERNAME` and `MQTT_PASSWORD`. Replaced `envFrom` with explicit `secretKeyRef` environment variables.
- The Python device filter only matched `target_version`, so the rollback example using `TARGET_VERSION=1.2.3` would not select devices from the provided inventory. Updated the filter to match either `target_version` or `current_version`.
- The firmware chunk count used `len(firmware_data) // chunk_size + 1`, which over-counted chunks when the firmware size was an exact multiple of the chunk size. Replaced it with ceiling division.
- The Paho MQTT client published and subscribed without continuously running the network loop during upload and verification. Added `loop_start()` after connecting, replaced the manual verification `loop()` call with sleep while the background loop runs, and stopped the loop before disconnecting.
- Added cleanup on Python exception paths so a connected MQTT client stops its background loop and disconnects before the process exits.

## Review Notes
The examples remain illustrative and assume a real firmware updater image, a compatible MQTT firmware protocol on the devices, an available `ReadWriteMany` storage class named `nfs-client`, and RBAC permissions for the `status-aggregator` service account. `kubectl` was not installed in the local environment, so kubectl command validation was performed against official Kubernetes command reference documentation rather than local `--help` output.
