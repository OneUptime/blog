# Validation Summary: How to Test Rancher Upgrades in a Staging Environment

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- RKE2
- K3s
- Helm
- cert-manager

## Sources Consulted
- Rancher: Install/Upgrade Rancher on a Kubernetes Cluster - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher: Upgrades - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/upgrades
- Rancher: Rancher Helm Chart Options - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher: Registering Existing Clusters - https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- Rancher: Previous v3 Rancher API Guide - https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher: API Keys - https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher: Using API Tokens - https://ranchermanager.docs.rancher.com/api/api-tokens
- RKE2: High Availability - https://docs.rke2.io/install/ha
- RKE2: Configuration Options - https://docs.rke2.io/install/configuration
- cert-manager: Helm Installation - https://cert-manager.io/v1.14-docs/installation/helm/
- Helm: helm repo update - https://helm.sh/docs/v3/helm/helm_repo_update/
- Helm: helm rollback - https://helm.sh/docs/v3/helm/helm_rollback/

## Issues Found
- The original RKE2 example treated every server node the same, which would not create a functional HA RKE2 cluster. I split the example into first-node and additional-node configurations, added the shared token, and added the required `server: https://<RKE2_REGISTRATION_ADDRESS>:9345` setting for joining additional servers.
- The post hardcoded cert-manager `v1.14.4` while saying staging should match production exactly. I replaced the hardcoded version with `<CERT_MANAGER_VERSION>` and added `helm repo update` before the Helm install to align with the official cert-manager installation flow.
- The Rancher install command hardcoded `replicas=3`, which can diverge from the production deployment being mirrored. I changed it to `<CURRENT_PROD_REPLICA_COUNT>` so the staging install matches production more accurately.
- The cluster registration example implied that a direct `kubectl apply` would always be the right command. I added the note that self-signed Rancher installs must use the curl-based registration command shown in the Rancher UI.
- The upgrade section labeled `helm get values` as a backup. I corrected that wording to make clear it only exports Helm values and does not replace the backup procedure Rancher documents for upgrade preparation.
- The version-check command used the Rancher `settings` resource as if it were namespaced. I changed it to `kubectl get settings.management.cattle.io server-version -o jsonpath='{.value}'`, which matches Rancher's cluster-scoped settings resource.
- The API validation example used the local login endpoint to create a session token. I replaced it with documented v3 API key authentication using access and secret keys over HTTP basic auth.

## Review Notes
- Rancher's legacy v3 API tokens are being phased out starting in v2.14.0. The corrected API example still uses the supported v3 API flow documented today, but future automation should keep the newer RK-API and `tokens.ext.cattle.io` workflow in mind.
- The post is still version-sensitive by design. Before any real production upgrade, the team should verify the Rancher release notes, Kubernetes support matrix, and cert-manager compatibility for the exact versions in use.
