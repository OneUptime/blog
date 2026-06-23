# Validation Summary: How to Set Up Preview Deployments in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (workflows, triggers, jobs, permissions)
- `actions/github-script` and the Octokit REST API (issues comments, Deployments API)
- Vercel CLI (`vercel pull`, `vercel build`, `vercel deploy --prebuilt`)
- Kubernetes (Deployment, Service, Ingress, namespaces, `kubectl`)
- Docker / Docker Buildx / GitHub Container Registry (ghcr.io)
- Docker Compose (deploy over SSH)
- Playwright (E2E testing)
- cert-manager / NGINX Ingress

## Sources Consulted
- GitHub Actions — passing values between steps / environment files (`$GITHUB_ENV`, `$GITHUB_OUTPUT`): https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- GitHub Actions events (`pull_request`, `pull_request_target`): https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows
- actions/checkout, actions/setup-node, actions/github-script, actions/upload-artifact (current major versions v4/v4/v7/v4): https://github.com/actions
- docker/build-push-action@v6, docker/login-action@v3, docker/setup-buildx-action@v3: https://github.com/docker
- Azure/setup-kubectl: https://github.com/Azure/setup-kubectl
- Vercel CLI docs (pull/build/deploy --prebuilt): https://vercel.com/docs/cli
- Octokit REST — repos.createDeployment / createDeploymentStatus: https://octokit.github.io/rest.js/
- appleboy/ssh-action: https://github.com/appleboy/ssh-action
- Playwright CI / install docs: https://playwright.dev/docs/ci

## Issues Found
- **`export KUBECONFIG=kubeconfig` does not persist across steps.** In the Kubernetes example, both the deploy job and the cleanup job set `KUBECONFIG` via `export` in a "Configure kubeconfig" step. Because each GitHub Actions `run` step executes in a separate shell process, an exported variable is not visible to later steps. As written, the subsequent `kubectl` steps ("Deploy to Kubernetes", "Wait for deployment", "Delete preview namespace") would not have `KUBECONFIG` set and would fall back to the default config. Fixed by writing the path to the `$GITHUB_ENV` environment file instead: `echo "KUBECONFIG=$PWD/kubeconfig" >> $GITHUB_ENV`, which is the documented mechanism for sharing environment variables between steps. Applied to both occurrences.

## Review Notes
- All GitHub Actions and Docker action versions referenced are current and non-deprecated (checkout@v4, setup-node@v4, github-script@v7, upload-artifact@v4, build-push-action@v6, login-action@v3, setup-buildx-action@v3, ssh-action@v1).
- `azure/setup-kubectl@v3` is valid and functional; a newer `@v4` exists but v3 is not deprecated, so this was left unchanged.
- The Kubernetes example correctly splits triggers: `pull_request` for deploys and `pull_request_target` for the `closed`/cleanup event. The cleanup job does not check out PR code, so using `pull_request_target` here does not introduce the usual untrusted-code security risk.
- The Vercel example relies on `vercel deploy --prebuilt` printing the deployment URL to stdout, which is its standard non-interactive behavior; `deploy` defaults to a preview (non-production) deployment, matching the post's intent.
- Tags list Netlify, and the conclusion mentions starting with Netlify, but no Netlify-specific example is provided. This is a minor content gap, not a technical error, so it was left as-is.
- The E2E readiness check `curl ... | grep -q "200"` works but is a loose match (any "200" substring in headers/body). Acceptable for a tutorial illustration.
