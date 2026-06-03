# Validation Summary: How to Deploy TopoLVM for LVM-Based Thin Provisioning on Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Kubernetes
- TopoLVM CSI driver
- Linux LVM and thin provisioning
- Helm
- Kubernetes scheduler extenders and Storage Capacity Tracking
- CSI VolumeSnapshots
- Prometheus Operator PodMonitor

## Sources Consulted
- TopoLVM README: https://github.com/topolvm/topolvm
- TopoLVM Helm chart values and README: https://github.com/topolvm/topolvm/tree/main/charts/topolvm
- TopoLVM Getting Started guide: https://github.com/topolvm/topolvm/blob/main/docs/getting-started.md
- TopoLVM lvmd documentation: https://github.com/topolvm/topolvm/blob/main/docs/lvmd.md
- TopoLVM scheduler documentation: https://github.com/topolvm/topolvm/blob/main/docs/topolvm-scheduler.md
- TopoLVM Snapshot and Restore guide: https://github.com/topolvm/topolvm/blob/main/docs/snapshot-and-restore.md
- TopoLVM Prometheus and node metrics docs: https://github.com/topolvm/topolvm/blob/main/docs/prometheus.md and https://github.com/topolvm/topolvm/blob/main/docs/topolvm-node.md
- Kubernetes scheduler configuration docs: https://kubernetes.io/docs/reference/scheduling/config/
- Kubernetes scheduler policy deprecation docs: https://kubernetes.io/docs/reference/scheduling/policies/
- Kubernetes kube-scheduler config API reference: https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1
- Kubernetes VolumeSnapshot docs: https://kubernetes.io/docs/concepts/storage/volume-snapshots/

## Issues Found
- The Helm values used `node.lvmdConfigMap`, which is not a current TopoLVM chart value. Replaced it with `lvmd.deviceClasses` in the Helm values.
- The thin pool device class omitted `type: thin`. Added `type: thin` so TopoLVM treats the device class as thin-provisioned and uses the configured thin pool.
- The lvmd ConfigMap workflow did not match the managed Helm chart deployment. Replaced the ConfigMap apply/restart instructions with `helm upgrade` and rollout checks for the managed lvmd and node DaemonSets.
- The post said TopoLVM updates node labels for capacity. Corrected this to node annotations and updated examples to use `capacity.topolvm.io/<device-class>` and `capacity.topolvm.io/00default`.
- The scheduler example used the legacy Kubernetes scheduler `Policy` API, which is unsupported since Kubernetes 1.23. Replaced it with a `kubescheduler.config.k8s.io/v1` `KubeSchedulerConfiguration` extender example.
- The scheduler deployment values did not expose the extender beyond localhost. Added `scheduler.options.listen.host: 0.0.0.0` and a ClusterIP service example for the in-cluster URL shown.
- The VolumeSnapshot section did not mention the required snapshot CRDs and snapshot controller. Added that prerequisite and changed restore examples to use `dataSourceRef`, matching current TopoLVM documentation.
- The monitoring examples used the wrong capacity annotation and a ServiceMonitor for node pods. Updated the examples to use the correct TopoLVM annotations and a PodMonitor matching the chart's pod-monitor pattern.
- The StatefulSet section claimed pods are distributed across nodes. Corrected it to say pods are placed on nodes with sufficient storage capacity.

## Review Notes
The tutorial is technically relevant and salvageable. It remains environment-dependent: configuring the default scheduler is often not possible on managed Kubernetes clusters, so the revised text points those users toward TopoLVM Storage Capacity Tracking mode.
