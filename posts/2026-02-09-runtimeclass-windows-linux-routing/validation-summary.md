# Validation Summary: How to Use RuntimeClass to Route Pods to Windows vs Linux Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RuntimeClass
- Kubernetes Windows nodes and Windows containers
- Kubernetes Pod and Deployment manifests
- kubelet configuration
- gVisor
- Kata Containers
- Pod Security Standards

## Sources Consulted
- Kubernetes RuntimeClass concept documentation: https://kubernetes.io/docs/concepts/containers/runtime-class/
- Kubernetes RuntimeClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/node/runtime-class-v1/
- Kubernetes guide for running Windows containers: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes Windows containers overview: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes kubelet configuration API reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes PodSecurityPolicy to Pod Security Standards mapping: https://kubernetes.io/docs/reference/access-authn-authz/psp-to-pod-security-standards/

## Issues Found
- Corrected the tag from `Window` to `Windows`.
- Clarified that RuntimeClass scheduling merges configured node selectors and tolerations into pods that reference the class; RuntimeClass does not inherently guarantee Windows compatibility unless the runtime handler and scheduling fields are configured correctly.
- Replaced Windows Server 2019 RuntimeClass examples with Windows Server 2025 examples, using the current Kubernetes Windows build label value `10.0.26100`.
- Replaced custom `windows.build` selectors with the Kubernetes-provided `node.kubernetes.io/windows-build` label and removed manual node-labeling commands for Windows build routing.
- Added `spec.os.name: windows` to Windows pod specs and pod templates, matching current Kubernetes guidance for Windows workloads.
- Removed the Windows Hyper-V isolated container RuntimeClass example because Kubernetes documentation states Windows containers in Kubernetes are process-isolated and Hyper-V isolation is not supported.
- Replaced the unsupported Windows Hyper-V specialized runtime pod example with a Linux gVisor example.
- Removed the kubelet `defaultRuntimeClassName` example because that field is not present in the current kubelet configuration API. The post now explains that pods without `runtimeClassName` use the default runtime handler and that admission mutation is needed to default a RuntimeClass.
- Removed `allowPrivilegeEscalation: false` from a Windows pod securityContext example because that field is listed as incompatible when `spec.os.name` is `windows`.
- Completed the migration Deployment examples with required `spec.selector` and matching pod template labels so they are valid `apps/v1` Deployments.
- Updated the conclusion to remove the unsupported Hyper-V isolation reference.

## Review Notes
All YAML snippets in the post were parsed successfully after edits. Runtime handler names such as `runhcs-wcow-process`, `runc`, `runsc`, and `kata` still depend on matching CRI/container runtime configuration on the target nodes; the post correctly treats them as examples that must exist in the runtime configuration.
