# Validation Summary: How to Fix 'unable to clone' Error in Flux CD GitRepository

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux GitRepository API
- Kubernetes Secrets
- kubectl
- Kustomize
- Git over SSH and HTTPS
- GitHub, GitLab, and Bitbucket repository authentication

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://v2-6.docs.fluxcd.io/flux/components/source/api/v1/
- Flux proxy settings documentation: https://fluxcd.io/flux/installation/configuration/proxy-setting/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- GitHub SSH over HTTPS port documentation: https://docs.github.com/en/authentication/troubleshooting-ssh/using-ssh-over-the-https-port
- GitHub CLI deploy-key list manual: https://cli.github.com/manual/gh_repo_deploy-key_list
- GitLab personal access tokens documentation: https://docs.gitlab.com/user/profile/personal_access_tokens/

## Issues Found
- The SSH known_hosts section created a separate `ssh-known-hosts` Secret, but Flux GitRepository SSH authentication expects `known_hosts` in the same Secret referenced by `.spec.secretRef`. Replaced that step with a known_hosts verification step and clarified that the referenced SSH Secret must contain both `identity` and `known_hosts`.
- The SSH GitRepository example included `verify.mode: HEAD` without a `verify.secretRef`. Flux uses `.spec.verify` for Git commit signature verification, not SSH host key verification, and the verification Secret is required for that feature. Removed the unrelated `verify` block from the SSH troubleshooting example.
- The SSH key Secret creation command was create-only. Updated it to use `--dry-run=client -o yaml | kubectl apply -f -` so the command works for both create and update flows described by the heading.
- The self-signed TLS certificate example used `.spec.certSecretRef`, which is not a GitRepository field in the Flux Source API. Updated the example to place `ca.crt` in the HTTPS credential Secret referenced by `.spec.secretRef`, matching Flux GitRepository documentation.
- The checklist command piped `kubectl -o jsonpath='{.data}'` output into `jq`, which is not reliable JSON. Changed it to `kubectl get secret ... -o json | jq '.data | keys'`.

## Review Notes
The remaining examples align with current Flux and Kubernetes documentation. The local workspace did not have `kubectl` installed, so kubectl behavior was checked against official Kubernetes command documentation rather than local `--help` output.
