# Validation Summary: How to Deploy to Kubernetes with GitHub Actions

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- GitHub Actions workflows and environments
- Kubernetes and kubectl
- Helm
- Amazon EKS
- Google Kubernetes Engine
- Azure Kubernetes Service
- Kustomize
- GitHub Container Registry
- Slack GitHub Action notifications

## Sources Consulted
- GitHub Actions checkout releases: https://github.com/actions/checkout/releases
- GitHub Actions Docker image publishing guide: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
- GitHub Packages with GitHub Actions: https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions
- Azure setup-kubectl action: https://github.com/Azure/setup-kubectl
- Azure setup-helm action: https://github.com/Azure/setup-helm
- AWS configure-aws-credentials action: https://github.com/aws-actions/configure-aws-credentials
- AWS EKS update-kubeconfig reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Google GitHub Actions auth action: https://github.com/google-github-actions/auth
- Google setup-gcloud action: https://github.com/google-github-actions/setup-gcloud
- Google get-gke-credentials action: https://github.com/google-github-actions/get-gke-credentials
- Azure Login action: https://github.com/Azure/login
- Azure AKS set context action: https://github.com/Azure/aks-set-context
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes kubectl rollout history reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/
- Kubernetes kubectl rollout undo reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Helm upgrade reference: https://helm.sh/docs/helm/helm_upgrade/
- Kustomize documentation: https://kustomize.io/
- Slack GitHub Action documentation: https://docs.slack.dev/tools/slack-github-action/
- Slack GitHub Action API method usage: https://docs.slack.dev/tools/slack-github-action/sending-data-slack-api-method/

## Issues Found
- Several GitHub Actions examples used older action major versions. Updated checkout, kubectl, Helm, AWS credentials, Google Cloud, Azure, AKS, and Slack action references to current supported releases available from the official action repositories.
- The multi-environment build job pushed to GitHub Container Registry without logging in and without `packages: write` permission. Added explicit `permissions` and a `docker/login-action@v4` GHCR login step using `GITHUB_TOKEN`, matching GitHub's official publishing guidance.
- The blue-green Service patch replaced the selector with only `slot`, which could route traffic to unrelated pods that share the same slot label. Updated the patch to preserve the `app: myapp` selector along with the slot.
- The canary section described "traffic splitting" and "10% of pods", but the snippet only scales a separate canary Deployment to one replica and does not configure weighted traffic. Adjusted the text and comment to describe the actual behavior.
- The rollback example captured the second-to-last rollout revision before deployment, which can roll back to the wrong version. Changed the command to capture the latest numeric revision before applying the new image.
- The Slack notification example used the older v2 inputs. Updated it to the current v3 API-method format with `method`, `token`, and YAML `payload`.

## Review Notes
- The examples assume referenced Kubernetes namespaces, Deployments, Services, labels, Helm charts, Kustomize overlays, cloud IAM bindings, and GitHub secrets already exist.
- The canary example is a basic pod-ratio canary pattern. Precise weighted traffic requires an ingress controller, Gateway API implementation, or service mesh that supports traffic weights.
- For production workflows, pinning third-party actions to commit SHAs is stronger supply-chain hygiene than using moving major tags.
