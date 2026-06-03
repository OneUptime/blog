# Validation Summary: How to Restrict Container Capabilities Using securityContext in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes securityContext
- Kubernetes Pod Security Admission and Pod Security Standards
- Kubernetes ValidatingAdmissionPolicy
- Linux capabilities
- kubectl
- Falco runtime rules
- Docker and containerd capability defaults

## Sources Consulted
- Kubernetes: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes: Pod Security Policies - https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes: Deprecated API Migration Guide - https://kubernetes.io/docs/reference/using-api/deprecation-guide
- Kubernetes: Validating Admission Policy - https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes API Reference: Pod v1 - https://kubernetes.io/docs/reference/kubernetes-api/core-resources/pod-v1/
- Linux manual page: capabilities(7) - https://man7.org/linux/man-pages/man7/capabilities.7.html
- Docker Engine security: Linux kernel capabilities - https://docs.docker.com/engine/security/
- Docker: Running containers capability options - https://docs.docker.com/engine/containers/run/
- containerd CRI configuration - https://containerd.io/docs/1.7/cri/config/
- Falco: Supported Fields for Conditions and Outputs - https://falco.org/docs/reference/rules/supported-fields/
- Falco: Default Rules - https://falco.org/docs/reference/rules/default-rules/

## Issues Found
- The prerequisite version guidance said Kubernetes 1.20+ was recent, but the post uses ValidatingAdmissionPolicy, which is stable in Kubernetes 1.30+. I updated the prerequisite to require a supported cluster and call out the ValidatingAdmissionPolicy version requirement.
- The first drop-all example used `nginx:1.25` and tested with `capsh`, but the nginx image does not normally include `capsh`. I changed the example to a long-running BusyBox container and used `/proc/1/status` to inspect capability sets.
- The non-root port 80 example used the stock nginx image with a non-root UID, which can fail for reasons unrelated to `NET_BIND_SERVICE`. I replaced it with a Python HTTP server example and added the `net.ipv4.ip_unprivileged_port_start` caveat.
- The dangerous capabilities example described `DAC_OVERRIDE` as bypassing all file permission checks. I narrowed the wording to match Linux capabilities documentation: file read, write, and execute permission checks.
- The DaemonSet example added `SYS_TIME` with the comment "Read system time", but `CAP_SYS_TIME` permits setting system and hardware clocks and is not needed by node-exporter. I removed the added capability while keeping the drop-all setting.
- The policy section used PodSecurityPolicy, which was deprecated in Kubernetes 1.21 and removed in Kubernetes 1.25. I replaced it with Pod Security Admission namespace labels and a ValidatingAdmissionPolicy example.
- The ValidatingAdmissionPolicy example had no binding, so it would not be enforced. I added a ValidatingAdmissionPolicyBinding.
- The ValidatingAdmissionPolicy example only checked regular containers. I updated it to check regular, init, and ephemeral containers.
- The capability audit command used `docker exec`, which assumes Docker instead of working consistently in Kubernetes clusters using containerd or another CRI runtime. I changed it to `kubectl exec`.
- The test commands used `capsh` in images that do not normally include it and did not reliably set the command for `kubectl run`. I replaced them with `/proc/1/status` inspection and a Python bit check for `NET_BIND_SERVICE`.
- The Falco rule used unsupported fields `container.capability.sys_admin`, `container.capability.sys_module`, and `container.capabilities`. I replaced them with supported `thread.cap_effective` conditions and output.

## Review Notes
All YAML snippets in the Markdown parse successfully after the edits, and `git diff --check` passes for the reviewed file. `kubectl` is not installed in this workspace, so the Kubernetes examples were verified against official documentation and local YAML parsing rather than applied to a live cluster.
