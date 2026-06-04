# Validation Summary: How to Use Extended Resources for Custom Hardware Allocation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes extended resources
- Kubernetes device plugins
- Kubernetes Pod resource requests and limits
- kubectl JSON patch commands
- Go gRPC device plugin implementation
- Prometheus Operator PrometheusRule alerts
- kube-state-metrics

## Sources Consulted
- Kubernetes documentation: Advertise Extended Resources for a Node - https://kubernetes.io/docs/tasks/administer-cluster/extended-resource-node/
- Kubernetes documentation: Device Plugins - https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/
- Kubernetes documentation: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation: kubectl patch reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes documentation: Node Status - https://kubernetes.io/docs/reference/node/node-status
- Go package documentation for k8s.io/kubelet deviceplugin/v1beta1 - https://pkg.go.dev/k8s.io/kubelet/pkg/apis/deviceplugin/v1beta1
- Kubernetes documentation: kube-state-metrics overview - https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- Prometheus Operator API reference for PrometheusRule - https://doc.crds.dev/github.com/prometheus-operator/prometheus-operator/monitoring.coreos.com/PrometheusRule/v1

## Issues Found
- The node capacity patch examples modified `/status/capacity` but did not target the `status` subresource. Updated the `kubectl patch node` commands to include `--subresource=status`, matching current kubectl support for patching subresources and Kubernetes' documented requirement to patch node status.
- The Go device plugin sample did not implement the current `DevicePluginServer` contract. Added `pluginapi.UnimplementedDevicePluginServer` and a `GetDevicePluginOptions` method returning empty options, matching the current generated API and Kubernetes device plugin workflow.
- The Go sample used deprecated `grpc.WithInsecure()`. Replaced it with `grpc.WithTransportCredentials(insecure.NewCredentials())` and added the required import.
- The cleanup pitfall implied that device plugins receive a pod termination cleanup callback. Corrected it to explain that the device plugin API has no deallocation callback and that device preparation or reset should be idempotent before device reuse.

## Review Notes
The Prometheus alert assumes kube-state-metrics is installed and exporting standard Kubernetes object state metrics. The device plugin remains intentionally simplified for a blog post; production plugins should also handle kubelet restarts, stream update events through `ListAndWatch`, and implement robust health checking.
