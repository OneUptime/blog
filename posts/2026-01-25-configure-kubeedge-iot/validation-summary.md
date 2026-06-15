# Validation Summary: How to Configure KubeEdge for IoT

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- KubeEdge CloudCore and EdgeCore
- Kubernetes workloads and manifests
- KubeEdge Device and DeviceModel CRDs
- KubeEdge EventBus and MQTT topics
- Helm and keadm
- Python with paho-mqtt

## Sources Consulted
- KubeEdge installing with keadm: https://kubeedge.io/docs/setup/install-with-keadm/
- KubeEdge CloudCore and EdgeCore configuration: https://kubeedge.io/docs/setup/config/
- KubeEdge container runtime prerequisites: https://kubeedge.io/docs/setup/prerequisites/runtime/
- KubeEdge Device CRDs documentation: https://kubeedge.io/docs/concept/device/device_crds/
- KubeEdge message topics documentation: https://kubeedge.io/docs/developer/message_topics/
- KubeEdge v1.15 DeviceModel CRD: https://raw.githubusercontent.com/kubeedge/kubeedge/v1.15.0/build/crds/devices/devices_v1beta1_devicemodel.yaml
- KubeEdge v1.15 Device CRD: https://raw.githubusercontent.com/kubeedge/kubeedge/v1.15.0/build/crds/devices/devices_v1beta1_device.yaml
- KubeEdge v1.15 EdgeCore config API source: https://raw.githubusercontent.com/kubeedge/kubeedge/v1.15.0/pkg/apis/componentconfig/edgecore/v1alpha2/types.go
- KubeEdge v1.15 CloudCore config API source: https://raw.githubusercontent.com/kubeedge/kubeedge/v1.15.0/pkg/apis/componentconfig/cloudcore/v1alpha1/types.go
- KubeEdge CloudCore Helm chart README: https://raw.githubusercontent.com/kubeedge/kubeedge/v1.15.0/manifests/charts/cloudcore/README.md
- Eclipse Paho MQTT Python client documentation: https://eclipse.dev/paho/files/paho.mqtt.python/html/client.html

## Issues Found
- The EdgeCore config mixed `edgecore.config.kubeedge.io/v1alpha2` with older direct kubelet fields. Moved `cgroupDriver` and `nodeStatusUpdateFrequency` under `tailoredKubeletConfig`, removed unsupported `imagePullProgressDeadline`, changed the sandbox image to `kubeedge/pause:3.6`, and changed `containerRuntime` to the valid `remote` value for containerd.
- The EventBus `mqttMode` comment had the values for `both` and `external` reversed. Updated it to `0: internal, 1: both, 2: external`.
- The `devices.kubeedge.io/v1beta1` DeviceModel example used the older nested property type shape. Updated properties to the v1beta1 flat fields (`type: INT`, `accessMode`, `minimum`, `maximum`, `unit`).
- The `devices.kubeedge.io/v1beta1` Device example used older structured `protocol`, `propertyVisitors`, and user-authored `status.twins` fields. Updated it to use `spec.protocol.protocolName/configData`, `spec.properties`, per-property `visitors`, and `spec.properties[].desired`.
- The Kubernetes deployment set `MQTT_BROKER` to `tcp://127.0.0.1:1883`, but the Python Paho `connect()` call expects a hostname and separate port. Changed it to `127.0.0.1`.
- The offline-autonomy snippet used unsupported `podStatusSyncInterval` and `imagePullPolicy` fields in EdgeCore config. Replaced them with valid `remoteQueryTimeout` and guidance to set `imagePullPolicy: IfNotPresent` in Pod specs.

## Review Notes
The post remains tied to KubeEdge v1.15.0 examples. Newer KubeEdge releases have continued to evolve device APIs and config defaults, so future updates should re-check the Device CRDs and generated CloudCore/EdgeCore config for the target release.
