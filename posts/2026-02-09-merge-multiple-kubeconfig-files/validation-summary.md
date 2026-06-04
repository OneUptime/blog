# Validation Summary: How to Merge Multiple Kubeconfig Files into a Single Config

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Kubernetes kubeconfig files
- kubectl
- KUBECONFIG environment variable
- Google Kubernetes Engine gcloud CLI
- Amazon EKS AWS CLI
- Azure Kubernetes Service Azure CLI
- Bash scripting

## Sources Consulted
- Kubernetes: Organizing Cluster Access Using kubeconfig Files - https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/
- Kubernetes: kubectl config view reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/
- Kubernetes: kubectl config reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/
- Google Cloud SDK: gcloud container clusters get-credentials - https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/get-credentials
- AWS CLI: aws eks update-kubeconfig - https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Azure CLI: az aks get-credentials - https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest

## Issues Found
- `kubectl config view --flatten` was used when writing merged kubeconfig files. The kubectl reference documents `--flatten` for self-contained output and `--raw` for raw certificate data and sensitive data, so the merge/export commands were updated to use `--flatten --raw` where the output is saved.
- The post said duplicate context names use the last matching entry. Kubernetes kubeconfig merge rules say the first file to set a value or map key wins, so the duplicate-context explanation was corrected.
- The post claimed `--flatten` embeds all certificates and credentials. This was narrowed to file-based certificate data, with `--raw` called out for preserving sensitive fields.
- The AKS example omitted the required `--resource-group` parameter. The command now includes `--resource-group myResourceGroup`.
- The conflict-handling example used nonexistent `kubectl config rename-cluster` and `kubectl config rename-user` commands. These were replaced with guidance to rename cluster and user entries in the kubeconfig YAML and update the referenced context fields.
- Several shell snippets would break or behave incorrectly in realistic cases: quoted output paths and context names, replaced literal `~` inside generated KUBECONFIG values with `$HOME`, and used `mktemp` for extracted contexts so names containing `/` do not become invalid file paths.

## Review Notes
The local environment did not have `kubectl` installed, so command behavior was validated against the official generated Kubernetes command reference and cloud provider CLI documentation instead of local `--help` output.
