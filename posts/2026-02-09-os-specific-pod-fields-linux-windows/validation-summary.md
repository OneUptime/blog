# Validation Summary: How to Configure OS-Specific Pod Fields for Linux and Windows Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods and Deployments
- Kubernetes Linux and Windows containers
- Pod OS field (`spec.os.name`)
- Pod and container security contexts
- Windows security context options
- Linux sysctls
- gMSA for Windows containers
- AppArmor and SELinux
- RuntimeClass and node scheduling
- Kubernetes volumes on Linux and Windows

## Sources Consulted
- Kubernetes Pods documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-overview/
- Kubernetes Windows containers user guide: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes API reference for Pod v1: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes sysctls documentation: https://kubernetes.io/docs/tasks/administer-cluster/sysctl-cluster/
- Kubernetes Windows security documentation: https://kubernetes.io/docs/concepts/security/windows-security/
- Kubernetes RunAsUserName documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-runasusername/
- Kubernetes HostProcess documentation: https://kubernetes.io/docs/tasks/configure-pod-container/create-hostprocess-pod/
- Kubernetes gMSA documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-gmsa/
- Kubernetes AppArmor documentation: https://kubernetes.io/docs/tutorials/security/apparmor/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Windows storage documentation: https://kubernetes.io/docs/concepts/storage/windows-storage/

## Issues Found
- The post incorrectly stated that the Kubernetes scheduler uses `spec.os.name` to place pods on nodes with the correct operating system. Current Kubernetes documentation states that `spec.os.name` does not affect scheduler placement, so the post now explains that node selectors, node affinity, taints, or RuntimeClass scheduling are still required.
- The safe sysctl example incorrectly included `net.core.somaxconn` and `net.ipv4.tcp_tw_reuse` as safe sysctls allowed by default. The example now uses documented safe sysctls and moves `net.core.somaxconn` to the unsafe sysctl example.
- The unsafe sysctl explanation described unsafe sysctls too broadly as `kernel.*`. The text now clarifies that only unsafe namespaced sysctls can be enabled through kubelet configuration.
- The AppArmor example used the deprecated beta annotation. The example now uses the current `securityContext.appArmorProfile` API.
- The metadata tag `Window` was corrected to `Windows`.
- The best-practice note that setting `spec.os.name` improves scheduling reliability was corrected to say that it improves validation, OS-aware policy checks, and manifest intent.

## Review Notes
- The Windows examples still require matching Windows node versions and working Windows container images in a real cluster.
- gMSA usage also requires the GMSA CRD, webhook configuration, Active Directory setup, and appropriate cluster permissions; the post presents only the pod-facing manifest pieces.
