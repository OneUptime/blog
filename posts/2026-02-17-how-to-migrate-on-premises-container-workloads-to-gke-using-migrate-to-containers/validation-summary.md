# Validation Summary: How to Migrate On-Premises Container Workloads to GKE

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Migrate to Containers
- Migrate to Containers CLI (`m2c`)
- Google Kubernetes Engine (GKE)
- Kubernetes Deployments, CronJobs, PersistentVolumeClaims
- GKE Filestore CSI driver
- Skaffold
- Docker

## Sources Consulted
- Google Cloud Migrate to Containers documentation: https://docs.cloud.google.com/migrate/containers/docs
- Google Cloud Migrate to Containers overview: https://docs.cloud.google.com/migrate/containers/docs/getting-started
- Google Cloud Migrate to Containers CLI reference for Linux: https://docs.cloud.google.com/migrate/containers/docs/m2c-cli-reference-linux
- Google Cloud quickstart, migrate a Linux VM using Migrate to Containers CLI: https://docs.cloud.google.com/migrate/containers/docs/migrate-vm
- Google Cloud Migrate to Containers release notes: https://docs.cloud.google.com/migrate/containers/docs/release-notes
- Google Cloud SDK reference for `gcloud container clusters create`: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/create
- GKE Filestore CSI driver documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/filestore-csi-driver
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The post used the older `migctl` processing-cluster workflow. Google Cloud release notes state that the Migrate to Containers UI, `migctl`, and the processing-cluster CRDs are no longer available as of Migrate to Containers 1.15.0. I replaced those commands with the current local `m2c` CLI workflow: `m2c copy`, `m2c analyze`, and `m2c generate`.
- The source setup examples listed AWS and Azure sources and used `migctl source create` commands. Current Migrate to Containers documentation describes VMware and Compute Engine VM support, plus local copy flows using `m2c copy gcloud` and `m2c copy ssh`. I removed the AWS/Azure `migctl` examples and replaced them with SSH and Compute Engine copy examples.
- The assessment section used non-current `migctl assessment` commands. I replaced that with `m2c analyze` for creating the migration plan and noted Migration Center discovery tools for broader fit assessment.
- The migration plan example used an outdated `MigrationPlan` CRD shape. I replaced it with a `config.yaml`-based example consistent with the current `m2c analyze` and `m2c generate` workflow.
- The deployment step used `kubectl apply` against separate generated manifest paths that are not the current quickstart flow. I updated it to connect to GKE and deploy with `skaffold run -d`, which is the documented Migrate to Containers quickstart deployment path.
- The PersistentVolumeClaim example used `storageClassName: filestore-standard`, which is not a current pre-installed GKE Filestore CSI StorageClass name. I changed it to `enterprise-rwx`, one of the documented GKE Filestore CSI StorageClasses.
- Image references used a `:v1` tag that was not tied to the generated Migrate to Containers/Skaffold flow. I normalized them to `gcr.io/my-project/my-app-migration`.

## Review Notes
The generated `config.yaml` structure can vary by Migrate to Containers plugin and workload type, so the examples should be treated as illustrative areas to review rather than a complete schema. The post is now technically aligned with the current Google Cloud documentation, but real migrations still require environment-specific validation of services, ports, health checks, storage, networking, and generated artifacts.
