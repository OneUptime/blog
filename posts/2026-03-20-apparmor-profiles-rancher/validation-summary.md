# Validation Summary: How to Configure AppArmor Profiles in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher-managed Kubernetes clusters
- AppArmor
- Kubernetes Pod `securityContext`
- Pod Security Standards / Pod Security Admission
- `kubectl`
- Linux node administration over SSH

## Sources Consulted
- Kubernetes: Restrict a Container's Access to Resources with AppArmor - https://kubernetes.io/docs/tutorials/security/apparmor/
- Kubernetes: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes: Releases - https://kubernetes.io/releases/
- RKE2: Quick Start - https://docs.rke2.io/install/quickstart
- RKE2: Default Pod Security Standards - https://docs.rke2.io/security/pod_security_standards

## Issues Found
- The original post did not actually configure AppArmor. It used placeholder-style examples for a generic ConfigMap, Helm-based “security tooling,” and Prometheus alerts that were unrelated to AppArmor, so those sections were replaced with the node profile loading and workload configuration flow described in the official Kubernetes AppArmor documentation.
- The prerequisite `Kubernetes 1.26+` was incompatible with the modern AppArmor manifest style. The post was updated to target supported Kubernetes releases using the stable `securityContext.appArmorProfile` API, and the unsupported `Rancher v2.7+` version floor and unnecessary Helm prerequisite were removed.
- The Step 1 audit commands were incorrect for the topic. One query referenced a non-existent `runAsRoot` field and none of the commands verified AppArmor availability on the nodes. They were replaced with node-level checks for the AppArmor kernel module, `apparmor_parser`, and loaded profiles.
- The workload manifest was not a valid or relevant AppArmor example. It configured generic hardening settings, omitted actual AppArmor settings, and the `Deployment` lacked the required `selector` and template labels. It was replaced with a Kubernetes Pod that uses a `Localhost` AppArmor profile plus restricted-compatible security context settings.
- The validation flow did not prove AppArmor enforcement. It was rewritten to use the upstream verification pattern: checking `/proc/1/attr/current`, confirming the profile on the scheduled node, and triggering a denied write to `/tmp/test`.

## Review Notes
- Rancher does not create or distribute AppArmor profiles by itself; the profile must be loaded on each Linux node where the workload can schedule.
- As of May 7, 2026, Kubernetes 1.31 and 1.32 are end-of-life per the upstream releases page, so the post now targets Kubernetes 1.33+.
