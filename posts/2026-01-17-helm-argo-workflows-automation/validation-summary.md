# Validation Summary: Automating Helm Workflows with Argo Workflows

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Helm
- Kubernetes
- Argo Workflows
- Argo WorkflowTemplate
- Argo CronWorkflow
- Argo WorkflowEventBinding
- OCI Helm chart registries
- Prometheus ServiceMonitor
- Alpine Linux containers

## Sources Consulted
- Argo Workflows installation documentation: https://argo-workflows.readthedocs.io/en/latest/installation/
- Argo Workflows CLI documentation: https://argo-workflows.readthedocs.io/en/latest/walk-through/argo-cli/
- Argo Workflows releases: https://github.com/argoproj/argo-workflows/releases
- Argo Workflows events documentation: https://argo-workflows.readthedocs.io/en/latest/events/
- Argo Workflows CronWorkflow documentation: https://argo-workflows.readthedocs.io/en/latest/cron-workflows/
- Argo Workflows field reference: https://argo-workflows.readthedocs.io/en/latest/fields/
- Argo Workflows metrics documentation: https://argo-workflows.readthedocs.io/en/latest/metrics/
- Argo Helm chart repository documentation: https://argoproj.github.io/argo-helm/
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/
- Helm upgrade command documentation: https://helm.sh/docs/helm/helm_upgrade/
- Alpine Helm image Dockerfile: https://github.com/alpine-docker/helm/blob/master/Dockerfile

## Issues Found
- The Linux Argo CLI install command was pinned to `v3.5.0`, which is outdated. Updated the download URL to `v4.0.6`, matching the current Argo Workflows release instructions checked during review.
- The Helm test workflow used `helm plugin install`, `wget`, and `tar` without ensuring the required tools were available in the runtime container. Added an `apk add --no-cache git wget tar gzip` step before those commands.
- The CI/CD template mixed a shared PVC workspace with Argo artifact input/output declarations using a glob path. Since the chart package is already passed through the PVC, removed the unnecessary artifact declarations.
- The environment promotion workflow cloned a Git repository from an `alpine/helm` container without installing Git in the step. Added `apk add --no-cache git`.
- The canary evaluation step used the `curlimages/curl` image while also requiring `jq` and `bc`. Changed the image to `alpine:3.20` and installed `curl jq bc` before the Prometheus query.
- The CronWorkflow examples used `jq` and `aws` commands without installing them. Added `apk add --no-cache jq` where JSON parsing is required and `apk add --no-cache jq aws-cli` before the S3 backup command.
- The CronWorkflow repository update task ran `helm repo update` in a fresh container without first adding a repository. Added the Bitnami Helm repository before update, and repeated that setup in steps that perform `helm search repo`.

## Review Notes
- The YAML snippets were extracted and parsed successfully after the fixes.
- The examples still assume the reader supplies Kubernetes RBAC, the `kubeconfig-secret`, registry credentials, S3 credentials, and chart-specific canary values/templates. Those are deployment prerequisites rather than syntax errors.
