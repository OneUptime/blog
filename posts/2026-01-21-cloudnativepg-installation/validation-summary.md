# Validation Summary: How to Install CloudNativePG Operator on Kubernetes

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- CloudNativePG
- Kubernetes
- kubectl
- Helm
- Kustomize
- Operator Lifecycle Manager (OLM)
- Prometheus Operator PodMonitor
- PostgreSQL

## Sources Consulted
- CloudNativePG installation and upgrades documentation: https://cloudnative-pg.io/docs/1.29/installation_upgrade/
- CloudNativePG supported releases documentation: https://cloudnative-pg.io/docs/1.29/supported_releases/
- CloudNativePG Helm chart documentation: https://cloudnative-pg.io/charts/
- CloudNativePG Helm chart values: https://github.com/cloudnative-pg/charts/blob/main/charts/cloudnative-pg/values.yaml
- CloudNativePG Helm chart metadata: https://github.com/cloudnative-pg/charts/blob/main/charts/cloudnative-pg/Chart.yaml
- CloudNativePG v1.29.1 release manifest: https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/v1.29.1/releases/cnpg-1.29.1.yaml
- CloudNativePG monitoring documentation and PodMonitor sample: https://cloudnative-pg.io/docs/1.28/monitoring/ and https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.29/docs/src/samples/monitoring/podmonitor.yaml
- CloudNativePG kubectl plugin documentation: https://cloudnative-pg.io/docs/1.28/kubectl-plugin/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Red Hat OpenShift OLM Subscription reference: https://docs.redhat.com/en/documentation/openshift_container_platform/4.10/html/operators/understanding-operators

## Issues Found
- The prerequisite listed Kubernetes 1.25 or higher, but the updated CloudNativePG 1.29.x examples are officially supported on Kubernetes 1.33, 1.34, and 1.35. Updated the prerequisite to point readers to the supported Kubernetes version for the CloudNativePG release they install.
- The `kubectl version --short` command used a removed/deprecated flag in current kubectl releases. Replaced it with `kubectl version`.
- The manifest, Kustomize, upgrade, and uninstall examples used outdated CloudNativePG 1.22.0 URLs. Updated them to CloudNativePG 1.29.1.
- The Helm chart version pin used `0.20.0`, which does not match the current CloudNativePG 1.29.1 app version. Updated it to chart version `0.28.3`.
- The Helm namespace-watching examples set `WATCH_NAMESPACE` through `additionalEnv`. Updated them to use the chart's `config.data.WATCH_NAMESPACE` field.
- The verification and troubleshooting examples assumed the manifest deployment name `cnpg-controller-manager`, while Helm installs default to `cnpg-cloudnative-pg`. Added deployment and service account variables/notes for Helm vs. manifest installs.
- The expected CRD list only included older CloudNativePG CRDs. Updated it, and the optional CRD deletion commands, to include the CRDs present in the current v1.29.1 manifest.
- The monitoring section used a `podMonitorNamespace` value that is not present in the current chart values. Removed it.
- The manual monitoring example used a `ServiceMonitor`, but the operator release manifest exposes metrics on the controller pod and the official sample uses `PodMonitor`. Replaced the snippet with a `PodMonitor`.

## Review Notes
The OLM example follows the general OpenShift Subscription shape, but CloudNativePG's own documentation also notes that EDB provides a certified OpenShift operator for supported OpenShift deployments. Readers should verify the catalog source available in their OpenShift cluster before applying the OLM example.
