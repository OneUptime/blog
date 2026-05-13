# Validation Summary: How to Deploy SeaweedFS with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- SeaweedFS
- SeaweedFS Helm chart
- Flux CD HelmRepository, HelmRelease, and Kustomization APIs
- Kubernetes Namespace, Secret, StorageClass, StatefulSet health checks, and kubectl
- SeaweedFS S3-compatible API
- SeaweedFS CSI driver
- AWS CLI S3 commands with a custom endpoint

## Sources Consulted
- SeaweedFS Helm chart repository index: https://seaweedfs.github.io/seaweedfs/helm/index.yaml
- SeaweedFS Helm chart 4.0.0 package and values/templates: https://seaweedfs.github.io/seaweedfs/helm/seaweedfs-4.0.0.tgz
- SeaweedFS current Helm chart values: https://github.com/seaweedfs/seaweedfs/blob/master/k8s/charts/seaweedfs/values.yaml
- SeaweedFS S3 credentials documentation: https://github-wiki-see.page/m/seaweedfs/seaweedfs/wiki/S3-Credentials
- SeaweedFS replication documentation: https://github-wiki-see.page/m/seaweedfs/seaweedfs/wiki/Replication
- SeaweedFS filer store documentation: https://github-wiki-see.page/m/seaweedfs/seaweedfs/wiki/Filer-Stores
- SeaweedFS CSI driver documentation: https://github.com/seaweedfs/seaweedfs-csi-driver
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- AWS CLI endpoint documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-endpoints.html

## Issues Found
- The SeaweedFS chart values for the volume server used `volume.data`, which is not the chart key for chart version 4.0.0. Changed it to `volume.dataDirs` and kept the PVC size, storage class, and `maxVolumes` configuration in the supported format.
- The volume index setting was described in a comment but not actually configured. Added `volume.index: leveldb`, which is the supported chart value.
- The master garbage collection setting was placed under a TOML `config` block as `garbage_threshold`, which does not set the chart's master flag. Changed it to the supported `master.garbageThreshold: 0.3` value.
- The Filer `config` block and `fuse` block were not supported SeaweedFS chart values. Replaced the Filer options with supported `extraEnvironmentVars` entries and removed the unsupported FUSE chart setting.
- The post configured two Filer replicas while using the local `leveldb2` filer metadata backend. Changed Filer replicas to 1 and noted that `leveldb2` should be used with a single Filer replica.
- The example S3 credentials were under unsupported `s3.config.content` values and would not be mounted by the chart. Added a Kubernetes Secret with the required `seaweedfs_s3_config` key and configured `filer.s3.enableAuth` plus `filer.s3.existingConfigSecret`.
- The optional CSI StorageClass wording implied the driver was installed by creating the StorageClass alone. Clarified that the StorageClass applies when the SeaweedFS CSI driver is already installed.
- The CSI StorageClass included an unsupported `ttl` example parameter. Replaced it with the documented `diskType` parameter.
- The master UI port-forward command used `svc/seaweedfs-master-peer`, which is not the service created by the chart. Changed it to `svc/seaweedfs-master`.
- The `kubectl exec` command used a here-string without stdin enabled. Added `-i` so `weed shell` receives the command.
- The replication examples described `"001"` and `"010"` as total copy counts. Updated the wording to match SeaweedFS placement semantics: the digits describe extra replicas by data center, rack, and server placement.
- The introduction referred to a Kubernetes operator as part of this deployment. Adjusted it to describe the Helm chart used by the post.

## Review Notes
- YAML snippets were parsed locally with PyYAML after editing.
- `helm`, `kubectl`, `flux`, and `aws` CLIs are not installed in this workspace, so command behavior was verified against official documentation and chart templates rather than by running a live deployment.
- The post pins SeaweedFS chart `4.0.0`, which still exists in the official chart repository, but the latest chart available during review was newer. A future update could refresh the tutorial to the latest chart line and its updated `global.seaweedfs` values structure.
