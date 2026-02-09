# How to implement ArgoCD with multiple Git repositories using repository credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git, DevOps

Description: Learn how to configure ArgoCD to work with multiple Git repositories using repository credentials, including SSH keys, HTTPS tokens, and credential templates for scalable multi-repo GitOps workflows.

---

Managing applications across multiple Git repositories is a common challenge in enterprise Kubernetes environments. ArgoCD provides robust support for working with multiple repositories through repository credentials, allowing you to securely connect to various Git sources while maintaining a clean separation of concerns.

This guide walks you through implementing ArgoCD with multiple Git repositories using different authentication methods, credential templates, and best practices for managing repository access at scale.

## Understanding ArgoCD repository credentials

ArgoCD stores repository credentials separately from Application definitions, allowing you to reuse credentials across multiple applications. This separation provides better security, easier credential rotation, and cleaner application manifests.

Repository credentials can be configured at different levels:

- Per-repository credentials for specific Git URLs
- Credential templates that match URL patterns
- Project-scoped credentials for multi-tenancy
- Private repository access with SSH keys or tokens

## Configuring repository credentials with SSH keys

SSH keys provide secure, password-less authentication to Git repositories. Here's how to add a repository with SSH credentials:

```yaml
# repository-ssh.yaml
apiVersion: v1
kind: Secret
metadata:
  name: private-repo-ssh
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: git@github.com:myorg/private-repo.git
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
    ... (your private key content here)
    -----END OPENSSH PRIVATE KEY-----
```

Apply the secret to your ArgoCD namespace:

```bash
# Apply the repository credential secret
kubectl apply -f repository-ssh.yaml

# Verify the repository is registered
argocd repo list
```

For multiple repositories using the same SSH key, you can use a credential template:

```yaml
# repository-credential-template-ssh.yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-ssh-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: git@github.com:myorg  # Pattern matching prefix
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ... (your private key content here)
    -----END OPENSSH PRIVATE KEY-----
```

This credential template automatically applies to all repositories matching the `git@github.com:myorg` prefix, eliminating the need to configure credentials for each repository individually.

## Using HTTPS with personal access tokens

For HTTPS-based authentication, you can use personal access tokens or username/password combinations:

```yaml
# repository-https-token.yaml
apiVersion: v1
kind: Secret
metadata:
  name: private-repo-https
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/myorg/private-repo.git
  password: ghp_YourPersonalAccessToken123456
  username: not-used  # Username can be anything for token auth
```

For GitHub, GitLab, and Bitbucket, the password field should contain your personal access token. The username field is typically ignored when using token authentication but must be present.

## Implementing credential templates for multiple repositories

Credential templates are powerful for managing access to multiple repositories within the same organization or server. Here's a comprehensive example:

```yaml
# github-org-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-org-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/myorg
  password: ghp_OrganizationAccessToken
  username: git
---
# gitlab-group-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-group-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://gitlab.com/mygroup
  password: glpat-GroupAccessToken
  username: oauth2
---
# bitbucket-workspace-credentials.yaml
apiVersion: v1
kind: Secret
metadata:
  name: bitbucket-workspace-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://bitbucket.org/myworkspace
  password: BitbucketAppPassword
  username: myusername
```

Apply all credential templates:

```bash
kubectl apply -f github-org-credentials.yaml
kubectl apply -f gitlab-group-credentials.yaml
kubectl apply -f bitbucket-workspace-credentials.yaml
```

Now any Application referencing repositories under these URL patterns will automatically use the configured credentials.

## Creating applications with multiple repository sources

With repository credentials configured, you can create Applications that reference different repositories:

```yaml
# multi-repo-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: multi-source-app
  namespace: argocd
spec:
  project: default
  sources:
    - repoURL: https://github.com/myorg/app-manifests.git
      targetRevision: main
      path: overlays/production
    - repoURL: https://github.com/myorg/helm-values.git
      targetRevision: main
      path: values
      helm:
        valueFiles:
          - production-values.yaml
    - repoURL: https://gitlab.com/mygroup/config-repo.git
      targetRevision: main
      path: configs
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

This Application pulls manifests from three different repositories, each authenticated using the appropriate credential template.

## Managing credentials with external secrets

For enhanced security, integrate ArgoCD with external secret management systems:

```yaml
# external-secret-for-repo-creds.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: github-repo-creds
  namespace: argocd
spec:
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: github-org-creds
    template:
      metadata:
        labels:
          argocd.argoproj.io/secret-type: repo-creds
      data:
        type: git
        url: https://github.com/myorg
        username: git
        password: "{{ .password }}"
  data:
    - secretKey: password
      remoteRef:
        key: github/org-token
        property: token
```

This approach keeps sensitive credentials in your secret management system while automatically syncing them to ArgoCD.

## Using declarative repository management

You can manage repositories declaratively using the Repository CRD:

```bash
# Add repositories using ArgoCD CLI
argocd repo add https://github.com/myorg/repo1.git \
  --username git \
  --password ghp_Token123

argocd repo add git@github.com:myorg/repo2.git \
  --ssh-private-key-path ~/.ssh/id_rsa

# List all configured repositories
argocd repo list

# Remove a repository
argocd repo rm https://github.com/myorg/repo1.git
```

For declarative management, use the ArgoCD repositories ConfigMap or individual secrets as shown earlier.

## Implementing project-scoped repository access

For multi-tenancy scenarios, you can scope repository access to specific ArgoCD projects:

```yaml
# project-with-repo-access.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-alpha
  namespace: argocd
spec:
  description: Team Alpha's project
  sourceRepos:
    - https://github.com/myorg/team-alpha-*
    - https://gitlab.com/mygroup/team-alpha-*
  destinations:
    - namespace: team-alpha-*
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: '*'
      kind: '*'
```

This project configuration restricts applications to only use repositories matching the specified patterns, providing isolation between teams.

## Troubleshooting repository connection issues

Common issues and their solutions:

**Authentication failures:**

```bash
# Check repository connection
argocd repo get https://github.com/myorg/repo.git

# View detailed repository status
kubectl get secret -n argocd -l argocd.argoproj.io/secret-type=repository -o yaml

# Test SSH connectivity
argocd repo add git@github.com:myorg/test.git \
  --ssh-private-key-path ~/.ssh/id_rsa \
  --insecure-ignore-host-key
```

**Credential precedence:**

ArgoCD matches credentials in this order:
1. Exact URL match in repository secrets
2. Longest prefix match in credential templates
3. Fallback to anonymous access if no match

Ensure your credential templates use the correct URL prefixes for proper matching.

## Best practices for multi-repository management

Follow these practices for maintainable multi-repo setups:

1. Use credential templates for organizational repositories rather than individual repository secrets
2. Store credentials in external secret management systems
3. Rotate access tokens regularly using automated processes
4. Use separate credentials for different teams or projects
5. Monitor repository connection health using ArgoCD notifications
6. Document repository access patterns in your AppProject definitions
7. Implement least-privilege access by using read-only tokens where possible

## Conclusion

ArgoCD's flexible repository credential system makes it straightforward to work with multiple Git repositories across different platforms and organizations. By using credential templates, external secret management, and project-scoped access controls, you can build a secure and scalable GitOps workflow that spans multiple repositories while maintaining clear separation of concerns and following security best practices.
