# Validation Summary: How to Migrate from Docker Swarm Stacks to Kubernetes Deployments

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Docker Swarm stacks
- Docker Compose stack files
- Kubernetes Deployments, DaemonSets, Services, Ingress, ConfigMaps, and Secrets
- Helm charts and templates
- External Secrets Operator
- kubectl
- Pluto deprecated API detection

## Sources Consulted
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose secrets reference: https://docs.docker.com/reference/compose-file/secrets/
- Docker Swarm configs documentation: https://docs.docker.com/engine/swarm/configs/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes recommended labels: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- Helm create command documentation: https://helm.sh/docs/helm/helm_create/
- Helm using Helm documentation: https://helm.sh/docs/v3/intro/using_helm/
- Helm chart label best practices: https://helm.sh/docs/chart_best_practices/labels/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/v2.0.0/api/externalsecret/
- Pluto documentation: https://pluto.docs.fairwinds.com/quickstart/

## Issues Found
- The API Deployment converted Swarm's `DATABASE_URL_FILE=/run/secrets/db_url` into a direct `DATABASE_URL` environment variable from `secretKeyRef`. Updated the Kubernetes example to preserve the file-based secret behavior by mounting the Secret key with `subPath` and setting `DATABASE_URL_FILE`.
- The ExternalSecret example used `external-secrets.io/v1beta1`. Updated it to `external-secrets.io/v1`, which is the current GA API shown in External Secrets Operator documentation.
- The migration script checked rollout status with `app.kubernetes.io/instance`, but the chart examples used `app` labels and did not define that Helm instance label. Updated the rollout checks to target `deployment/web` and `deployment/api` directly.
- The smoke test ran `curl` inside the nginx container and checked `/health`, but the nginx image does not guarantee curl is installed or a `/health` endpoint exists. Updated it to run a temporary `curlimages/curl` pod and test the web Service root path.
- The placement constraint Deployment example omitted the required `spec.selector` and matching Pod template labels for `apps/v1`. Added the required selector and labels.
- The Pluto validation command used a single-file flag not shown in the current quickstart. Updated the example to place the rendered manifest in a directory and run `pluto detect-files -d rendered`.

## Review Notes
- `kubectl top pods` requires metrics-server or another metrics API implementation to be installed in the cluster.
- `node-role.kubernetes.io/worker: "true"` only works if worker nodes carry that exact label and value; many clusters use role labels with an empty value or custom labels.
- The examples assume External Secrets Operator and a matching `SecretStore` named `vault-backend` are installed before applying the ExternalSecret.
