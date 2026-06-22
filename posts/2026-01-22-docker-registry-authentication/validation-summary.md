# Validation Summary: How to Set Up Docker Registry Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI and Docker credential helpers
- Docker Hub authentication
- GitHub Container Registry
- Amazon Elastic Container Registry
- Google Container Registry and Google Artifact Registry
- Azure Container Registry
- CNCF Distribution registry
- Kubernetes image pull secrets

## Sources Consulted
- Docker CLI `docker login` reference: https://docs.docker.com/reference/cli/docker/login/
- Docker credential helpers releases: https://github.com/docker/docker-credential-helpers/releases
- Amazon ECR private registry authentication: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Amazon ECR Docker Credential Helper README: https://github.com/awslabs/amazon-ecr-credential-helper
- GitHub Container Registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Google Artifact Registry Docker authentication: https://docs.cloud.google.com/artifact-registry/docs/docker/authentication
- Azure Container Registry service principal authentication: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal
- CNCF Distribution registry deployment documentation: https://distribution.github.io/distribution/about/deploying/
- Kubernetes private registry image pull secrets: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/

## Issues Found
- The ECR and GCR Docker configuration snippets included `// ~/.docker/config.json` inside `json` code fences, which is not valid JSON. Moved those labels outside the code blocks.
- The Azure section described `az acr credential show` as retrieving service principal credentials. That command retrieves registry admin credentials when the admin user is enabled, so the comment was corrected.
- The self-hosted registry login example used `docker login -p`, contradicting the article's earlier guidance and Docker's recommendation to use standard input for secrets. Changed it to `--password-stdin`.
- The self-signed certificate example only set the Common Name. Added a `subjectAltName` extension so modern TLS clients can validate the hostname.
- One ECR registry placeholder used an invalid short AWS account ID. Changed it to the standard 12-digit placeholder used elsewhere in the post.
- The Linux credential helper install example pinned Docker credential helper version `0.8.0`; the current release checked during review is `0.9.8`, so the version was updated.

## Review Notes
- The self-hosted registry basic-auth section is suitable as a local testing example because it uses `localhost`, but production use should keep TLS enabled as the post already states.
- GitHub's current documentation recommends using `GITHUB_TOKEN` in Actions for GHCR when possible; the workflow example follows that guidance.
