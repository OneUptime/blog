# Validation Summary: How to Upgrade Talos Clusters Using CAPI

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Talos Linux
- Cluster API (CAPI)
- CAPI Bootstrap Provider Talos (CABPT)
- CAPI Control Plane Provider Talos (CACPPT)
- Kubernetes
- kubectl
- clusterctl
- AWSMachineTemplate / Cluster API Provider AWS
- etcd
- talosctl

## Sources Consulted
- Talos CAPI bootstrap provider README: https://github.com/siderolabs/cluster-api-bootstrap-provider-talos
- Talos CAPI control plane provider README: https://github.com/siderolabs/cluster-api-control-plane-provider-talos
- Cluster API upgrading management and workload clusters: https://cluster-api.sigs.k8s.io/tasks/upgrading-clusters
- Cluster API updating machine infrastructure and bootstrap templates: https://cluster-api.sigs.k8s.io/tasks/updating-machine-templates
- Cluster API machine deletion process: https://cluster-api.sigs.k8s.io/tasks/automated-machine-management/machine_deletions
- Cluster API supported labels and annotations: https://cluster-api.sigs.k8s.io/reference/api/labels-and-annotations
- Talos v1.13 support matrix: https://docs.siderolabs.com/talos/v1.13/getting-started/support-matrix
- Talos CLI reference for `talosctl etcd snapshot`: https://docs.siderolabs.com/talos/v1.10/reference/cli

## Issues Found
- The introduction implied Talos OS upgrades could be handled only by updating resource specifications. I clarified that Talos OS rollouts also require referencing new immutable templates that boot the new Talos image.
- The rolling update explanation claimed the cluster always keeps the desired number of healthy nodes. I changed this to say availability follows the configured rollout strategy, because `maxUnavailable` can intentionally allow fewer available machines during a rollout.
- The Talos OS section described `talosVersion` as being in config patches. I corrected this to describe it as the generated Talos configuration version in the CABPT/CACPPT configuration.
- The Talos OS upgrade flow only covered the control plane. I added the worker `TalosConfigTemplate` path and the `MachineDeployment` bootstrap and infrastructure template reference updates required for worker rollouts.
- The combined Talos and Kubernetes upgrade command only patched the `TalosControlPlane`. I added the corresponding `MachineDeployment` patch so worker Kubernetes version, bootstrap config, and infrastructure template references are updated as well.
- The rollback example only reverted Kubernetes versions. I updated it to also revert the control plane and worker template references.
- The examples used older Talos and Kubernetes target versions. I refreshed them to Talos `v1.13.0` and Kubernetes `v1.35.0`, which are within the current Talos v1.13 support matrix and Talos CAPI provider compatibility documentation.

## Review Notes
- The examples still use Cluster API `v1beta1` for `MachineDeployment` because the Talos control plane provider documentation continues to show the `v1alpha3` Talos control plane API with v1beta1-era CAPI compatibility. Future revisions should revisit these manifests as the Talos providers move fully through the CAPI v1beta2 transition.
- The AWS AMI IDs remain placeholders. Users must choose region-specific Talos AMIs or generated images that match the target Talos release.
