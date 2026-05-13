# Validation Summary: How to Deploy Piraeus Operator (LINSTOR) with Flux CD

## Status
validated

## Post Type
Tutorial / GitOps deployment guide

## Technologies Covered
- Kubernetes
- Flux CD
- HelmRelease and OCIRepository
- Piraeus Operator
- LINSTOR
- DRBD
- LINSTOR CSI
- Kubernetes StorageClass
- Kubernetes VolumeSnapshotClass

## Sources Consulted
- Piraeus Datastore Helm deployment guide: https://piraeus.io/docs/stable/how-to/helm/
- Piraeus Datastore v2.7.0 LinstorCluster reference: https://piraeus.io/docs/v2.7.0/reference/linstorcluster/
- Piraeus Datastore v2.7.0 LinstorSatelliteConfiguration reference: https://piraeus.io/docs/v2.7.0/reference/linstorsatelliteconfiguration/
- Piraeus Datastore DRBD module loader guide: https://piraeus.io/docs/v2/how-to/drbd-loader/
- Piraeus Datastore kernel headers guide: https://piraeus.io/docs/stable/how-to/install-kernel-headers/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization health checks documentation: https://v2-0.docs.fluxcd.io/flux/components/kustomize/kustomization/
- LINBIT LINSTOR Kubernetes / CSI user guide: https://linbit.com/drbd-user-guide/linstor-guide-1_0-en/
- Piraeus Operator v2.7.0 chart source, `charts/piraeus/values.yaml` and `Chart.yaml`: https://github.com/piraeusdatastore/piraeus-operator/tree/v2.7.0/charts/piraeus

## Issues Found
- The post used the legacy `https://piraeus.io/helm-charts` Helm repository and chart name `piraeus-operator`. Updated the Flux source to an `OCIRepository` for `oci://ghcr.io/piraeusdatastore/piraeus-operator/piraeus` and changed the HelmRelease to use `chartRef`, matching current Flux OCI chart guidance and Piraeus Helm documentation.
- The Helm values included unsupported `csiDriver.enabled` and `webhooks.certManager.enabled` fields for the Piraeus Operator v2.7.0 chart. Removed them, added `installCRDs: true`, retained the supported `operator.resources`, and set `tls.autogenerate: true`.
- The `LinstorCluster` example used unsupported `controller.resources`, `controller.dbConnectionURL`, and `csiController.resources` fields. Replaced them with the documented `podTemplate` structure for controller and CSI controller resources.
- The LINSTOR property `DrbdOptions/on-no-data-accessible` was missing the `Resource` scope. Changed it to `DrbdOptions/Resource/on-no-data-accessible`.
- The satellite selector used Kubernetes `matchLabels`, but `LinstorSatelliteConfiguration.spec.nodeSelector` is a direct map. Updated it to `piraeus.io/satellite: "true"`.
- Satellite resources were configured through a cluster-level patch. Moved them to the documented `LinstorSatelliteConfiguration.spec.podTemplate`.
- StorageClass `layerList` values were unquoted and upper-case. Updated them to the documented lower-case LINSTOR CSI values, such as `"drbd storage"` and `"storage"`.
- The VolumeSnapshotClass used an unsupported `linstor.csi.linbit.com/snap-storagePool` parameter. Removed it, leaving the documented LINSTOR CSI snapshot class form.
- The DRBD prerequisite implied an in-tree DRBD 9 module. Reworded it to require kernel headers so the Piraeus DRBD module loader can build or load DRBD 9.

## Review Notes
The examples are now aligned with Piraeus Operator v2.7.0 and current Flux OCI HelmRelease patterns. A future improvement would be splitting the operator HelmRelease and the Piraeus custom resources into separate Flux Kustomizations with an explicit dependency so CRDs are installed before Flux applies `LinstorCluster` and `LinstorSatelliteConfiguration`.
