# Validation Summary: How to Use Docker Desktop with Multiple Kubernetes Contexts

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Docker Desktop Kubernetes
- Kubernetes kubeconfig contexts
- kubectl
- AWS EKS CLI
- Google Kubernetes Engine gcloud CLI
- Azure Kubernetes Service az CLI
- kubectx and kubens
- kube-ps1
- Bash shell prompt and wrapper scripts
- GitHub Actions CI/CD

## Sources Consulted
- Docker Desktop Kubernetes documentation: https://docs.docker.com/desktop/use-desktop/kubernetes/
- Kubernetes kubeconfig documentation: https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/
- Kubernetes kubectl config reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/
- AWS CLI eks update-kubeconfig reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Google Cloud SDK gcloud container clusters get-credentials reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/get-credentials
- Azure CLI az aks get-credentials reference: https://learn.microsoft.com/cli/azure/aks
- kubectx and kubens README: https://github.com/ahmetb/kubectx
- kube-ps1 README: https://github.com/jonmosco/kube-ps1
- Homebrew kube-ps1 formula: https://formulae.brew.sh/formula/kube-ps1.html

## Issues Found
- Docker Desktop Kubernetes was described as strictly single-node. Current Docker Desktop documentation says Kubernetes can be provisioned with kubeadm or kind, and the kind provisioner can support changing the number of nodes. I changed the wording to "built-in Kubernetes cluster for local development."
- The post said a custom `KUBECONFIG_CONTEXT` environment variable sets the context per terminal. `kubectl` does not read that variable automatically; it only works because the value is passed to `--context`. I changed the wording to say the variable stores the context name and must be passed explicitly.
- The `safe-kubectl.sh` wrapper checked only the current context, so a command like `k --context=production-eks delete pod old-pod` could bypass the production warning. I updated the script to honor explicit `--context` and `--context=...` flags before checking for production.

## Review Notes
The main commands and configuration examples are valid for current Kubernetes tooling. `KUBECONFIG` path separators are correct for Linux and macOS; Windows uses semicolons, which could be noted in a future platform-specific expansion.
