# Validation Summary: How to Deploy OpenEBS Mayastor Engine with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenEBS Replicated PV Mayastor
- Flux CD
- Kubernetes
- Helm
- DiskPool custom resources
- Kubernetes StorageClass and PVC resources
- NVMe-oF and hugepages
- fio benchmarking

## Sources Consulted
- OpenEBS Prerequisites: https://openebs.io/docs/main/quickstart-guide/prerequisites
- OpenEBS Installation: https://openebs.io/docs/main/quickstart-guide/installation
- OpenEBS DiskPool documentation: https://openebs.io/docs/main/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-create-diskpool
- OpenEBS StorageClass parameters: https://openebs.io/docs/user-guides/replicated-storage-user-guide/replicated-pv-mayastor/configuration/rs-storage-class-parameters
- OpenEBS kubectl plugin documentation: https://openebs.io/docs/user-guides/kubectl-openebs
- OpenEBS 4.4.0 Helm chart index and packaged values: https://openebs.github.io/openebs/index.yaml
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Kubernetes HugePages documentation: https://kubernetes.io/docs/tasks/manage-hugepages/scheduling-hugepages/

## Issues Found
- The post pinned OpenEBS chart version `3.10.0`, which is outdated for a 2026 tutorial. Updated it to OpenEBS `4.4.0` and adjusted values to the current `engines.replicated.mayastor.enabled` structure.
- The Mayastor Helm values used Kubernetes resource names (`hugepages-2Mi`) where the chart expects `hugepages2Mi`. Updated both requests and limits to the chart-supported value key.
- The prerequisites understated the hugepage requirement. Updated the requirement to at least 2 GiB of 2 MiB hugepages and added the `nvme-tcp` module/plugin prerequisites.
- The HelmRelease snippet placed resources in the `openebs` namespace without creating it. Added a Namespace manifest to the same snippet.
- The DiskPool manifests used `openebs.io/v1beta2`, while current OpenEBS documentation uses `openebs.io/v1beta3`. Updated all DiskPool examples.
- The DiskPool examples used unstable `/dev/nvme0n1` paths. Updated them to stable `/dev/disk/by-id/` links, as recommended by OpenEBS.
- The Flux health check referenced `openebs-io-engine`, but the HelmRelease name renders the DaemonSet as `openebs-mayastor-io-engine`. Updated the health check name.
- The verification commands used `kubectl get diskpool` and `kubectl get mayastorvolume`. Updated them to the documented current commands, `kubectl get dsp -n openebs` and `kubectl openebs mayastor -n openebs get volumes`.

## Review Notes
The post is now technically aligned with current OpenEBS 4.4 documentation. The `fio` image is a community image rather than an official OpenEBS artifact; it is acceptable for an example benchmark, but a future post could prefer a maintained internal or pinned image digest for production repeatability.
