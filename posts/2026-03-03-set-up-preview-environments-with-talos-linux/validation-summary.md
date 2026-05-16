# Validation Summary: How to Set Up Preview Environments with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- GitHub Actions
- GitHub Container Registry
- Docker
- Cloudflare Tunnel
- Tailscale Funnel
- PostgreSQL

## Sources Consulted
- Talos Linux talosctl installation documentation: https://www.talos.dev/latest/talos-guides/install/talosctl/
- Talos Linux quickstart for local Docker clusters: https://www.talos.dev/docs/latest/introduction/quickstart/
- Talos Linux CLI reference for `talosctl cluster create`, `cluster show`, `cluster destroy`, and `kubeconfig`: https://www.talos.dev/docs/latest/reference/cli/
- GitHub Actions pull request event documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- GitHub Actions workflow permissions documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- GitHub Container Registry documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Docker login action documentation: https://github.com/docker/login-action
- Kubernetes Service documentation for NodePort: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Cloudflare Tunnel Kubernetes deployment documentation: https://developers.cloudflare.com/tunnel/deployment-guides/kubernetes/
- Tailscale Funnel documentation: https://tailscale.com/docs/features/tailscale-funnel
- Tailscale Funnel CLI reference: https://tailscale.com/docs/reference/tailscale-cli/funnel

## Issues Found
- The main GitHub Actions workflow used `ubuntu-latest`, but Talos Docker provider clusters are local to the runner's Docker host. This would make create/update/destroy lifecycle unreliable across separate GitHub-hosted runner jobs. Changed the workflow and cleanup examples to use a dedicated self-hosted Linux runner label and added a note explaining the assumption.
- The deployment built `myapp:pr-...` only in the runner's local Docker daemon. Kubernetes nodes in the Talos Docker cluster would not automatically be able to pull that image. Updated the workflow to log in to GHCR, build and push the image, create an image pull secret, and deploy the pushed image reference.
- The workflow posted PR comments and pushed packages without declaring `GITHUB_TOKEN` permissions. Added `contents: read`, `packages: write`, and `issues: write`.
- The Tailscale Funnel example ran `tailscale funnel 80`, which exposes a local port in the Tailscale pod rather than the Kubernetes Service. Updated it to proxy to `http://myapp:80` with current Funnel flags.
- The preview-count shell snippet used `grep -c ... || echo "0"`, which can produce `0` twice when there are no matches. Changed it to `grep -c ... || true`.

## Review Notes
The examples are technically valid as a same-repository PR workflow on a dedicated self-hosted Docker runner. Forked PRs need additional security design because GitHub restricts write tokens and secrets for untrusted pull requests.
