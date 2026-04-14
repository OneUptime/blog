# Validation Summary: How to Use Dapr with Red Hat OpenShift Container Platform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Red Hat OpenShift Container Platform (OCP 4.x)
- OpenShift Operator Lifecycle Manager (OLM) / OperatorHub
- Helm
- OpenShift Security Context Constraints (SCCs)
- OpenShift Monitoring (Prometheus Operator / ServiceMonitor)
- OpenShift Routes

## Sources Consulted
- Dapr official Helm chart installation docs — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Red Hat OpenShift SCC documentation — https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/authentication_and_authorization/managing-pod-security-policies
- Red Hat OpenShift user workload monitoring — https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/monitoring/configuring-user-workload-monitoring
- Red Hat OpenShift OLM / OperatorGroup docs — https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/operators/understanding-operators
- OpenShift Route API reference — https://docs.openshift.com/container-platform/latest/rest_api/network_apis/route-route-openshift-io-v1.html

## Issues Found

1. **Missing namespace and OperatorGroup for OLM Subscription**: The OperatorHub installation section created a Subscription targeting `namespace: dapr-system`, but the namespace was never created and no OperatorGroup was defined. OLM requires both an existing namespace and an OperatorGroup before a Subscription can be processed. Added `oc new-project dapr-system` and an OperatorGroup resource with an empty spec (AllNamespaces install mode) before the Subscription.

2. **ServiceMonitor in wrong namespace**: The ServiceMonitor was placed in `openshift-monitoring`, which is managed by the cluster monitoring operator and reserved for platform components. User workload ServiceMonitors must be placed in the workload's own namespace. Changed from `openshift-monitoring` to `dapr-system`.

3. **Incorrect config key for user workload monitoring**: The `oc patch` command used `enableUserWorkload: true` as the config key in the `cluster-monitoring-config` ConfigMap. The correct key is `enableUserWorkloadMonitoring: true` (with the "Monitoring" suffix). Fixed the patch command.

## Review Notes
- The Dapr Helm chart repo URL, chart name, and HA flag are all correct and current.
- The SCC YAML is well-constructed with appropriate restrictions for sidecar workloads. The `MustRunAsRange` with `uidRangeMin`/`uidRangeMax` fields are correct for OpenShift SCCs.
- The OpenShift Route configuration is correct — `route.openshift.io/v1` is the right API version, and `destinationCACertificate` is the proper field for `reencrypt` TLS termination.
- The `oc adm policy add-scc-to-group` commands use correct syntax with the `system:serviceaccounts:<namespace>` group pattern.
- The verification commands (jsonpath query, `dapr components -k`) are syntactically correct.
- The CatalogSource image (`quay.io/operatorhubio/catalog:latest`) is the community operators catalog; availability of a Dapr operator in this catalog may vary over time.
