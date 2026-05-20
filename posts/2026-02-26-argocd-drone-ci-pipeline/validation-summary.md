# Validation Summary: How to Create a Complete Drone CI + ArgoCD Pipeline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Drone CI
- Drone Kubernetes runner
- Drone Docker and Slack plugins
- Argo CD
- Kubernetes
- Kustomize
- Trivy
- GitHub Container Registry

## Sources Consulted
- Drone Kubernetes pipeline overview and syntax: https://docs.drone.io/pipeline/kubernetes/overview/
- Drone Kubernetes runner installation and configuration reference: https://docs.drone.io/runner/kubernetes/installation/
- Drone Kubernetes pipeline failure and privileged step syntax: https://docs.drone.io/yaml/kubernetes/
- Drone Docker plugin documentation: https://docs.drone.io/plugins/popular/docker/
- Drone secrets documentation: https://docs.drone.io/secret/repository/
- Drone organization secrets documentation: https://docs.drone.io/secret/organization/
- Drone Kubernetes Secrets extension documentation: https://docs.drone.io/secret/external/kubernetes/
- Drone CLI secret add documentation: https://docs.drone.io/cli/secret/drone-secret-add/
- Drone CLI orgsecret add documentation: https://docs.drone.io/cli/orgsecret/drone-orgsecret-add/
- Drone promotions documentation: https://docs.drone.io/promote/
- Drone substitution documentation: https://docs.drone.io/pipeline/environment/substitution/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD CLI app wait documentation: https://argo-cd.readthedocs.io/en/release-2.6/user-guide/commands/argocd_app_wait/
- Argo CD official GitHub releases: https://github.com/argoproj/argo-cd/releases
- Trivy filesystem scan CLI reference: https://trivy.dev/latest/docs/references/configuration/cli/trivy_filesystem/
- Kubernetes Kustomize overview: https://kustomize.io/

## Issues Found
- The `plugins/docker` steps were shown in Kubernetes pipelines without `privileged: true`. The Drone Docker plugin uses Docker-in-Docker, and Drone's Kubernetes pipeline syntax supports privileged steps for this use case. Added `privileged: true` to both Docker build steps.
- The multi-environment examples edited `apps/api-service/overlays/*/kustomization.yaml` by replacing an `image:` line. Kustomize image overrides are normally represented with `newTag`, so the command would not update a typical `kustomization.yaml`. Changed the `sed` commands to update `newTag`.
- The secrets section said Drone secrets integrate with Kubernetes secrets, but the commands shown create Drone repository and organization secrets. Kubernetes-backed secrets require the Kubernetes Secrets extension. Updated the wording to describe repository and organization secrets accurately.
- The Argo CD trigger section described an ArgoCD Drone plugin while the snippet actually runs the Argo CD CLI container. Renamed the section and text to reflect the CLI-based approach.
- The Argo CD CLI image used `argoproj/argocd:v2.10.0`, which is outdated relative to the current supported Argo CD releases. Updated it to `argoproj/argocd:v3.4.2`, the latest official release available during validation.

## Review Notes
Drone's Kubernetes runner is documented as beta/community-supported and Kubernetes pipelines are self-hosted only. The post's examples are otherwise plausible for a self-hosted Drone installation, but a production version should also include the Service, Ingress, RBAC, PVC, and namespace manifests that are implied by the snippets.
