# Validation Summary: How to use runtime/default seccomp profile for baseline security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes securityContext
- Kubernetes seccomp profiles
- Pod Security Standards and Pod Security Admission
- Kubelet seccomp defaulting
- Container runtime seccomp profiles
- Linux audit logs for seccomp events

## Sources Consulted
- Kubernetes: Seccomp and Kubernetes - https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes: Restrict a Container's Syscalls with seccomp - https://kubernetes.io/docs/tutorials/security/seccomp/
- Kubernetes: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes: Pod Security Admission - https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes: Kubelet Configuration API v1beta1 - https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes: kubelet command reference - https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Docker: Seccomp security profiles for Docker - https://docs.docker.com/engine/security/seccomp/

## Issues Found
- The post incorrectly stated that the Pod Security Standards Baseline profile requires seccomp. Kubernetes Baseline allows `RuntimeDefault` and `Localhost` but also allows the seccomp field to be undefined; it only forbids explicitly setting `Unconfined`. I updated the namespace enforcement text and examples to use `restricted` where seccomp is required.
- The cluster default section incorrectly used Pod Security Admission configuration as if it set runtime/default as the cluster default. Pod Security Admission validates policy and does not mutate pods. I replaced that example with kubelet `seccompDefault: true` configuration and noted the `--seccomp-default` flag.
- The conclusion implied Pod Security Standards can enable runtime/default cluster-wide. I changed the wording to say Pod Security Standards enforce explicit seccomp settings, which distinguishes admission validation from kubelet defaulting.
- The DaemonSet section referred to "privileged infrastructure components" even though Kubernetes privileged containers always run seccomp `Unconfined` and cannot use a seccomp profile. I changed the wording to "root-running infrastructure components" to match the example.
- The blocked-syscalls test example could imply all failures come only from seccomp, but some operations are also gated by Linux capabilities in normal Kubernetes pods. I adjusted the comments and output text to avoid over-attributing failures to seccomp.
- The blocked-syscalls test used `curl` in an Ubuntu base image, where `curl` may not be installed. I replaced it with `ls /tmp` as a normal operation that should be available.

## Review Notes
All YAML snippets parse successfully after the edits. A Kubernetes schema validator such as `kubeconform` was not installed in the workspace, so validation was limited to YAML parsing plus comparison against official Kubernetes and Docker documentation.
