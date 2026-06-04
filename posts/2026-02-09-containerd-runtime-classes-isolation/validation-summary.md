# Validation Summary: How to Configure containerd Runtime Classes for Mixed Workload Isolation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RuntimeClass
- containerd CRI runtime handlers
- runc
- gVisor / runsc
- Kubernetes admission webhooks
- Kyverno policies
- crictl
- Prometheus metrics
- Go
- YAML and TOML configuration

## Sources Consulted
- Kubernetes RuntimeClass concept documentation: https://kubernetes.io/docs/concepts/containers/runtime-class/
- Kubernetes RuntimeClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/node/runtime-class-v1/
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- containerd CRI Plugin Config Guide: https://containerd.io/docs/1.7/cri/config/
- containerd CRI config reference on GitHub: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- containerd Ops documentation for Prometheus metrics: https://containerd.io/docs/main/ops/
- cri-tools crictl documentation: https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/

## Issues Found
- The containerd `runc.options` examples used unsupported keys such as `CpuQuota`, `NoNewPrivileges`, `SelinuxLabel`, `DefaultCapabilities`, `MaskedPaths`, `ReadonlyPaths`, `CpuPeriod`, `MemoryLimit`, `CpusetCpus`, and `MemorySwap`. Replaced those with supported runtime handler configuration and clarified that pod security contexts, admission policy, CPU Manager, ResourceQuota, and similar Kubernetes controls should enforce security and resource constraints.
- The untrusted workload example tried to create stronger isolation using another runc handler with unsupported options. Changed it to a gVisor `runsc-isolated` runtime handler and updated all RuntimeClass, webhook, policy, testing, and troubleshooting references.
- The Go admission webhook snippet was missing the `metav1` import, included an unused `net/http` import, and was labeled as a `package main` file without a `main` function. Updated it to a compilable `package webhook` helper, added nil request handling, and copied the AdmissionReview request UID into responses.
- The monitoring command `sudo crictl stats --runtime-class=runc-production` used a non-existent `crictl stats` flag. Replaced it with `sudo crictl stats`.
- The Prometheus snippet implied containerd metrics are directly labeled by runtime class. Updated it to scrape containerd metrics from `/v1/metrics` and noted that runtime-class analysis should be combined with Kubernetes pod labels/metadata.
- The Kyverno policy used deprecated `spec.validationFailureAction`. Moved enforcement to `validate.failureAction: Enforce` for each rule.
- The troubleshooting section used `ctr` with containerd config as a runtime-handler test. Replaced it with a Kubernetes `kubectl run` test using `runtimeClassName`, which exercises the CRI RuntimeClass path described in the post.

## Review Notes
The corrected post remains a valid guide, but RuntimeClass is primarily a runtime handler selection and scheduling mechanism. Hardening for ordinary runc workloads should still be enforced with Kubernetes security context, Pod Security Admission, policy engines, and node-level runtime configuration rather than unsupported containerd runc option fields.
