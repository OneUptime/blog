# Validation Summary: How to Implement ArgoCD SSH Known Hosts

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Argo CD
- Kubernetes ConfigMaps, Secrets, and CronJobs
- Argo CD CLI
- Argo CD Helm chart
- OpenSSH known_hosts, ssh-keyscan, and ssh-keygen
- GitHub, GitLab, and Bitbucket SSH host keys

## Sources Consulted
- Argo CD private repository documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD argocd-ssh-known-hosts-cm example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-ssh-known-hosts-cm-yaml/
- Argo CD CLI cert add-ssh command reference: https://argo-cd.readthedocs.io/en/release-2.0/user-guide/commands/argocd_cert_add-ssh/
- Argo CD Helm chart values and README: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- GitHub SSH key fingerprints: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
- GitLab SSH documentation and GitLab.com host key fingerprint guidance: https://docs.gitlab.com/user/ssh/ and https://docs.gitlab.com/user/gitlab_com/
- Bitbucket Cloud SSH host keys: https://support.atlassian.com/bitbucket-cloud/docs/configure-ssh-and-two-step-verification/ and https://bitbucket.org/site/ssh
- OpenSSH ssh-keyscan manual: https://man.openbsd.org/ssh-keyscan.1
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The GitLab RSA known_hosts entry in the ConfigMap example was malformed and truncated. Replaced it with the current full GitLab RSA host key verified against live ssh-keyscan output and Argo CD Helm chart defaults.
- The Bitbucket RSA known_hosts entry was the old pre-rotation RSA host key. Replaced it with the current Bitbucket Cloud RSA host key verified against https://bitbucket.org/site/ssh, live ssh-keyscan output, and Argo CD Helm chart defaults.
- The Helm values example used `configs.ssh.knownHosts`, which can overwrite the chart's default known host list. Changed it to `configs.ssh.extraHosts`, the chart's additive field for extra/private repository host keys.
- The CronJob example blindly trusted live `ssh-keyscan` output and patched multi-line known_hosts data through an inline JSON string. Updated it to verify expected fingerprints before applying changes and to update the ConfigMap from a file using `kubectl create configmap --from-file --dry-run=client -o yaml | kubectl apply -f -`.
- The CronJob image assumed `kubectl`, `ssh-keyscan`, and `ssh-keygen` were already present. Changed the example to use Alpine and install `kubectl` plus `openssh-client` before running the update logic.
- The statement that Ed25519 is "the most secure" SSH algorithm was overly absolute. Reworded it to describe Ed25519 as modern, secure, and efficient.

## Review Notes
- The Argo CD CLI examples for `argocd cert add-ssh --batch`, `argocd cert list --cert-type ssh`, `argocd cert rm --cert-type ssh`, and `argocd repo add --ssh-private-key-path` match official Argo CD documentation.
- The `argocd-ssh-known-hosts-cm` ConfigMap name, `ssh_known_hosts` key, and `/app/config/ssh/ssh_known_hosts` mount path match official Argo CD documentation.
- Repository and repo credential Secret labels and fields match official Argo CD declarative setup documentation.
- Argo CD 2.4 and later use OpenSSH versions where legacy `ssh-rsa` SHA-1 signatures can be an issue for older SSH servers, but the known_hosts examples remain valid host key entries.
