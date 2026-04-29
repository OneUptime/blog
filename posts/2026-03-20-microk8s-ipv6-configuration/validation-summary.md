# Validation Summary: How to Configure MicroK8s for IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MicroK8s
- Kubernetes dual-stack networking
- IPv6
- Calico CNI
- Snap launch configurations

## Sources Consulted
- MicroK8s dual-stack guide: https://canonical.com/microk8s/docs/how-to-dual-stack
- MicroK8s dual-stack explanation: https://canonical.com/microk8s/docs/explain-dual-stack
- MicroK8s CNI configuration: https://canonical.com/microk8s/docs/configure-cni
- MicroK8s launch configuration guide: https://canonical.com/microk8s/docs/add-launch-config
- MicroK8s launch configuration reference: https://canonical.com/microk8s/docs/ref-launch-config
- MicroK8s addons reference: https://canonical.com/microk8s/docs/addons
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/

## Issues Found
1. **Incorrect version claim**: The post said dual-stack support starts with MicroK8s 1.27. Current MicroK8s documentation describes the supported install-time dual-stack workflow for 1.28 and newer. Updated the introduction and prerequisites to target 1.28+.
2. **Wrong setup point in the lifecycle**: The original guide treated dual-stack as a post-install change. Current MicroK8s documentation says the single-stack vs dual-stack choice should be made during node installation using a launch configuration. Replaced the post-install mutation steps with the documented launch-configuration workflow.
3. **Incorrect Calico addon command**: The post used `microk8s enable calico`, but Calico is the default CNI in MicroK8s rather than a normal addon that should be enabled this way. Replaced that section with the documented CNI/launch-config setup.
4. **Unsupported Calico configuration path for default MicroK8s**: The post edited `installation default -n calico-system`, which is not the documented way to configure the default MicroK8s Calico deployment. Updated the guide to use the supported launch configuration mechanism instead.
5. **Unsafe and incomplete control-plane flag edits**: The post appended duplicate `kube-apiserver` and `kube-controller-manager` flags directly into files under `/var/snap/microk8s/current/args/`. This is not the documented current approach for dual-stack and also omitted the install-time workflow MicroK8s now supports. Removed those edits and replaced them with the supported install-time configuration.
6. **Incorrect verification method**: The post tried to verify dual-stack by checking the existing `kube-dns` service for both ClusterIPs. Existing services are not a reliable proof of dual-stack behavior. Replaced this with a dedicated test Service that explicitly requests dual-stack using `ipFamilyPolicy: RequireDualStack`.
7. **Broken test-pod instructions**: The post launched an `nginx` pod and then told readers to `exec` into it with `bash` and run `curl`. The standard `nginx` image does not provide that shell-and-tooling workflow. Replaced the test with a `busybox` pod that fetches the IPv6 service endpoint with `wget`.
8. **Incorrect namespace usage for Calico IPPool inspection**: The post queried `ippools` with `-n calico-system`, but Calico IPPools are cluster-scoped resources. Removed the namespace from the troubleshooting commands.

## Review Notes
- The revised guide intentionally targets the current documented workflow for MicroK8s 1.28 and newer.
- Pre-1.28 MicroK8s releases used older manual dual-stack procedures, but those are not the current recommended setup path.
- The verification section now checks both Service `clusterIPs` and Pod `podIPs`, which is a materially stronger validation of dual-stack behavior than inspecting `kube-dns`.
