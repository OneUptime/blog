# Validation Summary: How to Configure Docker Hub Integration in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Docker Hub
- RKE2
- Fleet
- `kubectl`

## Sources Consulted
- Rancher Manager docs, Kubernetes Registry and Container Image Registry: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/kubernetes-resources-setup/kubernetes-and-docker-registries
- Docker Docs, Access tokens: https://docs.docker.com/docker-hub/access-tokens/
- Docker Docs, Docker Hub pull usage and limits: https://docs.docker.com/docker-hub/usage/pulls/
- Docker Docs, Mirror the Docker Hub library: https://docs.docker.com/docker-hub/image-library/mirror/
- Kubernetes docs, `kubectl create secret docker-registry`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes docs, Images: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes docs, Configure Service Accounts for Pods: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- RKE2 docs, Private Registry Configuration: https://docs.rke2.io/install/private_registry
- Fleet docs, `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Google Cloud docs, Pull cached Docker Hub images: https://cloud.google.com/artifact-registry/docs/pull-cached-dockerhub-images

## Issues Found
- The Docker Hub personal access token instructions used an outdated UI path. I updated the steps to the current Docker Hub flow: `Account Settings` > `Personal access tokens` > `Generate new token`, and added the expiration-date selection that now appears in the official workflow.
- The Rancher UI instructions used an inaccurate navigation path (`Secrets` > `Registry Credentials` > `Add Registry`). I corrected this to the documented flow through `Cluster Management` > cluster `Explore` > `Storage > Secrets` (or `More Resources > Core > Secrets`) > `Create` > `Registry`, and added the namespace selection that is required when creating the secret.
- The secret verification example omitted the namespace even though the secret is created in `default`. I added `--namespace=default` so the verification command matches the example setup exactly.
- The RKE2 `registries.yaml` example used the wrong key name (`endpoints` instead of `endpoint`) and mixed `mirror.gcr.io` with Docker Hub authentication in a way that does not match the documented RKE2 and Docker mirror patterns. I replaced it with a generic, documented pull-through-cache example and clarified the service restart commands for server versus agent nodes.
- The Docker Hub pull-rate monitoring example used an undocumented token request flow (`POST` JSON to `auth.docker.io/token`). I replaced it with Docker's documented `curl --user 'username:password' ...` pattern, using a Docker Hub PAT in place of the password.
- The Fleet example implied that `imagePullSecrets` is a generic Fleet field. I clarified that the example works by passing Helm values through Fleet, and only applies when the target chart supports an `imagePullSecrets` value.

## Review Notes
- The Kubernetes `docker-registry` secret command and `imagePullSecrets` usage are still valid and non-deprecated as of the documentation reviewed on 2026-04-23.
- Rancher UI labels can vary slightly by Rancher version, but the corrected navigation matches current Rancher documentation and avoids the inaccurate `Registry Credentials` wording from the original post.
- The Fleet snippet remains intentionally chart-specific; different charts may expect `imagePullSecrets` in slightly different value shapes.
