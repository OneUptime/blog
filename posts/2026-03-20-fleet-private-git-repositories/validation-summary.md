# Validation Summary: How to Set Up Fleet with Private Git Repositories

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- Git authentication for private repositories
- GitHub deploy keys
- GitLab deploy tokens
- Bitbucket access keys

## Sources Consulted
- Fleet documentation: Create a GitRepo Resource — https://fleet.rancher.io/0.13/how-tos-for-users/gitrepo-add
- Fleet source: `GitRepoSpec` fields and comments — https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/gitrepo_types.go
- Fleet source: `gitjob` deployment labels and flags — https://github.com/rancher/fleet/blob/main/charts/fleet/templates/deployment_gitjob.yaml
- Kubernetes documentation: Secrets — https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes documentation: `kubectl create secret generic` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- GitHub Docs: Managing deploy keys — https://docs.github.com/authentication/connecting-to-github-with-ssh/managing-deploy-keys
- GitLab Docs: Deploy tokens — https://docs.gitlab.com/user/project/deploy_tokens/
- GitLab Docs: Deploy keys — https://docs.gitlab.com/user/project/deploy_keys/
- Atlassian Support: Set up Repository Access keys on Linux — https://support.atlassian.com/bitbucket-cloud/docs/set-up-repository-access-keys-on-linux/
- SUSE Edge / Rancher UI docs: Fleet in the Rancher dashboard — https://documentation.suse.com/suse-edge/3.5/html/edge/components-fleet.html

## Issues Found
1. **SSH key generation example used an incompatible key format for Fleet.** The original post generated an ED25519 key with OpenSSH defaults. Fleet’s documentation and `GitRepoSpec` comments require a PEM-formatted private key. Updated the example to generate an RSA 4096 key with `-m PEM` and clarified that passphrase-protected keys are not supported.

2. **The SSH secret example omitted the required secret type.** Fleet expects `clientSecretName` secrets to be `kubernetes.io/ssh-auth` or `kubernetes.io/basic-auth`. Added `--type=kubernetes.io/ssh-auth` to the SSH secret creation commands.

3. **The HTTP auth examples were internally inconsistent and under-specified.** The CLI example created `git-http-auth`, while the `GitRepo` referenced `git-http-credentials`. Also, the secret type was omitted and the YAML comment incorrectly suggested an organization name could be used as the username. Aligned the secret name to `git-http-credentials`, added `--type=kubernetes.io/basic-auth`, and corrected the GitHub username/token comments.

4. **The authentication overview overstated Fleet’s supported methods and misclassified deploy tokens.** Current Fleet docs list HTTP basic auth, SSH auth keys, and GitHub Apps as supported mechanisms. A GitLab deploy token is an HTTP credential pattern, not a separate Fleet authentication mechanism. Updated the introduction and overview to reflect this accurately while preserving the structure of the article.

5. **The self-signed certificate example was invalid for Fleet’s `GitRepo` schema.** The original post placed a raw PEM block into `spec.caBundle`, but Fleet’s field is a byte field that must be provided as base64-encoded PEM content in manifests. The extra `git-ca-bundle` secret command was also not used by the `GitRepo`. Replaced the manifest value with a base64 placeholder, changed the command to generate the encoded value, and fixed the TLS verification comment so it no longer implied that `false` disables verification.

6. **The credential rotation resync command used the wrong mechanism.** The original post used `kubectl annotate ... fleet.cattle.io/commit=""`, but Fleet documents `spec.forceSyncGeneration` as the field to increment to force a redeployment/sync. Replaced the annotation example with a `kubectl patch` flow that increments `forceSyncGeneration`.

7. **The event-filtering example depended on an unverified Fleet event reason.** Replaced the `reason=FailedSync` filter with a generic namespace event listing, which is valid regardless of the exact event reasons emitted by a given Fleet version.

## Review Notes
- Fleet v0.13 and newer enforce strict SSH host key checks by default. For GitHub, GitLab, Bitbucket, and Azure DevOps, Fleet can fall back to its built-in `known-hosts` ConfigMap; for self-hosted SSH Git servers, readers may also need to add a `known_hosts` entry to the SSH secret.
- Fleet also supports GitHub App authentication for private repositories, but this post intentionally focuses on secret-based SSH and HTTP credential flows.
