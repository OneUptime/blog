# Validation Summary: How to Deploy StatefulSets with Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Kubernetes
- StatefulSets
- Kubernetes Services
- PersistentVolumeClaims
- Kubernetes Secrets
- PostgreSQL

## Sources Consulted
- Portainer Applications docs: https://docs.portainer.io/user/kubernetes/applications
- Portainer manifest deployment docs: https://docs.portainer.io/sts/user/kubernetes/applications/manifest/create
- Portainer application editing docs: https://docs.portainer.io/sts/user/kubernetes/applications/edit
- Kubernetes StatefulSet concepts: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes headless Service docs: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- Kubernetes task docs for scaling StatefulSets: https://kubernetes.io/docs/tasks/run-application/scale-stateful-set/
- Kubernetes Secret docs: https://kubernetes.io/docs/concepts/configuration/secret/
- Docker Official Image docs for `postgres`: https://hub.docker.com/_/postgres/
- PostgreSQL versioning policy: https://www.postgresql.org/support/versioning/

## Issues Found
- The Portainer deployment path was outdated. The post said to use `Applications -> Add application -> Advanced mode`, but current Portainer docs use `Applications -> Create from code -> Manifest` with the Web editor for manifest deployment. I corrected the UI instructions.
- The StatefulSet manifest referenced `postgres-secret`, but the post never created that Secret. I added a Secret manifest so `POSTGRES_PASSWORD` resolves correctly.
- The storage example implied the claim would always provision successfully. I added a short note that the example assumes a default `StorageClass` or a matching pre-provisioned `PersistentVolume`, which is what Kubernetes requires for `volumeClaimTemplates` to work.
- The DNS example assumed every cluster uses the default `cluster.local` domain and that the record exists before the headless Service is created. I qualified that wording.
- The Portainer scaling instructions were outdated. I updated them to the current `Applications -> select the application -> Edit this application` flow and aligned the `kubectl scale` example with the official StatefulSet docs.

## Review Notes
- `postgres:15-alpine` is still a supported PostgreSQL major version as of May 1, 2026, but PostgreSQL 18 is the latest major release.
- The example uses `ReadWriteOnce`, which is valid. Current Kubernetes StatefulSet docs note that `ReadWriteOncePod` is recommended for some production scenarios.
