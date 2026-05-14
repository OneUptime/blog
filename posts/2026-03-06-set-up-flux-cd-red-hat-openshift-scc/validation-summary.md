# Validation Summary: How to Set Up Flux CD on Red Hat OpenShift with Security Context Constraints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Red Hat OpenShift
- Security Context Constraints (SCCs)
- Kubernetes RBAC and manifests
- Flux Kustomization, HelmRepository, HelmRelease, Provider, and Alert resources
- Bitnami PostgreSQL Helm chart
- OpenShift Routes

## Sources Consulted
- Red Hat OpenShift 4.12 SecurityContextConstraints API reference: https://docs.redhat.com/en/documentation/openshift_container_platform/4.12/html/security_apis/securitycontextconstraints-security-openshift-io-v1
- Red Hat OpenShift 4.12 managing Security Context Constraints: https://docs.redhat.com/en/documentation/openshift_container_platform/4.12/html/authentication_and_authorization/managing-pod-security-policies
- Red Hat OpenShift 4.12 seccomp profiles documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.12/html/security_and_compliance/seccomp-profiles
- Flux OpenShift installation documentation: https://fluxcd.io/flux/installation/configuration/openshift/
- Flux bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux notification Provider and Alert documentation: https://fluxcd.io/flux/components/notification/providers/ and https://fluxcd.io/flux/components/notification/alerts/
- Bitnami PostgreSQL Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/README.md

## Issues Found
- The custom Flux SCC omitted `allowHostDirVolumePlugin`, which OpenShift documents as a required SCC field. Added it with `false`.
- The custom Flux SCC did not allow the `runtime/default` seccomp profile, which can reject pods that specify Kubernetes `RuntimeDefault`. Added `seccompProfiles: [runtime/default]`.
- The custom SCCs did not set a priority, so OpenShift might admit pods with another SCC when multiple SCCs were available. Added `priority: 10` and clarified the verification note.
- The application SCC example had the same missing host and seccomp fields, and it did not show how to bind the SCC to an application service account. Added the missing fields and a binding command.
- The Bitnami PostgreSQL values hard-coded OpenShift UID/GID values, which are namespace-specific and not portable. Replaced them with Bitnami's OpenShift compatibility setting, which adapts security contexts for `restricted-v2`.
- The Flux notification `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but current Flux docs define these resources under `notification.toolkit.fluxcd.io/v1beta3`. Updated both API versions.
- The OpenShift GitOps coexistence example described namespace selectors, but the shown Flux `Kustomization` did not implement selector-based scoping. Updated the comments to describe path and ownership separation instead.
- The conclusion incorrectly said workloads deployed through Flux inherit SCCs. Updated it to state that workloads use the SCCs granted to their own service accounts.

## Review Notes
The post remains a custom-SCC approach. Flux's official OpenShift documentation also documents an approach that grants the built-in `nonroot` SCC and applies OpenShift-specific bootstrap patches. Future revisions could mention that as the upstream-supported baseline.
