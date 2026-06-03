# Validation Summary: How to Use Volume Populators to Pre-Fill PVCs from Custom Data Sources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PersistentVolumeClaims
- Kubernetes volume populators and `dataSourceRef`
- Kubernetes CustomResourceDefinitions
- Kubernetes RBAC
- Kubernetes CSI volume data source validator
- lib-volume-populator
- PostgreSQL official container initialization

## Sources Consulted
- Kubernetes Persistent Volumes documentation, including volume populators and `dataSourceRef`: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes feature gates reference for `AnyVolumeDataSource`: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes 1.24 volume populators beta announcement and official sample manifest URLs: https://v1-32.docs.kubernetes.io/blog/2022/05/16/volume-populators-beta/
- Kubernetes 1.33 volume populators GA announcement: https://v1-34.docs.kubernetes.io/blog/2025/05/08/kubernetes-v1-33-volume-populators-ga/
- Kubernetes CSI data sources documentation: https://kubernetes-csi.github.io/docs/volume-datasources.html
- lib-volume-populator hello example manifests: https://github.com/kubernetes-csi/lib-volume-populator/tree/master/example/hello-populator
- volume-data-source-validator repository and manifests: https://github.com/kubernetes-csi/volume-data-source-validator
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Docker PostgreSQL initialization documentation: https://docs.docker.com/guides/postgresql/advanced-configuration-and-initialization/

## Issues Found
- The prerequisites said `AnyVolumeDataSource` was GA in Kubernetes 1.26. Official Kubernetes documentation shows it was beta from 1.24 through 1.32 and GA in 1.33, so the version statement was corrected.
- The feature verification commands implied `VolumePopulator` was a built-in API resource. The validator installs the `VolumePopulator` CRD, while the Kubernetes PVC API provides `dataSourceRef`, so the commands were updated to check the PVC field and then the validator CRD.
- The validator install URLs pointed to GitHub release assets that return 404. They were replaced with the upstream raw `v1.0.1` manifest URLs used in the Kubernetes SIG Storage beta blog.
- The post described installing a pre-built S3 populator but only installed the data source validator. The wording now explains that the validator is not a populator and that a real populator controller must be installed separately.
- The `VolumePopulator` registration examples were missing. The S3 and HTTP examples now include `VolumePopulator` resources with the correct `sourceKind.group` and `sourceKind.kind` fields.
- The Git source example implied that `GitSource` would work without its own CRD and controller. The text now states that a matching CRD and populator are required.
- The HTTP populator example used an `alpine` polling loop that lacked `kubectl`, would repeatedly create pods, and did not follow the lib-volume-populator control flow. It was replaced with a controller-style manifest, RBAC closer to the upstream example, an `HTTPSource` CRD, and a validator registration.
- The population flow was too absolute about temporary pods and binding behavior. It now describes the common lib-volume-populator pattern with a prime PVC, provider-specific population logic, cleanup, and original PVC usability.
- The PostgreSQL example used an init container to run `psql -h localhost` before the PostgreSQL container started, which cannot work because init containers run to completion before app containers. The example now uses the official PostgreSQL image's `/docker-entrypoint-initdb.d` initialization path with `PGDATA` set to a subdirectory.
- The monitoring command used a label that did not match the example deployment. It now uses `app=http-populator`.

## Review Notes
- The S3, HTTP, and Git source kinds in the article are illustrative custom resources. They require corresponding populator controller implementations; Kubernetes does not provide built-in S3, HTTP, or Git populators.
- The local workspace does not have `kubectl` installed, so CLI behavior was checked against official Kubernetes documentation and upstream manifest references rather than local `kubectl --help` output.
