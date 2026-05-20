# Validation Summary: How to Bootstrap an Entire Cluster with ArgoCD App-of-Apps

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD Applications and AppProjects
- Argo CD App-of-Apps cluster bootstrapping
- Argo CD sync waves, automated sync, and sync options
- Kubernetes and kubectl
- Helm chart sources for cert-manager, ingress-nginx, and kube-prometheus-stack
- kind test clusters

## Sources Consulted
- Argo CD Cluster Bootstrapping: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Health: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Getting Started / install manifests: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD Directory applications: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD Declarative Setup and Helm source examples: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Project Specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- cert-manager Helm installation documentation: https://cert-manager.io/v1.14-docs/installation/helm/
- kind Quick Start: https://kind.sigs.k8s.io/docs/user/quick-start/

## Issues Found
- The post implied that App-of-Apps sync waves automatically wait for child Applications to become healthy before later waves run. Argo CD removed built-in health assessment for `argoproj.io/Application` in 1.8, so I clarified that sync waves order child Application resource application and added the official `argocd-cm` Application health customization needed for health-gated app-of-apps waves.
- The applications AppProject denied all cluster-scoped resources while the sample Application used `CreateNamespace=true`. I changed the project to whitelist only the core `Namespace` cluster resource so destination namespace auto-creation can work without allowing all cluster-scoped resources.
- The Argo CD install command used plain client-side `kubectl apply`. Current Argo CD getting-started documentation uses `--server-side --force-conflicts` for the install manifest because some CRDs exceed the client-side apply annotation size limit, so I updated both install examples.

## Review Notes
The YAML snippets parse successfully. Chart versions in the examples are pinned, which is good for reproducibility, but they are example versions rather than current latest chart releases as of this review.
