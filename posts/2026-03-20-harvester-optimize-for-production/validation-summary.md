# Validation Summary: How to Optimize Harvester for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Longhorn
- KubeVirt
- RKE2
- Kubernetes kubelet / node allocatable
- Linux sysctl and networking
- Prometheus and etcd metrics

## Sources Consulted
- Harvester: Update Harvester Configuration After Installation - https://docs.harvesterhci.io/v1.7/install/update-harvester-configuration/
- Harvester: Resource Overcommit - https://docs.harvesterhci.io/v1.7/vm/resource-overcommit/
- Harvester: Settings - https://docs.harvesterhci.io/v1.7/advanced/index/
- Harvester: VM Network - https://docs.harvesterhci.io/v1.7/networking/harvester-network/
- Harvester: Cluster Network - https://docs.harvesterhci.io/v1.7/networking/index/
- Harvester: Storage Network - https://docs.harvesterhci.io/v1.6/advanced/storagenetwork/
- Harvester: Management Address - https://docs.harvesterhci.io/v1.5/install/management-address
- Longhorn: Customizing Default Settings - https://longhorn.io/docs/1.11.1/advanced-resources/deploy/customizing-default-settings/
- Longhorn: Settings Reference - https://longhorn.io/docs/1.11.1/references/settings/
- Longhorn: Metrics for Monitoring - https://longhorn.io/docs/latest/monitoring/metrics/
- KubeVirt: Node Overcommit - https://kubevirt.io/user-guide/compute/node_overcommit/
- KubeVirt: API Reference - https://kubevirt.io/api-reference/
- RKE2: Configuration Options - https://docs.rke2.io/install/configuration
- Kubernetes: Reserve Compute Resources for System Daemons - https://kubernetes.io/docs/tasks/administer-cluster/reserve-compute-resources/
- Kubernetes: Kubelet Configuration (v1beta1) - https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- etcd: Metrics - https://etcd.io/docs/v3.3/metrics/
- etcd: FAQ - https://etcd.io/docs/v3.7/faq/

## Issues Found
- The original host-level CPU governor and kernel tuning sections implied persistent direct edits on Harvester nodes. Harvester uses an immutable OS, so I changed this to runtime-only validation guidance and explicitly noted that persistent node tuning must be managed through Harvester's configuration lifecycle.
- The Longhorn settings example used malformed `Setting` objects (`spec.value` instead of the `value` field) and used `default-replica-count` for PVC-backed Harvester volumes. I replaced the manifest with supported `kubectl patch` commands and moved replica count and data locality to the `harvester-longhorn` StorageClass, which is the correct mechanism for Kubernetes-provisioned volumes.
- The overcommit section edited the `KubeVirt` CR directly, used the wrong field name `memoryOvercommitPercentage`, and mixed in unrelated `cpuModel` and `vmStateStorageClass` fields. I replaced it with Harvester's supported `overcommit-config` setting and a verification command.
- The network tuning section used raw `ip link` and `ethtool` examples against `ethX` devices. Harvester manages VM and storage networking through cluster networks and `nmcli`, so I replaced the section with a Harvester-documented MTU change workflow and the matching `clusternetwork` annotation update.
- The kubelet reservation section used a `ConfigMap` in `kube-system`, which does not configure the node kubelet in Harvester/RKE2, and described `kubeReserved` as reserving resources for system pods instead of Kubernetes system daemons. I replaced it with an RKE2 kubelet drop-in file, corrected the description, and changed `memory.available` to a supported quantity threshold.
- The HA validation section used a generic VIP grep loop. Harvester exposes the current VIP holder via the `ingress-expose` service annotation, so I updated the example to use that supported method.
- The Longhorn degraded-volume PromQL example used the wrong label name. Longhorn exposes robustness state via the `state` label, so I corrected the query to `longhorn_volume_robustness{state="degraded"} == 1`.

## Review Notes
- The `overcommit-config` setting applies to newly created virtual machines after the change; existing VMs are not immediately rescheduled by that setting alone.
- StorageClass parameter changes affect newly provisioned Longhorn volumes. Existing VM disks keep their current volume settings unless they are recreated or explicitly reconfigured.
- The sample PromQL node queries assume the monitoring stack exposes a `node` label on node-exporter metrics; some Prometheus deployments use `instance` instead.
