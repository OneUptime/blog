# Validation Summary: How to Deploy Vitess Operator for MySQL Sharding with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Vitess Operator
- Vitess
- MySQL
- GitOps
- Kubernetes Custom Resources and PersistentVolumeClaims

## Sources Consulted
- Vitess Operator GitHub repository and compatibility table: https://github.com/planetscale/vitess-operator
- Vitess Operator API reference for `planetscale.com/v2` CRDs: https://github.com/planetscale/vitess-operator/blob/main/docs/api.md
- Vitess Operator upstream deployment and example manifests: https://github.com/planetscale/vitess-operator/tree/main/deploy
- Vitess Operator for Kubernetes documentation: https://vitess.io/docs/23.0/get-started/operator/
- Vitess `vtctldclient GetTablets` reference: https://vitess.io/docs/25.0/reference/programs/vtctldclient/vtctldclient_gettablets/
- Vitess ports documentation for vtgate/vtctld defaults: https://vitess.io/docs/archive/15.0/user-guides/configuration-basic/ports/
- Flux GitRepository and Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease CRD policy documentation, checked while validating that the original Helm example was not applicable: https://fluxcd.io/flux/components/helm/helmreleases/

## Issues Found
- The original HelmRepository URL (`https://planetscale.github.io/vitess-operator`) did not provide a usable Helm chart index, and the referenced chart version `2.13.2` did not match an available Vitess Operator release. Replaced the HelmRepository/HelmRelease flow with Flux GitRepository/Kustomization resources that deploy the upstream operator manifests from the Vitess Operator repository.
- The VitessCluster API group was incorrect (`planetscale.dev/v2`). Updated it to the actual CRD API group, `planetscale.com/v2`.
- The original Kubernetes version prerequisite was too broad for the operator line used. Updated the prerequisite to the supported Kubernetes range for the revised operator example.
- The original image configuration omitted required component images and used outdated Vitess images. Updated the example to use a compatible Vitess Operator and Vitess image set.
- The original cluster omitted backup configuration, which the operator documentation strongly recommends and uses for provisioning tablets with existing shard data. Added an xtrabackup volume location and PVC.
- The original `topoServer` field was not valid for the Vitess Operator CRD. Removed it and relied on the operator's default global lockserver behavior.
- The original MySQL init script only created an application database/user and omitted the Vitess internal database and MySQL users expected by vttablet. Added the required `_vt` metadata tables and Vitess internal users based on the upstream operator example, while preserving the application user setup.
- The pod label selector used the wrong label prefix (`planetscale.dev/component`). Updated it to `planetscale.com/component`.
- The service names in the port-forward commands included a non-stable hash suffix and the vtctld command forwarded only the HTTP port while `vtctldclient` uses the gRPC port. Updated the service names and forwarded both vtctld ports `15000` and `15999`.
- The Flux Kustomization health check originally pointed at the operator Deployment for the application Kustomization. Updated it to depend on the operator Kustomization and health-check the VitessCluster custom resource.

## Review Notes
The YAML snippets were parsed successfully with PyYAML. `kubectl` is not installed in the workspace, so Kubernetes client dry-run validation could not be performed locally.
