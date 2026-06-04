# Validation Summary: How to Configure KubeEdge Device Twins for IoT Sensor Data Synchronization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- KubeEdge Device CRDs
- KubeEdge Device Twins and DeviceStatus
- KubeEdge Mapper Framework
- MQTT-based device integration
- Kubernetes Python client
- InfluxDB Python client
- Prometheus Operator PrometheusRule

## Sources Consulted
- KubeEdge Device CRDs documentation: https://kubeedge.io/docs/concept/device/device_crds/
- KubeEdge Mapper documentation: https://kubeedge.io/docs/concept/device/mapper/
- KubeEdge Mapper Framework documentation: https://kubeedge.io/docs/developer/mapper-framework
- KubeEdge Device Controller documentation: https://kubeedge.io/docs/architecture/cloud/device_controller
- KubeEdge v1beta1 API reference: https://pkg.go.dev/github.com/kubeedge/api/apis/devices/v1beta1
- KubeEdge upstream Device CRD: https://raw.githubusercontent.com/kubeedge/kubeedge/master/build/crds/devices/devices_v1beta1_device.yaml
- KubeEdge upstream DeviceModel CRD: https://raw.githubusercontent.com/kubeedge/kubeedge/master/build/crds/devices/devices_v1beta1_devicemodel.yaml
- KubeEdge upstream DeviceStatus CRD: https://raw.githubusercontent.com/kubeedge/kubeedge/master/build/crds/devices/devices_v1beta1_devicestatus.yaml
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes Python client repository: https://github.com/kubernetes-client/python
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The DeviceModel example used the older nested property type schema. Updated it to the current `devices.kubeedge.io/v1beta1` flat fields: `type`, `accessMode`, `unit`, `minimum`, and `maximum`.
- The Device CRD installation missed the current `DeviceStatus` CRD. Added `devices_v1beta1_devicestatus.yaml`.
- The Device example used `spec.protocol.mqtt` and `spec.propertyVisitors`, which do not match current v1beta1. Reworked the example to use `spec.protocol.protocolName`, `spec.protocol.configData`, and `spec.properties[].visitors`.
- The post referenced a concrete `kubeedge/mqtt-mapper:latest` image that is not part of the documented current mapper workflow. Replaced it with a placeholder image built from a Mapper Framework-generated mapper.
- Twin reads and application examples queried `.status.twins` on `Device`. Updated them to read and watch `DeviceStatus` resources and `.status.twins` there.
- The time-series sync example used the Python client's cluster-scoped custom object list method for a namespaced CRD. Updated it to `list_namespaced_custom_object`.
- Desired-value updates used invalid `propertyVisitors[].desiredValue` fields. Updated commands to patch `spec.properties[].desired.value` with JSON Patch.
- Python examples looked for `desired` inside status twins. Updated them to use `observedDesired`, which is the current status field for mapper-observed desired values.
- The offline test showed `kubectl get device` on the edge node as if local Kubernetes API status were available there. Reworded the test to focus on local mapper/edge application behavior and watching `DeviceStatus` after connectivity returns.
- The Prometheus rules used custom metric names without stating they must be exported. Clarified that the rules apply only if a mapper or monitor exports those custom metrics.

## Review Notes
The tutorial now matches the current KubeEdge v1beta1 CRD shape, but the MQTT mapper remains an implementation-specific example because KubeEdge documents mapper generation through the Mapper Framework rather than a universal built-in MQTT mapper image.
