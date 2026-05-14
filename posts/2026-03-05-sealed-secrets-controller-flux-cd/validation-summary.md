# Validation Summary: How to Configure Sealed Secrets Controller with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- HelmRelease and HelmRepository custom resources
- Bitnami Labs Sealed Secrets controller
- kubeseal CLI
- Kubernetes NetworkPolicy

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Bitnami Labs Sealed Secrets README: https://github.com/bitnami-labs/sealed-secrets
- Sealed Secrets Helm chart values: https://raw.githubusercontent.com/bitnami-labs/sealed-secrets/main/helm/sealed-secrets/values.yaml
- Sealed Secrets Helm chart deployment template: https://raw.githubusercontent.com/bitnami-labs/sealed-secrets/main/helm/sealed-secrets/templates/deployment.yaml
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The Step 5 example showed a Flux `Kustomization` custom resource pointing at `./infrastructure`, but it did not actually include the new `infrastructure/sealed-secrets` directory in the root Kustomize build. Changed the example to `infrastructure/kustomization.yaml` with `resources: - sealed-secrets`, and updated the `git add` command to include that file.
- The advanced Pod Disruption Budget example used `podDisruptionBudget.enabled`, which is not a current value in the official Sealed Secrets Helm chart. Changed it to `pdb.create`, matching the chart's `values.yaml`.
- The "High Availability Configuration" heading implied multi-replica high availability, but the official chart currently renders the controller Deployment with `replicas: 1`. Renamed the section to "Pod Disruption Budget and Scheduling Configuration" and adjusted the description.
- The NetworkPolicy comment said it allowed the Kubernetes API server to reach a controller webhook. The example only allows ingress on the controller HTTP port and does not select the API server as a source. Updated the comment to accurately describe the rule.

## Review Notes
- The Flux `HelmRepository` and `HelmRelease` API versions are current.
- The `install.crds` and `upgrade.crds` policies use supported Flux values.
- The Sealed Secrets chart repository URL, `fullnameOverride`, `keyrenewperiod`, metrics values, resource values, key backup command, and `kubeseal --fetch-cert` controller flags are consistent with official documentation.
