# Validation Summary: How to Deploy Apache Airflow with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Airflow
- Apache Airflow Helm chart
- Flux CD HelmRelease and Kustomization
- Kubernetes manifests and Ingress
- Kustomize
- GitOps
- git-sync
- PostgreSQL
- Docker

## Sources Consulted
- Apache Airflow Helm chart stable documentation: https://airflow.apache.org/docs/helm-chart/stable/
- Apache Airflow Helm chart parameters reference: https://airflow.apache.org/docs/helm-chart/stable/parameters-ref.html
- Apache Airflow Helm chart production guide: https://airflow.apache.org/docs/helm-chart/stable/production-guide.html
- Apache Airflow installation constraints documentation: https://airflow.apache.org/docs/apache-airflow/2.11.0/installation/installing-from-pypi.html
- Apache Airflow provider package reference: https://airflow.apache.org/docs/apache-airflow-providers/packages-ref.html
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- GitHub SSH host key fingerprints: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The prerequisite Kubernetes version was outdated for the current stable Apache Airflow Helm chart. Updated the requirement from Kubernetes v1.25+ to v1.30+.
- The chart version used a broad `1.x` selector and the Airflow image used an older unsupported `2.8.1` tag. Pinned the Helm chart to `1.21.0` and updated the deployment to Airflow `2.11.2`, which is within the stable chart's supported Airflow range.
- The default user configuration was under `webserver.defaultUser`; the current chart documents default user creation under `createUserJob.defaultUser`. Moved the default user settings under `createUserJob`.
- The release configured an external metadata database but did not disable the chart's bundled PostgreSQL dependency. Added `postgresql.enabled: false`.
- The git-sync interval used `wait`, which is not the current chart parameter. Replaced it with `period: 60s`.
- The SSH git-sync example omitted `knownHosts`, which the Airflow production guide recommends when using `dags.gitSync.sshKeySecret`. Added GitHub's published `ssh-ed25519` host key.
- The connections Secret was not mounted or imported by the Airflow pods. Added `extraEnvFrom` to load `airflow-connections` into the Airflow containers.
- The extra Python package example created an unused ConfigMap. Replaced it with a custom Airflow Docker image using the matching Airflow constraints file.
- The repository structure referenced `dag-sync-config.yaml`, which was not used, and omitted files used later. Updated the structure to include `ingress.yaml`, `connections.yaml`, and the Flux Kustomization location.
- The post placed a Flux `Kustomization` CR at the same `kustomization.yaml` path that Flux would build as a Kustomize directory. Added a normal `kustomize.config.k8s.io/v1beta1` Kustomization for the Airflow directory and moved the Flux CR example to `clusters/production/airflow-kustomization.yaml`.

## Review Notes
The Flux and Kubernetes API versions used in the corrected snippets are current. `kubectl` and `flux` were not installed in the local environment, so CLI commands were checked against official documentation rather than local `--help` output.
