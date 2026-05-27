# Validation Summary: How to Use Migrate to Containers to Convert VMs to GKE Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Migrate to Containers
- GKE
- Kubernetes Deployments and Services
- Dockerfiles
- Skaffold
- Google Cloud CLI

## Sources Consulted
- Google Cloud Migrate to Containers overview: https://cloud.google.com/migrate/containers/docs
- Migrate to Containers CLI installation and prerequisites: https://cloud.google.com/migrate/containers/docs/getting-started
- Migrate to Containers copy phase documentation: https://cloud.google.com/migrate/containers/docs/m2c-cli/copy-the-filesystem
- Migrate to Containers analysis and migration plan documentation: https://cloud.google.com/migrate/containers/docs/m2c-cli/create-a-migration-plan
- Migrate to Containers artifact generation and deployment documentation: https://cloud.google.com/migrate/containers/docs/m2c-cli/execute-migration
- GKE cluster creation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/creating-a-zonal-cluster
- Skaffold CLI documentation: https://skaffold.dev/docs/references/cli/
- Kubernetes Deployment, Service, probes, and resource management documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/, https://kubernetes.io/docs/concepts/services-networking/service/, https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/, https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found
- The original post used the older `migctl` workflow (`migctl setup install`, `migctl source create`, `migctl migration create`, `migctl migration generate-artifacts`). Current Google Cloud documentation uses the standalone `m2c` CLI workflow. Replaced these commands with `m2c copy`, `m2c analyze`, and `m2c generate`.
- The original post described installing Migrate to Containers into a GKE processing cluster and specified a minimum processing cluster size. Current documentation runs the M2C CLI locally and uses GKE as the deployment target. Updated the prerequisites and setup section accordingly.
- The original post listed AWS as a first-class `migctl source create aws` source. Current CLI documentation supports copying from Compute Engine with `m2c copy gcloud` and from other reachable machines with `m2c copy ssh`. Replaced the AWS source command with the documented SSH copy workflow.
- The original post used an `--intent` migration option with `Image`, `ImageAndData`, and `Data`. This does not match the current M2C CLI. Replaced it with the documented `--plugin` selection used by `m2c analyze`.
- The original migration plan example used a CRD-style `LinuxMigrationPlan` with fields that do not match the current `config.yaml` format. Replaced it with a plan fragment using current concepts such as `filters`, `systemServices`, `endpoints`, `nfsMounts`, and `deployment.logPaths`.
- The original post stated that artifact generation creates and pushes the container image. Current documentation separates artifact generation from build/deploy. Updated the text to say `m2c generate` produces Dockerfiles, Kubernetes YAML, and Skaffold configuration, then added `skaffold run` as the build, push, and deploy step.
- The original post implied Windows VM support was outside M2C. Current documentation includes Windows IIS migration support through a separate workflow. Updated the limitation note to reflect that Windows IIS migrations are supported but handled differently.

## Review Notes
The Kubernetes Deployment, Service, ConfigMap, probes, and resource examples are valid examples, but the generated M2C output can vary by workload and plugin. The post now labels generated YAML examples as representative and expects production edits before deployment.
