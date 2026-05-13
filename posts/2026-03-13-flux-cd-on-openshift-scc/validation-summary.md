# Validation Summary: How to Set Up Flux CD on OpenShift with Security Context Constraints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- OpenShift Container Platform
- Kubernetes
- Security Context Constraints (SCC)
- Kubernetes RBAC
- OpenShift CLI (`oc`)
- Flux CLI
- Kustomize

## Sources Consulted
- Flux official OpenShift installation documentation: https://fluxcd.io/flux/installation/configuration/openshift/
- Flux official OpenShift SCC manifest: https://raw.githubusercontent.com/fluxcd/flux2/main/manifests/openshift/scc.yaml
- Flux official `flux bootstrap github` command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Red Hat OpenShift Container Platform documentation, Managing security context constraints: https://docs.redhat.com/en/documentation/openshift_container_platform/4.13/html/authentication_and_authorization/managing-pod-security-policies
- Red Hat OpenShift Container Platform documentation, OpenShift CLI `oc adm policy scc-review` and `scc-subject-review`: https://docs.redhat.com/en/documentation/openshift_container_platform/4.15/html/cli_tools/openshift-cli-oc

## Issues Found
- The post said Flux usually works with `restricted` or `restricted-v2`. Flux's official OpenShift guidance grants the built-in `nonroot` SCC, because Flux manifests use `runAsUser: 65534` and OpenShift `restricted-v2` uses namespace-allocated UID ranges. Updated the recommendation to `nonroot` and explained the `restricted-v2` caveat.
- The custom SCC example used misleading and risky settings, including a custom SELinux type and UID/group ranges that do not match the official Flux OpenShift path. Replaced it with the official RBAC pattern that grants Flux service accounts `use` on the `nonroot` SCC.
- The SCC binding example omitted the `source-watcher` service account used by the official Flux OpenShift SCC manifest. Added it.
- The post did not include the OpenShift kustomize patches required by Flux's official OpenShift installation documentation. Added the documented patches that adjust the generated Flux deployment security context and namespace pod-security warning labels.
- The bootstrap section incorrectly implied OpenShift uses a different API server for `flux bootstrap github`. Removed that inaccurate comment; the Flux CLI command itself is valid.
- The application Kustomization example had a `dependsOn` entry for `myapp-rbac` without defining that Kustomization. Removed the dangling dependency from the snippet.
- The best practices mentioned `oc adm policy simulate-scc`, which is not a documented OpenShift CLI command. Replaced it with the supported `oc adm policy scc-review` and `oc adm policy scc-subject-review` commands.

## Review Notes
- The article is technically relevant and contains commands, YAML manifests, and implementation guidance, so it was reviewed as a code/tutorial post.
- The application workload `anyuid` RoleBinding example is valid as an RBAC-based SCC grant, but it should remain limited to workloads that truly require arbitrary UIDs.
