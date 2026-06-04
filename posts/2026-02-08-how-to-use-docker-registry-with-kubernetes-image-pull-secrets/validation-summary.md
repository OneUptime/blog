# Validation Summary: How to Use Docker Registry with Kubernetes Image Pull Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Docker registry authentication
- Kubernetes Secrets
- Kubernetes ServiceAccounts
- Kubernetes CronJobs
- Amazon ECR
- Google Container Registry
- Google Artifact Registry
- GitHub Container Registry
- EmberStack Reflector

## Sources Consulted
- Kubernetes documentation: Pull an Image from a Private Registry - https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes kubectl reference: create secret docker-registry - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes documentation: Configure Service Accounts for Pods - https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes API reference: CronJob batch/v1 - https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes documentation: RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- AWS CLI documentation: ecr get-login-password - https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Google Cloud documentation: Artifact Registry access control and imagePullSecret configuration - https://docs.cloud.google.com/artifact-registry/docs/access-control
- GitHub documentation: Working with the Container registry - https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- EmberStack Reflector README - https://github.com/emberstack/kubernetes-reflector
- Docker CLI documentation: docker login - https://docs.docker.com/reference/cli/docker/login/

## Issues Found
- The Google registry example combined GCR and Artifact Registry while using only `gcr.io`. Updated it to use `https://gcr.io` for GCR and added a separate Artifact Registry example using a regional Artifact Registry host such as `https://us-docker.pkg.dev`, matching Google Cloud's documented format.
- The namespace-copy command used `sed` to rewrite the namespace on exported YAML. Exported Kubernetes objects include server-managed metadata that should not be reapplied into another namespace. Replaced it with a JSON pipeline that removes namespace, resource version, UID, creation timestamp, and managed fields before applying to the target namespace.
- The ECR token refresh CronJob used `amazon/aws-cli:latest` but then ran `kubectl`, which that image does not provide. Updated the text to state that the image must include both AWS CLI and `kubectl`, and changed the example image to a placeholder combined-tooling image.
- The ECR token refresh CronJob referenced `serviceAccountName: ecr-refresher` without defining the ServiceAccount or Kubernetes RBAC needed to update Secrets. Added a ServiceAccount, Role, and RoleBinding with limited secret update permissions.
- The ECR token refresh command deleted and recreated the pull secret, briefly making the secret unavailable. Changed it to generate the secret manifest with `--dry-run=client -o yaml` and apply it in place.

## Review Notes
The remaining examples align with current Kubernetes documentation for `kubernetes.io/dockerconfigjson`, pod and service-account `imagePullSecrets`, and `kubectl create secret docker-registry`. The ECR CronJob remains an implementation pattern that requires cluster-specific AWS identity configuration.
