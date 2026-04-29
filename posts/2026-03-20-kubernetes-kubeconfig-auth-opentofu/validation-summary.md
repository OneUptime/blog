# Validation Summary: How to Authenticate the Kubernetes Provider with Kubeconfig in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Kubernetes
- HashiCorp Kubernetes provider
- HCL
- AWS CLI
- kubelogin

## Sources Consulted
- OpenTofu Provider Configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu `pathexpand` function: https://opentofu.org/docs/language/functions/pathexpand/
- HashiCorp Kubernetes provider overview: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/index.md
- HashiCorp Kubernetes provider source (`config_path`, `config_paths`, `config_context`, `exec` handling): https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/kubernetes/provider.go
- HashiCorp Kubernetes provider framework source (`config_path`, `config_paths`, `config_context`, `exec` handling): https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/manifest/provider/configure.go
- Kubernetes kubeconfig documentation: https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/
- `kubectl config get-contexts` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_get-contexts/
- Kubernetes authentication reference for exec plugins: https://kubernetes.io/docs/reference/access-authn-authz/authentication/
- Kubernetes client authentication API v1: https://kubernetes.io/docs/reference/config-api/client-authentication.v1/
- kubelogin README and credential plugin examples: https://github.com/int128/kubelogin/blob/master/README.md
- AWS CLI `eks get-token` command reference: https://docs.aws.amazon.com/cli/v1/reference/eks/get-token.html
- AWS CLI EKS token source (`discover_api_version`): https://github.com/aws/aws-cli/blob/v2/awscli/customizations/eks/get_token.py

## Issues Found
- The Step 1 comment said the provider would use the "default context" when `config_context` is omitted. I changed this to "current context from the kubeconfig" because kubeconfig behavior is driven by `current-context`, not by a special context literally named `default`.
- The OIDC exec example used `client.authentication.k8s.io/v1beta1`. I updated it to `client.authentication.k8s.io/v1` to match the current Kubernetes exec credential API and the current kubelogin documentation.
- The AWS EKS exec example also used `client.authentication.k8s.io/v1beta1`. I updated it to `client.authentication.k8s.io/v1` to match the current Kubernetes provider documentation. The current AWS CLI implementation negotiates the requested exec credential API version through `KUBERNETES_EXEC_INFO`, even though direct `aws eks get-token` examples still show a `v1beta1` fallback when invoked outside exec-plugin mode.

## Review Notes
- The post's use of `KUBE_CONFIG_PATH`, `KUBE_CTX`, `config_path`, and `config_paths` matches the current Kubernetes provider documentation and source.
- Using `~/.kube/config` directly is valid because the provider expands home-directory paths internally, so the post's mixed use of `pathexpand("~/.kube/config")` and raw `~/.kube/config` strings is technically acceptable.
- For CI/CD against managed clusters, dynamic auth is reasonable, but upstream provider guidance still recommends separating cluster creation from Kubernetes-provider-managed resources when provider configuration depends on cluster outputs.
