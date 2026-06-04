# Validation Summary: How to Migrate VM-Based Applications to Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- KubeVirt
- KubeVirt virtctl
- KubeVirt Containerized Data Importer (CDI)
- Kubernetes Services, Deployments, PVCs, and Custom Resources
- Prometheus Operator ServiceMonitor and PrometheusRule
- Grafana dashboards

## Sources Consulted
- KubeVirt installation guide: https://kubevirt.io/user-guide/cluster_admin/installation/
- KubeVirt run strategies guide: https://kubevirt.io/user-guide/compute/run_strategies/
- KubeVirt interfaces and networks guide: https://kubevirt.io/user-guide/network/interfaces_and_networks/
- KubeVirt service objects guide: https://kubevirt.io/user-guide/network/service_objects/
- KubeVirt live migration guide: https://kubevirt.io/user-guide/compute/live_migration/
- KubeVirt lifecycle guide: https://kubevirt.io/user-guide/user_workloads/lifecycle/
- KubeVirt VM access guide: https://kubevirt.io/user-guide/user_workloads/accessing_virtual_machines/
- KubeVirt component monitoring guide: https://kubevirt.io/user-guide/user_workloads/component_monitoring/
- KubeVirt metrics reference: https://kubevirt.io/monitoring/metrics.html
- KubeVirt CDI guide: https://kubevirt.io/user-guide/storage/containerized_data_importer/
- KubeVirt containerdisks repository: https://github.com/kubevirt/containerdisks
- KubeVirt API reference: https://kubevirt.io/api-reference/

## Issues Found
- Replaced hard-coded outdated KubeVirt and CDI versions with current stable/latest release discovery commands.
- Changed KubeVirt install commands to match the official stable install flow and wait on the KubeVirt custom resource availability condition.
- Replaced deprecated `spec.running: true` VM examples with `runStrategy: Always`.
- Replaced an unreliable pre-install KVM device-capacity check and clarified that hardware virtualization is normally required, with emulation reserved for testing.
- Corrected the Ubuntu container disk image to the KubeVirt-maintained `quay.io/containerdisks/ubuntu:22.04`.
- Reworked the CDI import example to create a `DataVolume` with an HTTP source and wait for the DataVolume phase to become `Succeeded`.
- Added the required `--uploadproxy-url` placeholder to the `virtctl image-upload` example.
- Fixed the production `dataVolumeTemplates` example by adding DataVolume metadata fields and avoiding a self-referential PVC clone.
- Changed production VM storage access mode to `ReadWriteMany` so the later live migration example is compatible with KubeVirt live migration requirements.
- Changed VM networking examples from bridge pod networking to masquerade pod networking where Kubernetes Service access and live migration compatibility were intended.
- Added the missing cloud-init disk device in the hybrid VM example.
- Corrected `virtctl stop --force` to include `--grace-period 0` and updated the `virtctl ssh` target syntax.
- Removed the unused target-node variable and corrected the live migration explanation because `VirtualMachineInstanceMigration` does not directly select a target node.
- Corrected `nodeDrainTaintKey` to KubeVirt's documented drain taint key.
- Fixed Prometheus/Grafana metric names and queries to use current KubeVirt metrics and rate expressions for counters.
- Corrected the ServiceMonitor selector to match KubeVirt's documented metrics service label.
- Added missing pod template labels to Kubernetes Deployment examples so their selectors match valid `apps/v1` Deployment requirements.
- Softened absolute zero-downtime migration language to include KubeVirt's storage and networking prerequisites.

## Review Notes
The examples remain illustrative and still depend on cluster-specific prerequisites such as a suitable storage class, Multus only if secondary networks are later added, CDI upload proxy exposure, RBAC for `virtctl` access, and guest operating system configuration. YAML snippets and embedded Grafana JSON were parsed successfully, and bash snippets passed `bash -n`.
