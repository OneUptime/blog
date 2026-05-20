# Validation Summary: How to Use ArgoCD with EKS Anywhere

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Amazon EKS Anywhere
- Kubernetes
- Flux GitOps
- MetalLB
- ingress-nginx
- EKS Anywhere curated packages
- AWS IAM authentication / aws-iam-authenticator
- Argo CD ApplicationSet
- Longhorn

## Sources Consulted
- EKS Anywhere overview: https://anywhere.eks.amazonaws.com/docs/overview/
- EKS Anywhere cluster overview: https://anywhere.eks.amazonaws.com/docs/clustermgmt/cluster-overview/
- EKS Anywhere GitOps support: https://anywhere.eks.amazonaws.com/docs/getting-started/optional/gitops/
- EKS Anywhere curated packages overview: https://anywhere.eks.amazonaws.com/docs/packages/overview/
- EKS Anywhere upgrade overview: https://anywhere.eks.amazonaws.com/docs/clustermgmt/cluster-upgrades/upgrade-overview/
- EKS Anywhere IAM authentication: https://release-0-19.anywhere.eks.amazonaws.com/docs/clustermgmt/security/cluster-iam-auth/
- Argo CD installation docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD getting started install manifest guidance: https://github.com/argoproj/argo-cd/blob/master/docs/getting_started.md
- Argo CD declarative cluster setup and EKS auth: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/declarative-setup/
- Argo CD ingress configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD projects: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD ApplicationSet cluster generator: https://argo-cd.readthedocs.io/en/release-2.12/operator-manual/applicationset/Generators-Cluster/
- MetalLB installation: https://metallb.io/installation/
- ingress-nginx deployment docs: https://kubernetes.github.io/ingress-nginx/deploy/
- Amazon EKS kubeconfig docs: https://docs.aws.amazon.com/eks/latest/userguide/configure-kubectl.html
- Argo CD cluster add command reference: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/commands/argocd_cluster_add/

## Issues Found
- The introduction implied EKS Anywhere always uses GitOps for cluster management. Updated it to say EKS Anywhere supports an optional GitOps model, matching the EKS Anywhere GitOps docs.
- The architecture section implied every EKS Anywhere deployment has separate management and workload clusters. Updated it to mention standalone clusters and clarify that Cluster API providers run in the management cluster model.
- The Argo CD install command used client-side apply. Updated it to use `--server-side --force-conflicts`, which current Argo CD docs recommend because some CRDs exceed client-side apply annotation limits.
- The infrastructure provider list omitted AWS Snow. Added it to match current EKS Anywhere provider support.
- MetalLB and ingress-nginx install URLs used older pinned versions. Updated them to current official manifest versions checked during review.
- The ingress example used SSL passthrough without enabling the ingress-nginx controller flag and used a numeric service port. Added the `--enable-ssl-passthrough` patch and changed the backend to the named `https` port, matching Argo CD ingress guidance.
- The IAM section used `argocd-cm` `exec.enabled`, which enables Argo CD's web terminal feature and does not configure AWS IAM cluster authentication. Replaced it with a cluster Secret using `execProviderConfig` and noted that the executable must exist in the Argo CD image.
- The EKS cloud cluster registration example passed the cluster ARN as the context without the Argo CD AWS auth flag. Updated it to set a kubeconfig alias and use `argocd cluster add <context> --aws-cluster-name`.

## Review Notes
- The post is technically valid after the corrections. For production, the Argo CD and controller manifests should normally be pinned to tested versions rather than tracking moving `stable` or latest release URLs.
