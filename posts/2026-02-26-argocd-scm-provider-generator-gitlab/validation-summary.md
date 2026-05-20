# Validation Summary: How to Use SCM Provider Generator for GitLab in ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- Argo CD SCM Provider generator
- GitLab API and access tokens
- Kubernetes Secrets and ConfigMaps
- Helm-based Argo CD Applications

## Sources Consulted
- Argo CD SCM Provider Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-SCM-Provider/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD private repositories and credential templates documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD `argocd repocreds add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_repocreds_add/
- Argo CD declarative setup documentation for repository TLS certificates: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/#repositories-using-self-signed-tls-certificates-or-are-signed-by-custom-ca
- GitLab group access tokens documentation: https://docs.gitlab.com/user/group/settings/group_access_tokens/
- GitLab Groups API documentation: https://docs.gitlab.com/api/groups/

## Issues Found
- The prerequisites only mentioned a GitLab group ID. Updated this to say the SCM generator accepts a group ID or full namespaced group path, matching Argo CD documentation.
- The examples described `url` as an HTTPS clone URL but did not set `cloneProtocol: https`. Added `cloneProtocol: https` to examples that use `{{url}}` with HTTPS repository credentials.
- The generated parameter table was incomplete and described `short_sha` too loosely. Updated the wording to "including", corrected `short_sha` length, and added `short_sha_7` and `branchNormalized`.
- The self-signed GitLab TLS guidance only added a hostname-keyed certificate to `argocd-tls-certs-cm`. That helps repository cloning, but the GitLab SCM provider also needs TLS trust for the ApplicationSet controller's GitLab API client. Added a `caRef` ConfigMap example and kept the repository TLS trust store step for HTTPS clones.
- The rate-limit mitigation snippet patched `--argocd-repo-server-plaintext`, which is unrelated to ApplicationSet polling. Replaced it with the documented `requeueAfterSeconds` field for SCM generator polling.
- The group access token note claimed separate rate limits. GitLab documentation supports group tokens being scoped to a group, but not that rate-limit claim as written. Reworded it to focus on scoping automation away from individual user accounts.
- The repository credential section did not distinguish API discovery scope from Git clone scope. Added a note that clone credentials need `read_repository`, while the SCM discovery token uses `read_api`.

## Review Notes
The remaining examples are illustrative and assume the referenced GitLab groups, topics, branches, repository paths, and Helm values files exist. The Argo CD CLI and `kubectl` binaries were not installed in this workspace, so command verification used official command references rather than local `--help` output.
