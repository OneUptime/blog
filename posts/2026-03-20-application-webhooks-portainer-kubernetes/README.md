# How to Set Up Application Webhooks in Portainer for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Webhook, CI/CD, Automation

Description: Learn how to configure application webhooks in Portainer to trigger automated redeployments when a new container image is pushed.

## What Are Application Webhooks?

Portainer can expose a webhook URL for a Kubernetes application deployed from a Git repository. When an external system (like a CI/CD pipeline) calls this URL, Portainer triggers a GitOps update for the application. If **Always apply manifest** is enabled, Portainer reapplies the manifest even when the repository content has not changed. This enables automated updates without direct Portainer API access. For Kubernetes applications, this feature is available in Portainer Business Edition and only on non-Edge environments.

## Enabling a Webhook in Portainer

1. Select your Kubernetes environment.
2. Go to **Applications** and open an application deployed from a Git repository.
3. Click **Edit this application**.
4. In the **GitOps updates** section, enable GitOps updates if needed and select **Webhook** as the mechanism.
5. Optional: enable **Always apply manifest** if you want the webhook to reapply the manifest even when the Git repository has not changed.
6. Copy the generated webhook URL.

The URL looks like:
```text
https://portainer.mycompany.com/api/stacks/webhooks/abc123def456
```

## Triggering the Webhook

Call the webhook URL with an HTTP POST request to trigger a GitOps update:

```bash
# Trigger a GitOps update via curl

curl -X POST \
  "https://portainer.mycompany.com/api/stacks/webhooks/abc123def456"

# Trigger a rolling restart for all deployments in the application
curl -X POST \
  "https://portainer.mycompany.com/api/stacks/webhooks/abc123def456?rollout-restart=all"
```

## Integrating with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Build and Trigger Portainer Update

on:
  push:
    branches: [main]

jobs:
  sync_portainer:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Log in to container registry
        uses: docker/login-action@v4
        with:
          registry: registry.mycompany.com
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v7
        with:
          context: .
          push: true
          tags: registry.mycompany.com/my-app:${{ github.sha }}

      - name: Trigger Portainer GitOps update
        run: |
          # Assumes the Portainer application is Git-deployed and configured for webhook updates.
          curl -X POST \
            "${{ secrets.PORTAINER_WEBHOOK_URL }}"
```

## Integrating with GitLab CI

```yaml
# .gitlab-ci.yml
sync_portainer:
  stage: deploy
  script:
    - |
      curl -X POST \
        "${PORTAINER_WEBHOOK_URL}"
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
```

## Webhook Security

Webhook URLs are long random tokens. Additionally:

- Serve Portainer over HTTPS so the webhook URL is not exposed in transit.
- Store the webhook URL in your CI/CD platform's secret store rather than committing it to your repository.
- Kubernetes application webhooks are only available in Portainer Business Edition on non-Edge environments.

```bash
# Test that the webhook is reachable
curl -i -X POST "https://portainer.mycompany.com/api/stacks/webhooks/your-token"
# Check for an HTTP success status, then confirm the update or rolling restart in Portainer
```

## Conclusion

Application webhooks in Portainer provide a simple trigger point for CI/CD pipelines managing Git-deployed Kubernetes applications. They are most useful for kicking off Portainer GitOps updates or rolling restarts without giving the pipeline direct Portainer API credentials.
