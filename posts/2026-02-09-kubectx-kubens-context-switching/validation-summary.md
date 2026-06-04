# Validation Summary: How to Use Kubernetes Context Switching and Namespace Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubectl
- kubeconfig contexts and namespaces
- kubectx
- kubens
- fzf
- Bash and Zsh shell configuration

## Sources Consulted
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes `kubectl config current-context` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_current-context/
- Kubernetes `kubectl config get-contexts` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_get-contexts/
- Kubernetes `kubectl config use-context` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_use-context/
- Kubernetes kubeconfig concepts: https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/
- Official kubectx/kubens repository README: https://github.com/ahmetb/kubectx
- Official kubectx and kubens shell scripts from the upstream repository: https://github.com/ahmetb/kubectx
- Debian kubens man page: https://manpages.debian.org/unstable/kubectx/kubens.1.en.html
- Local Ubuntu apt package metadata for `kubectx`, confirming the apt package provides both kubectx and kubens.

## Issues Found
- The tab completion examples used `kubectx completion bash` and `kubens completion bash`, but the official kubectx/kubens project documents completion scripts under the repository's `completion/` directory rather than a `completion` subcommand. Updated the Bash and Zsh examples to source or link the documented completion files for a manual `~/.kubectx` installation.
- The context and namespace validation script parsed `kubectx` and `kubens` list output with regular-expression `grep`. Updated context validation to use `kubectl config get-contexts -o name` and namespace validation to use Kubernetes namespace metadata from `kubectl`, with `grep -Fxq` for literal exact matches.
- The namespace finder loop parsed `kubens` display output. Updated it to iterate over namespaces returned by `kubectl get namespaces` using a jsonpath expression.
- The multi-cluster script attempted to restore the original context with `kubectx -`, which would restore the previous context from the final loop iteration rather than reliably restoring the starting context. Updated the script to save `ORIGINAL_CONTEXT=$(kubectx -c)` and restore that context explicitly.
- The multi-cluster script stored command arguments in a string and expanded them unquoted. Updated it to call `kubectl "$@"` so command arguments remain separated correctly.

## Review Notes
The main kubectl, kubectx, kubens, fzf, Homebrew, and apt usage claims were consistent with official Kubernetes documentation and the upstream kubectx/kubens project. Some shell examples remain intentionally simple and assume namespace and context names without shell whitespace, which matches typical Kubernetes naming and kubeconfig practice.
