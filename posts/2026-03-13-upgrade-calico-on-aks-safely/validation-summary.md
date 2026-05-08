# Validation Summary: How to Upgrade Calico on AKS Safely

## Status
validated

## Post Type
Tutorial / operations guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Azure Kubernetes Service (AKS)
- Azure CNI
- Kubernetes custom resources
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Upgrade Calico on Kubernetes - https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico documentation: Installing on AKS - https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/aks
- Calico documentation: Installation API reference - https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Install calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl node status - https://docs.tigera.io/calico/latest/reference/calicoctl/node/status

## Issues Found
- The post implied all AKS Calico deployments can be upgraded through the Tigera Operator. Updated the introduction and prerequisites to scope the procedure to self-managed, operator-managed Calico and clarify that Azure-managed Calico is upgraded by Azure.
- The operator upgrade command downloaded and applied only `tigera-operator.yaml`. Added the required `v1_crd_projectcalico_org.yaml` download and server-side apply with `--force-conflicts`, matching the official operator upgrade procedure.
- The post patched `Installation.spec.calicoNetwork.calicoVersion`, but `calicoVersion` is a status field, not a valid `InstallationSpec` field. Removed that patch and documented that applying the target operator manifest initiates the component upgrade.
- The post used `kubectl get clusterinformation` for a Calico API resource. Changed it to `calicoctl get clusterinformation`, which follows Calico guidance for managing `projectcalico.org/v3` resources.
- The post used `calicoctl node status` as a general AKS validation command. Official documentation notes this command must run directly on the compute host running Calico node, which is not generally available from an AKS admin workstation. Replaced it with `calicoctl get nodes`.
- The post checked only `kubectl get tigerastatus calico`. Changed it to `kubectl get tigerastatus` so all operator-managed Calico component statuses are visible, matching Calico AKS installation verification guidance.
- The upgrade example used the older hard-coded `v3.28.0` release. Replaced it with a `CALICO_VERSION` variable set to the current documented example version, `v3.32.0`, so readers can update the target version in one place.

## Review Notes
- The guide now applies to self-managed, operator-managed Calico on AKS. Manifest-installed Calico uses a different official upgrade path and should not be upgraded with the operator procedure unless it has first been migrated to operator management.
- `calicoctl` and `kubectl` were not installed in the local review environment, so command behavior was verified against official Calico documentation rather than local CLI help.
