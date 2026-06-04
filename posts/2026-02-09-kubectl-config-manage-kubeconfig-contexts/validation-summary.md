# Validation Summary: How to Use kubectl config Commands to Manage Multiple Kubeconfig Contexts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- kubeconfig files
- Kubernetes contexts, clusters, users, and namespaces
- Cloud provider kubeconfig helpers for GKE, EKS, and AKS

## Sources Consulted
- Kubernetes kubectl config reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/
- Kubernetes kubectl config get-contexts reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_get-contexts/
- Kubernetes kubectl config set-cluster reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_set-cluster/
- Kubernetes kubectl config set-credentials reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_set-credentials/
- Kubernetes kubectl config set-context reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_set-context/
- Kubernetes kubectl config view reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/
- Kubernetes kubeconfig organization documentation: https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/
- Kubernetes authentication documentation: https://kubernetes.io/docs/reference/access-authn-authz/authentication/

## Issues Found
- The post said kubeconfig files contain exactly three components. Changed this to "three main components" because kubeconfig files also include fields such as `current-context`, `apiVersion`, `kind`, and preferences.
- The `kubectl config get-contexts -o name` example was labeled as listing contexts with full details. Changed the comment to say it lists context names only, matching the official output mode.
- The `kubectl config set-cluster` examples used `--certificate-authority-data`, which is not a documented flag for that subcommand. Replaced it with `--certificate-authority=...` plus `--embed-certs=true`.
- The `kubectl config set-credentials` examples used `--client-certificate-data` and `--client-key-data`, which are not documented flags for that subcommand. Replaced them with `--client-certificate=...`, `--client-key=...`, and `--embed-certs=true`.
- The `kubectl config view --context=production` example was described as viewing a specific context. Added `--minify` so the command output is limited to that context's effective configuration.
- The `kubectl config view --raw` example was labeled as "View as YAML". Changed the comment to clarify that `--raw` displays raw certificate data and sensitive data; YAML is already the default output format.

## Review Notes
- `kubectl` is not installed in the review environment, so command verification was performed against the current official Kubernetes generated command reference instead of local `kubectl --help` output.
- The post's warning against using `--insecure-skip-tls-verify=true` in production is accurate.
- The backup section includes a version control example for team kubeconfig files. In practice, teams should avoid committing kubeconfigs that contain tokens, client keys, or other secrets.
