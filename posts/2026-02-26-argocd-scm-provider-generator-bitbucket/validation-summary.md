# Validation Summary: How to Use SCM Provider Generator for Bitbucket in ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- SCM provider generator
- Bitbucket Cloud
- Bitbucket Server / Bitbucket Data Center
- Kubernetes Secrets and ConfigMaps
- Argo CD repository credential templates
- TLS certificate configuration

## Sources Consulted
- Argo CD SCM Provider Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-SCM-Provider/
- Argo CD Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD private repositories and credential template documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD repo-creds Secret example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-repo-creds-yaml/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Atlassian Bitbucket Cloud REST API repositories reference: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-repositories/
- Atlassian Bitbucket Data Center HTTP access tokens documentation: https://confluence.atlassian.com/bitbucketserver/personal-access-tokens-939515499.html

## Issues Found
- The Bitbucket Cloud prerequisites referred to an app password with `repository:read` permission. Bitbucket Cloud app password UI uses `Repositories: Read`, so the text was corrected to match Atlassian terminology.
- The Bitbucket Cloud example commented that `allBranches: false` only scans repositories matching a pattern. That field controls branch scanning, while `repositoryMatch` performs repository filtering. The comment was corrected.
- The Bitbucket Server example commented that `allBranches: false` includes all repositories in the project. That field controls whether all branches are scanned or only the default branch. The comment was corrected.
- The self-signed TLS section created `argocd-tls-certs-cm` but did not show `caRef`, which the SCM provider generator uses to trust a custom CA. A minimal `caRef` example was added.

## Review Notes
The ApplicationSet examples use the default fasttemplate syntax such as `{{repository}}`, which is still documented as the default templating engine. Newer examples often use `goTemplate: true` with `{{ .repository }}`, but converting the post was not required for correctness.
