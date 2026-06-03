# Validation Summary: How to Configure Volume Binding Mode WaitForFirstConsumer for Topology-Aware

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StorageClass
- Kubernetes PersistentVolume and PersistentVolumeClaim
- Kubernetes Deployments and StatefulSets
- Kubernetes scheduler topology constraints
- AWS EBS CSI Driver
- GKE Compute Engine Persistent Disk CSI Driver
- kubectl
- jq
- Prometheus / kube-state-metrics

## Sources Consulted
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Pod Topology Spread Constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Amazon EKS storage class documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Amazon EKS EBS CSI driver documentation: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- GKE Compute Engine Persistent Disk CSI driver documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- GKE regional persistent disk documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/regional-pd

## Issues Found
- The Immediate binding explanation implied that Kubernetes always creates the volume in a randomly selected zone. Updated it to match Kubernetes documentation: Immediate provisioning happens without knowledge of Pod scheduling requirements, which can produce topology mismatches.
- The example error for zone mismatch used a multi-attach-style message. Replaced it with the more relevant Kubernetes scheduling error, "had volume node affinity conflict."
- The WaitForFirstConsumer explanation claimed topology alignment was guaranteed. Updated the wording to account for scheduler/provisioner failures or unsatisfiable constraints.
- The GKE regional persistent disk example used `topology.kubernetes.io/zone`, three zones, and `pd-ssd`. Updated it to use the GKE CSI topology key `topology.gke.io/zone`, two replica zones, and `pd-balanced`, matching GKE regional persistent disk documentation.
- The multi-zone StatefulSet wording said each pod always gets a different zone and a matching single-zone volume. Updated it to describe feasible topology spread and regional disk replication behavior.
- The AWS EBS `allowedTopologies` example used the generic Kubernetes zone key and a region expression. Updated it to use the AWS EBS CSI topology key `topology.ebs.csi.aws.com/zone` and removed the unsupported region topology expression.
- The migration section showed `kubectl patch pvc ... storageClassName`, which is not a valid migration path for an existing bound PVC. Replaced it with comments describing replacement PVC creation, data migration, and workload updates.
- The PV topology monitoring commands only matched `topology.kubernetes.io/zone`, which would miss driver-specific topology keys. Updated the `jq` filters to match zone topology keys such as `topology.ebs.csi.aws.com/zone` and `topology.gke.io/zone`.
- The PromQL volume-per-zone example assumed PV topology was already exposed as a label. Added a caveat that the query applies when topology is copied into labels and kube-state-metrics exposes those labels.

## Review Notes
- `kubectl` is not installed in the local environment, so CLI checks were performed against official documentation rather than local `kubectl --help` output.
- The `jq` topology filters were syntax-checked locally with jq 1.7 using sample PV JSON.
