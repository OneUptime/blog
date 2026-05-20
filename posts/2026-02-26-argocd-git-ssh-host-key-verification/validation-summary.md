# Validation Summary: How to Handle Git SSH Host Key Verification in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Git over SSH
- Kubernetes ConfigMaps and CronJobs
- OpenSSH known_hosts, ssh-keyscan, and ssh-keygen
- GitHub, GitLab, Bitbucket Cloud, and Azure DevOps SSH host keys

## Sources Consulted
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD `argocd cert add-ssh` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cert_add-ssh/
- Argo CD `argocd cert rm` command reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/commands/argocd_cert_rm/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- GitHub SSH key fingerprints: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
- GitLab SSH documentation and GitLab.com host key guidance: https://docs.gitlab.com/user/ssh/
- Bitbucket Cloud SSH host key documentation: https://support.atlassian.com/bitbucket-cloud/docs/set-up-an-ssh-key/
- Azure Repos SSH authentication documentation: https://learn.microsoft.com/en-us/azure/devops/repos/git/use-ssh-keys-to-authenticate
- OpenSSH manual pages: https://www.openssh.org/manual.html

## Issues Found
- The host key removal command used `argocd cert rm-ssh`, which is not a valid Argo CD CLI command. Changed it to `argocd cert rm github.com --cert-type ssh`, matching the documented `argocd cert rm` syntax.
- The ConfigMap example for disabling SSH host key verification was ineffective. An empty or comment-only `ssh_known_hosts` value does not create a wildcard bypass. Replaced it with the documented repository option `--insecure-skip-server-verification`.
- The suggested `argocd-repo-server-gitconfig` ConfigMap was not a documented Argo CD mechanism by itself. Removed that example to avoid implying that creating a ConfigMap with that name changes repo-server Git behavior.
- The post stated that repo-server picks up ConfigMap changes automatically without qualification. Updated the wording to note that Kubernetes projected ConfigMap updates can take time to appear in mounted files.
- The automation example blindly replaced trusted keys with fresh `ssh-keyscan` output. Changed it to a drift detection CronJob that compares scanned keys to the approved ConfigMap and exits non-zero so monitoring can alert for review.
- The CronJob used `bitnami/kubectl:latest` while relying on `ssh-keyscan`, which is not guaranteed to be present. Changed the example to require an internal image containing `kubectl`, `ssh-keyscan`, and `diff`.

## Review Notes
The public GitHub, GitLab, Bitbucket Cloud, and Azure DevOps host key examples and fingerprints were consistent with provider documentation or current scanned fingerprints at review time. Public host keys can rotate, so future reviews should re-check them against provider documentation rather than trusting old examples.
