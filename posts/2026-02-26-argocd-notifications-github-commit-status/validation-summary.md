# Validation Summary: How to Send ArgoCD Notifications to GitHub Commit Status

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD Notifications
- Kubernetes ConfigMaps and Secrets
- GitHub Commit Status API
- GitHub Apps
- GitHub personal access tokens
- GitHub branch protection

## Sources Consulted
- Argo CD Notifications GitHub service documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/github/
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications service overview and custom service naming: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD Notifications subscription documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD Notifications template functions documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/functions/
- GitHub REST API commit statuses documentation: https://docs.github.com/rest/commits/statuses
- Kubernetes kubectl create secret documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The first `service.github` example used `appID: 0`, `installationID: 0`, and an empty private key. Argo CD's GitHub notification service requires a real GitHub App ID, installation ID, and private key reference, so the example now uses placeholders and `$github-app-private-key`.
- The GitHub App private key storage command embedded raw PEM file contents inside JSON for `kubectl patch`, which can break because PEM files contain newlines. Replaced it with `kubectl create secret generic --from-file --dry-run=client -o yaml | kubectl apply -f -`.
- The GitHub App template names did not match the trigger `send` entries, so those triggers would not send the GitHub App templates. Renamed the GitHub App templates to `github-commit-status-*` and added the missing degraded template.
- The application subscription commands claimed to subscribe to all status triggers but omitted the degraded-health trigger. Added the missing annotation.
- The subscription examples only worked for the webhook service name. Added a note that GitHub App service subscriptions should use `.github` or `github`.
- The default subscription webhook recipient was written as `github-status:`. Argo CD documents webhook default recipients as the custom webhook name, so it now uses `github-status`.
- The branch protection section implied Argo CD deployment statuses always work as required PR checks. Added a caveat that the required status must be set on the same commit SHA GitHub is evaluating.

## Review Notes
The webhook examples match Argo CD's documented GitHub commit status webhook pattern. GitHub's REST API also documents `error`, `failure`, `pending`, and `success` as valid commit status states and supports fine-grained tokens or GitHub App tokens with Commit statuses permissions.
