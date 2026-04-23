# Validation Summary: How to Scale Rancher HA Nodes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE2
- Kubernetes
- Helm
- Fleet
- etcd

## Sources Consulted
- RKE2 High Availability: https://docs.rke2.io/install/ha
- RKE2 Managing Server Roles: https://docs.rke2.io/install/server_roles
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher chart values: https://raw.githubusercontent.com/rancher/rancher/release/v2.14/chart/values.yaml
- Rancher deployment template: https://raw.githubusercontent.com/rancher/rancher/release/v2.14/chart/templates/deployment.yaml
- Fleet Installation Details: https://fleet.rancher.io/0.14/how-tos-for-operators/installation
- Fleet chart values: https://raw.githubusercontent.com/rancher/fleet/main/charts/fleet/values.yaml
- Fleet controller deployment template: https://raw.githubusercontent.com/rancher/fleet/main/charts/fleet/templates/deployment.yaml
- Fleet GitJob deployment template: https://raw.githubusercontent.com/rancher/fleet/main/charts/fleet/templates/deployment_gitjob.yaml
- Kubernetes Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/configuration/assign-pod-node/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The Step 1 example conflated the Rancher UI hostname with the RKE2 registration endpoint and described a taint as if it defined server roles. I changed the example to use a fixed RKE2 registration address, clarified that the taint is optional server tainting, and added the missing etcd quorum note that server counts should remain odd.
- The Step 2 dedicated-etcd example was missing `disable-apiserver: true`, which is required for an etcd-only RKE2 server role. I corrected the dedicated-etcd and control-plane-only examples to match the official RKE2 role-splitting documentation and added the bootstrap/prerequisite caveats for fresh clusters.
- The Step 4 anti-affinity snippet used a raw `affinity` values structure that the current Rancher Helm chart does not expose directly. I replaced it with the supported `antiAffinity` and `topologyKey` chart values and updated the `helm upgrade` example accordingly.
- The Step 5 system-node example only added a toleration and did not actually target the labeled nodes; the direct JSON patch also risked replacing existing tolerations. I replaced it with chart-supported `extraTolerations` and `extraNodeSelectorTerms` values so Rancher both tolerates the taint and selects the dedicated system nodes.
- The Step 6 Fleet section referenced `fleet-gitjob`, but the current Fleet chart deploys that workload as `gitjob`. I corrected the deployment name, renamed the section to refer to controllers instead of the agent, and changed the resource update to a strategic merge patch keyed by container name so it works even when `resources` is not already present.

## Review Notes
- The examples assume a Helm-managed Rancher release named `rancher` in the `cattle-system` namespace. If the release name differs, adjust the `helm upgrade` target and any `kubectl` selectors that depend on it.
- The final `curl` command is suitable as a simple latency check, but on secured Rancher installations it may return an authentication response rather than cluster data unless credentials are supplied.
