# Validation Summary: How to Deploy to Kubernetes from GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- Kubernetes
- kubectl
- Google Kubernetes Engine (GKE)
- Amazon Elastic Kubernetes Service (EKS)
- Azure Kubernetes Service (AKS)
- Helm
- Kustomize
- Argo CD
- Kubesec

## Sources Consulted
- GitHub Actions expressions documentation: https://docs.github.com/actions/reference/evaluate-expressions-in-workflows-and-actions
- actions/checkout README and releases: https://github.com/actions/checkout
- Azure setup-kubectl README and releases: https://github.com/Azure/setup-kubectl
- Google GitHub Actions auth README: https://github.com/google-github-actions/auth
- Google GitHub Actions setup-gcloud README: https://github.com/google-github-actions/setup-gcloud
- Google GitHub Actions get-gke-credentials README: https://github.com/google-github-actions/get-gke-credentials
- aws-actions/configure-aws-credentials README and Marketplace listing: https://github.com/aws-actions/configure-aws-credentials
- AWS EKS update-kubeconfig documentation: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Azure Login README and releases: https://github.com/Azure/login
- Azure AKS set context README and releases: https://github.com/Azure/aks-set-context
- Azure setup-helm README: https://github.com/Azure/setup-helm
- Helm upgrade command documentation: https://helm.sh/docs/helm/helm_upgrade/
- Helm releases and Helm 4 support notes: https://github.com/helm/helm/releases and https://helm.sh/blog/helm-4-released/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes releases page: https://kubernetes.io/releases/
- Kustomize project documentation: https://kustomize.io/
- Argo CD CLI installation documentation: https://argo-cd.readthedocs.io/en/stable/cli_installation/
- Argo CD app sync command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- controlplaneio/kubesec-action README: https://github.com/controlplaneio/kubesec-action

## Issues Found
- The kubectl setup example pinned `azure/setup-kubectl@v3` and Kubernetes `v1.29.0`, which are outdated for a 2026 guide. Updated the action to `azure/setup-kubectl@v5` and used `version: 'latest'` to avoid an obsolete kubectl pin.
- The GKE example used older Google GitHub Action major versions. Updated `google-github-actions/auth`, `setup-gcloud`, and `get-gke-credentials` to `@v3`.
- The EKS example used an older AWS credentials action major version. Updated `aws-actions/configure-aws-credentials` to `@v6`.
- The AKS example used older Azure action major versions. Updated `azure/login` to `@v3` and `azure/aks-set-context` to `@v4`.
- The Helm example used older action and Helm versions. Updated `azure/setup-helm` to `@v5.0.0` and Helm to `v4.2.2`.
- The Argo CD sync job called `argocd` without installing the CLI on the GitHub-hosted runner. Added an installation step using Argo CD's documented GitHub release download pattern before running `argocd app sync`.
- The blue-green example only read `.status.loadBalancer.ingress[0].ip`, which misses cloud load balancers that expose a hostname. Updated the JSONPath to handle either IP or hostname. Also patched the service selector with both `app` and `version` labels so the patch does not accidentally drop the app selector.
- The canary monitor example used `kubectl top pods` CPU/memory output as an application error rate, which is technically incorrect. Replaced it with `kubectl rollout status deployment/myapp-canary --timeout=5m`.
- The Kubesec example referenced `kubesec/kubesec-action@v1` with a `manifest` input, but the maintained action is `controlplaneio/kubesec-action` and its documented file input is `input`. Updated the action and input name.

## Review Notes
- The examples are intentionally generic and assume matching Kubernetes resource names, namespaces, labels, kubeconfig permissions, and registry access exist outside the snippets.
- The GitOps example still assumes `kustomize` is available on the runner or installed elsewhere. GitHub-hosted runner images commonly include many tools, but production workflows should pin and install any required CLI explicitly.
- Helm 4 is current, while Helm 3 remains in support mode for a transition period. Teams that have Helm 3-specific plugins or workflows should validate Helm 4 compatibility before upgrading.
