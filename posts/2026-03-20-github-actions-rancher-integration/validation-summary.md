# Validation Summary: How to Integrate GitHub Actions with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- GitHub Actions
- GitHub Container Registry (GHCR)
- Rancher
- Kubernetes
- `kubectl`
- Docker image build and push workflows

## Sources Consulted
- Kubernetes: Managing Service Accounts - https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes: `kubectl config view` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/
- Kubernetes: `kubectl set image` reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/
- Kubernetes: `kubectl wait` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Rancher: JWT Authentication - https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/jwt-authentication
- GitHub Docs: Publishing Docker images - https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
- Docker `login-action` README - https://github.com/docker/login-action
- Docker `build-push-action` README - https://github.com/docker/build-push-action
- Azure `setup-kubectl` README - https://github.com/Azure/setup-kubectl

## Issues Found
- The Rancher prerequisite was too broad. The post said Rancher `v2.7+`, but Rancher documents downstream service account JWT authentication through the Rancher auth proxy starting in Rancher `v2.9.0`. I updated the prerequisite to `v2.9+`.
- The kubeconfig example disabled TLS verification with `insecure-skip-tls-verify: true`. I changed it to carry forward `certificate-authority-data` from the current kubeconfig using `kubectl config view --raw --flatten --minify`, which matches Kubernetes kubeconfig guidance and avoids an insecure client config.
- The token extraction step could race before the controller populated the manually created service account token Secret. I added a small wait loop before decoding the token.
- The base64 encoding example used GNU `base64 -w 0`, which is not portable across common developer environments. I changed it to `base64 | tr -d '\n'`.
- The GitHub Actions workflow pushed to GHCR using `GITHUB_TOKEN` but did not grant `packages: write`. I added the required job permissions.
- The secrets section listed `REGISTRY_USERNAME` and `REGISTRY_PASSWORD`, but the workflow did not use them. I removed those instructions and clarified that GHCR authentication uses the repository `GITHUB_TOKEN`.
- The workflow description said it "deploys" to the cluster, but the snippet only updates an existing Deployment. I corrected the wording to reflect that behavior.
- The `kubectl set image` example used `app=` as the container name without any matching definition elsewhere in the post. I changed it to `my-app=` to keep the placeholder consistent with the Deployment name and added a note that the container name must match the Deployment spec.
- The action versions in the workflow were behind the current documented examples. I updated them to current major versions shown by the official docs and READMEs: `actions/checkout@v6`, `docker/login-action@v4`, `docker/build-push-action@v7`, and `azure/setup-kubectl@v4`.

## Review Notes
- The post now reflects a working pattern for storing a kubeconfig secret in GitHub Actions, but Kubernetes still recommends short-lived tokens from the TokenRequest API over long-lived service account token Secrets when possible.
- The deployment and smoke-test snippets still assume an existing `deployment/my-app` and a matching `app=my-app` label selector. That is acceptable for an example, but readers still need a pre-existing Deployment manifest that matches those placeholders.
