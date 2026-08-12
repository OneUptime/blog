# Validation Summary: Fix Woodpecker Kubernetes Jobs Stuck Pending

## Status

validated

## Post Type

Troubleshooting Guide

## Technologies Covered

- Woodpecker CI 3.17 Kubernetes backend
- Kubernetes Pods, Events, and `kubectl`
- PersistentVolumes, PersistentVolumeClaims, StorageClasses, and CSI drivers
- Kubernetes scheduling, resource requests and limits, node selectors, affinity, taints, and tolerations
- Kubernetes ServiceAccounts and RBAC
- Woodpecker official Helm chart 3.7.0
- YAML and shell commands

## Sources Consulted

- Woodpecker 3.17.0 release notes: https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.17.0
- Woodpecker 3.17 Kubernetes backend documentation: https://woodpecker-ci.org/docs/administration/configuration/backends/kubernetes
- Woodpecker 3.17 versioned backend documentation source: https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/docs/versioned_docs/version-3.17/30-administration/10-configuration/11-backends/20-kubernetes.md
- Woodpecker 3.17 Kubernetes backend flags: https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/backend/kubernetes/flags.go
- Woodpecker 3.17 PVC construction: https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/backend/kubernetes/volume.go
- Woodpecker 3.17 Pod construction and placement handling: https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/backend/kubernetes/pod.go
- Woodpecker 3.17 Kubernetes backend options: https://github.com/woodpecker-ci/woodpecker/blob/v3.17.0/pipeline/backend/kubernetes/backend_options.go
- Woodpecker Helm chart 3.7.0 agent values and RBAC templates: https://github.com/woodpecker-ci/helm/blob/3.7.0/charts/woodpecker/charts/agent/values.yaml and https://github.com/woodpecker-ci/helm/blob/3.7.0/charts/woodpecker/charts/agent/templates/role.yaml
- Woodpecker Helm chart 3.7.0 RoleBinding and StatefulSet templates: https://github.com/woodpecker-ci/helm/blob/3.7.0/charts/woodpecker/charts/agent/templates/rolebinding.yaml and https://github.com/woodpecker-ci/helm/blob/3.7.0/charts/woodpecker/charts/agent/templates/statefulset.yaml
- Kubernetes Pod lifecycle: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes debugging running Pods: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes StorageClasses and PersistentVolume access modes: https://kubernetes.io/docs/concepts/storage/storage-classes/ and https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes
- Kubernetes resource management, init-container resource calculation, and Pod overhead: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/, https://kubernetes.io/docs/concepts/workloads/pods/init-containers/#resource-sharing-within-containers, and https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/
- Kubernetes ResourceQuota: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes ServiceAccounts: https://kubernetes.io/docs/concepts/security/service-accounts/#assign-a-serviceaccount-to-a-pod
- Kubernetes node assignment and taints: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/ and https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Official `kubectl` references for Events, get, logs, and authorization checks: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/, and https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Docker Official Images for Go and Alpine: https://hub.docker.com/_/golang and https://hub.docker.com/_/alpine

## Issues Found

- The post conflated the workflow execution namespace with the namespace containing the agent StatefulSet and ServiceAccount. This breaks log lookup and impersonation checks when the Helm release namespace differs from `WOODPECKER_BACKEND_K8S_NAMESPACE`, and per-organization mode uses a generated `<prefix>-<organization-id>` execution namespace. Added separate `WP_NAMESPACE`, `AGENT_NAMESPACE`, and `AGENT_STATEFULSET` variables and used the agent namespace in the impersonated ServiceAccount identity.
- The agent StatefulSet name was treated as invariant and the log command could inspect only one of the chart's two default agent replicas. Made the StatefulSet name configurable and added `--all-pods=true`.
- The Event command sorted the legacy `.lastTimestamp` field, which is not populated consistently by current Event producers, and the prose treated `ErrImagePull` as an Event reason rather than normally a container waiting reason or Event message. Replaced it with current `kubectl events` output and directed readers to both Events and container status.
- The StorageClass command was described as showing capabilities even though StorageClass objects do not advertise RWO/RWX support. Changed the description to the fields actually displayed and added a requirement to consult the CSI driver or provider documentation for access-mode support.
- The no-default-StorageClass failure omitted the possibility of binding a compatible pre-provisioned classless PV. Added that qualification.
- Storage quota exhaustion was described as leaving a PVC pending. ResourceQuota rejects claim creation, whereas backend capacity or provisioning failures can leave a created claim pending. Separated these outcomes.
- Scheduling was described as considering only the sum of container requests. Corrected this to effective Pod requests, including init-container calculation, Pod-level resources, and RuntimeClass overhead, and expanded the inspection command accordingly. Also clarified that quota failures occur at admission rather than as `FailedScheduling` events.
- The Woodpecker 3.17 placement discussion omitted the new default-disabled per-step `nodeSelector` gate and the default-disabled affinity gate. Added the exact `ALLOW_FROM_STEP` settings and noted that per-step tolerations remain allowed by default.
- The ServiceAccount section implied that the ServiceAccount object itself is mounted and that the Helm RBAC is unconditional. Clarified that Kubernetes mounts credentials by default, that the stated permissions are for the default chart-created ServiceAccount/RBAC, and that token automount behavior can be changed by Kubernetes configuration.
- The authorization checks omitted the requirement for the caller to be allowed to impersonate ServiceAccounts, and the repair guidance named only namespaced Role objects. Added the impersonation caveat and the ClusterRole/ClusterRoleBinding path used by per-organization mode.
- `kubectl get pods,pvc --watch` is invalid because `kubectl get --watch` accepts a single resource type. Replaced it with separate Pod and PVC watches in two terminals.

## Review Notes

- Woodpecker 3.17.0 was released on 2026-07-31. Helm chart 3.7.0 is the aligned official chart and declares application version 3.17.0.
- The `env:` fragment is valid for the standalone agent subchart. When configuring the umbrella `woodpecker` chart, the same map belongs under `agent.env:`.
- All three YAML examples parse successfully. The Woodpecker field names, defaults, `CI_WORKSPACE` usage, metadata label, resource quantities, and referenced `golang:1.26` and `alpine:3.22` image tags were verified.
- All external links in the post returned successful responses on the validation date.
