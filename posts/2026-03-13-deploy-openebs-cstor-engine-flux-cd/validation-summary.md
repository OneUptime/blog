# Validation Summary: How to Deploy OpenEBS cStor Engine with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenEBS 3.10
- OpenEBS cStor CSI
- Kubernetes StorageClass, PersistentVolumeClaim, and VolumeSnapshot APIs
- Flux CD HelmRepository, HelmRelease, and Kustomization
- Helm charts and GitOps-managed Kubernetes manifests

## Sources Consulted
- OpenEBS 3.10 cStor install and setup guide: https://openebs.io/docs/3.10.x/user-guides/cstor
- OpenEBS 3.10 cStor advanced guide: https://openebs.io/docs/3.10.x/user-guides/cstor/advanced
- OpenEBS 3.10 release information: https://openebs.io/docs/3.10.x/introduction/releases
- OpenEBS 4.4 upgrade documentation: https://openebs.io/docs/user-guides/upgrade
- OpenEBS legacy Helm chart index: https://openebs.github.io/charts/index.yaml
- OpenEBS current Helm chart index: https://openebs.github.io/openebs/index.yaml
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes VolumeSnapshot documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/

## Issues Found
- The HelmRepository URL used `https://openebs.github.io/openebs`, which is the current OpenEBS chart repository and does not contain the pinned `openebs` chart version `3.10.0`. Changed it to the legacy official chart index `https://openebs.github.io/charts`, where OpenEBS `3.10.0` is published.
- The post implied cStor was part of current OpenEBS without a version caveat. Updated the wording to identify cStor as an OpenEBS 3.x replicated storage engine and to clarify that the OpenEBS 3.10 chart comes from the legacy charts repository.
- The prerequisites omitted iSCSI utilities, which the OpenEBS cStor guide requires on worker nodes that run workloads using cStor volumes. Added that prerequisite.
- The Helm values placed resource requests and limits under `cstor.resources`, which is not a valid OpenEBS 3.10 cStor chart value. Moved those limits under valid cStor subchart keys: `cspcOperator.resources`, `cvcOperator.resources`, and `csiController.resources`.
- The Flux Kustomization was named `openebs-cstor` but depended on an `openebs-operator` Kustomization that was not defined in the post. Renamed the shown Kustomization to `openebs-operator` and removed the unresolved dependency.

## Review Notes
OpenEBS 3.10 documentation is no longer actively maintained, and current OpenEBS 4.4 documentation lists Replicated PV Mayastor rather than cStor as the replicated engine in the unified chart. The corrected tutorial is valid for the pinned OpenEBS 3.10/cStor CSI chart path, but future posts should prefer current OpenEBS replicated storage unless cStor is required for an existing 3.x deployment.
