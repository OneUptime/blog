# Validation Summary: How to Set Up Flux CD on RKE2 (Rancher Kubernetes Engine 2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2 / Rancher Kubernetes Engine 2
- Kubernetes
- Flux CD
- GitOps
- Pod Security Admission / Pod Security Standards
- CIS hardening
- FIPS 140-2 considerations
- Helm and kube-prometheus-stack
- NGINX container deployment
- Rancher

## Sources Consulted
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Agent Configuration Reference: https://docs.rke2.io/reference/linux_agent_config
- RKE2 CIS Hardening Guide: https://docs.rke2.io/security/hardening_guide
- RKE2 FIPS 140-2 Enablement: https://docs.rke2.io/security/fips_support
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux bootstrap github CLI reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/
- Flux security documentation: https://fluxcd.io/flux/security/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- nginxinc/nginx-unprivileged image documentation: https://hub.docker.com/r/nginxinc/nginx-unprivileged
- kube-prometheus-stack chart values: https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack

## Issues Found
- The RKE2 server was started before the custom configuration file and Pod Security Admission file were created. Moved service startup until after the configuration snippets so RKE2 starts with the intended CIS and PSA settings.
- The CIS profile example omitted required host preparation. Added the documented sysctl setup and etcd user creation for server nodes, and sysctl setup for agent nodes.
- The CIS profile comment said "CIS 1.23" even though `profile: "cis"` maps to the current benchmark for the running RKE2/Kubernetes version. Updated the comment to avoid version-specific inaccuracy.
- The PSA exemption list used `cis-operator-system` and exempted `flux-system`. Updated the sample to current RKE2 CIS exemptions and removed the Flux exemption because Flux controllers are documented as compatible with the restricted Pod Security Standard.
- The Flux namespace labels set `pod-security.kubernetes.io/*` to `privileged`. Changed them to `restricted` to match Flux's documented restricted-PSS compatibility and the guide's security goal.
- The verification command referred to SCC issues, which are OpenShift-specific rather than RKE2-specific. Changed the wording to PSA warnings.
- The sample application used the standard `nginx:1.27-alpine` image while declaring a non-root security context and container port 8080. Changed it to `nginxinc/nginx-unprivileged:1.27-alpine` and aligned the UID/GID with that image.
- The Flux notification `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but the current v1 notification API only covers `Receiver`; `Provider` and `Alert` remain under `v1beta3`. Updated both resources to `v1beta3`.
- The troubleshooting namespace for CIS/compliance checks was updated from `cis-operator-system` to `compliance-operator-system` to match current Rancher compliance operator documentation.

## Review Notes
The kube-prometheus-stack example is syntactically valid, but production RKE2 CIS clusters may need additional Pod Security Admission planning for monitoring components such as node-exporter, depending on which chart components are enabled. The post now avoids the concrete API and command errors found during validation.
