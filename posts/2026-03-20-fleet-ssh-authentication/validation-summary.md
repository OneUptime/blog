# Validation Summary: How to Configure Fleet SSH Authentication

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- OpenSSH
- GitHub deploy keys
- GitLab deploy keys
- Bitbucket access keys
- GitOps

## Sources Consulted
- Fleet docs, "Create a GitRepo Resource": https://fleet.rancher.io/0.13/how-tos-for-users/gitrepo-add
- Fleet docs, "Troubleshooting": https://fleet.rancher.io/troubleshooting
- Fleet docs, Custom Resources Spec / GitRepo reference: https://fleet.rancher.io/reference/ref-crds
- Fleet source, `GitRepoSpec` (`clientSecretName`, `paths`): https://github.com/rancher/fleet/blob/main/pkg/apis/fleet.cattle.io/v1alpha1/gitrepo_types.go
- Fleet source, SSH auth secret handling: https://github.com/rancher/fleet/blob/main/pkg/git/netutils.go
- Fleet source, known_hosts lookup and strict-host-key behavior: https://github.com/rancher/fleet/blob/main/internal/ssh/knownhosts.go
- Fleet source, built-in known-hosts config map entries: https://github.com/rancher/fleet/blob/main/charts/fleet/templates/configmap_known_hosts.yaml
- Fleet source, gitjob deployment labels: https://github.com/rancher/fleet/blob/main/charts/fleet/templates/deployment_gitjob.yaml
- Kubernetes docs, Secrets: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes docs, `kubectl create secret generic`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- OpenSSH manual pages: https://www.openssh.org/manual.html
- GitHub docs, Managing deploy keys: https://docs.github.com/authentication/connecting-to-github-with-ssh/managing-deploy-keys
- GitHub docs, Testing your SSH connection: https://docs.github.com/en/authentication/connecting-to-github-with-ssh/testing-your-ssh-connection
- GitHub docs, Error: Key already in use: https://docs.github.com/en/authentication/troubleshooting-ssh/error-key-already-in-use
- GitLab docs, Deploy keys: https://docs.gitlab.com/user/project/deploy_keys/
- Atlassian Support, Configure SSH and two-step verification: https://support.atlassian.com/bitbucket-cloud/docs/set-up-an-ssh-key/
- Atlassian Support, Repository access keys: https://support.atlassian.com/bitbucket-cloud/docs/set-up-repository-access-keys-on-linux/

## Issues Found
- The post generated an ED25519 key by default and used an OpenSSH private key example. Fleet's documentation currently requires an unencrypted PEM-formatted private key, so the key-generation examples were updated to use `ssh-keygen -t rsa -b 4096 -m PEM`, and all related filenames and manifest snippets were updated accordingly.
- The `kubectl create secret generic` examples omitted `--type=kubernetes.io/ssh-auth`, and the YAML example used `type: Opaque`. Fleet's current API and source expect SSH auth secrets referenced by `clientSecretName` to be `kubernetes.io/ssh-auth`, so all secret examples were corrected.
- The post did not clearly state that the secret must be created in the same namespace as the `GitRepo`. This was clarified in the prerequisites and secret-creation section.
- The static `known_hosts` handling was inconsistent with current guidance. The `ssh-keyscan` commands were updated to use `-H`, and the manifest example was updated to a valid hashed `known_hosts` entry consistent with Fleet's current provider defaults.
- The SSH connectivity test used `StrictHostKeyChecking=no`, which weakens host verification and conflicts with the post's security guidance. The example was updated to use `IdentitiesOnly=yes` while keeping the standard `ssh -T` test flow.
- The key-rotation example recreated the secret without explicitly preserving the SSH secret type or `known_hosts`. The command was updated to keep `kubernetes.io/ssh-auth` and include `known_hosts`.
- The GitLab UI path was outdated. It was corrected to `Settings > Repository > Deploy keys`.
- The Bitbucket section implied repository access keys have selectable permissions. Bitbucket Cloud repository access keys are read-only, so that step was corrected.

## Review Notes
- Fleet v0.13 and later enforce strict host key checks by default and can fall back to a cluster-wide `known-hosts` config map for major providers when the referenced secret does not contain `known_hosts`.
- If a referenced secret does contain `known_hosts`, Fleet uses that data in preference to the cluster-wide fallback, so key-rotation procedures should preserve or intentionally refresh those entries.
- `kubectl` was not installed in the local review environment, so `kubectl` syntax was validated against Kubernetes documentation and Fleet source. OpenSSH key output format was verified locally with `ssh-keygen`.
