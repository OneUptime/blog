# Validation Summary: How to Schedule Pods Based on Extended Resources Like GPUs and FPGAs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes extended resources
- Kubernetes device plugins
- NVIDIA GPU device plugin
- AMD GPU device plugin
- Intel FPGA device plugin
- Kubernetes ResourceQuota
- Kubernetes Pod and Deployment manifests
- Go device plugin implementation

## Sources Consulted
- Kubernetes Device Plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/
- Kubernetes Resource Management for Pods and Containers documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Advertise Extended Resources for a Node task: https://kubernetes.io/docs/tasks/administer-cluster/extended-resource-node/
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- NVIDIA k8s-device-plugin documentation and static deployment manifest: https://github.com/NVIDIA/k8s-device-plugin
- Intel FPGA device plugin documentation: https://intel.github.io/intel-device-plugins-for-kubernetes/cmd/fpga_plugin/README.html
- AMD GPU device plugin manifest URL: https://raw.githubusercontent.com/RadeonOpenCompute/k8s-device-plugin/master/k8s-ds-amdgpu-dp.yaml

## Issues Found
- The NVIDIA device plugin install command used the older v0.14.0 root manifest path. Updated it to the current static deployment path for v0.17.1 and updated the time-slicing DaemonSet image to match.
- The NVIDIA time-slicing DaemonSet excerpt omitted required pod template labels and the kubelet device plugin socket hostPath mount. Added the missing labels, security context, toleration, priority class, and `/var/lib/kubelet/device-plugins` mount so the DaemonSet is structurally valid and can register with kubelet.
- The Intel FPGA install example cloned the repository and applied a local Kustomize path without pinning a release. Replaced it with Intel's documented remote `kubectl apply -k` command using release tag `v0.35.0`.
- The FPGA resource name example used `fpga.intel.com/arria10.dcp1.2`, which does not match the documented advertised resource format. Replaced it with the documented `fpga.intel.com/region-...` resource naming pattern shown in Intel's verification output.
- The custom Go device plugin example imported unused packages, called an undefined `Start()` method, and did not register with kubelet. Replaced it with a minimal skeleton that starts a gRPC server, registers the `DevicePlugin` service, and registers the resource with kubelet's registration service.
- The ResourceQuota example included `limits.nvidia.com/gpu`. Kubernetes documents that only `requests.` quota keys are allowed for extended resources, so the invalid `limits.*` extended resource quota entry was removed.

## Review Notes
- The YAML examples were parsed successfully after the edits.
- The Go snippet could not be compile-tested in this workspace because the `go` toolchain is not installed. It was reviewed against the official Kubernetes device plugin API documentation.
- The AMD GPU manifest URL and NVIDIA v0.17.1 static manifest URL returned HTTP 200 during review.
