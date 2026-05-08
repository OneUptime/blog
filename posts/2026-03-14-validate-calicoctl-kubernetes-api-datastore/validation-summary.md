# Validation Summary: How to Validate Calicoctl Kubernetes API Datastore Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes API datastore
- Kubernetes RBAC
- Bash scripting
- YAML and JSON resource manifests

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to the Kubernetes API datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico documentation: calicoctl get command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl apply command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: calicoctl delete command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico documentation: calicoctl version command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico documentation: calicoctl user reference and supported resource aliases - https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico documentation: GlobalNetworkSet resource definition - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset

## Issues Found
- The RBAC validation list included `ipamblocks`, which is not a valid current `calicoctl get` resource type. Removed it and added current documented resource types such as `ipreservations`, `bgpfilters`, `kubecontrollersconfiguration`, and `tiers`.
- The RBAC validation loop used default-namespace reads for namespaced resources. Updated `networkpolicies`, `networksets`, and `workloadendpoints` checks to use `--all-namespaces`.
- The complete validation suite had invalid shell quoting in the `Kubeconfig exists` check. Reworked it to extract `KUBECONFIG_PATH` first, then validate that the path is non-empty and exists.
- Updated wording in the RBAC script comment from "all Calico resource types" to "current calicoctl resource types" to match the official command reference more precisely.

## Review Notes
The local environment did not have `calicoctl` installed, so command behavior was checked against official Calico documentation rather than local CLI help. Bash snippets were extracted from the post and passed `bash -n` syntax validation successfully.
