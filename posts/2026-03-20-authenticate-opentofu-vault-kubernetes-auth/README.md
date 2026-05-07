# How to Authenticate OpenTofu with Vault Using Kubernetes Auth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Vault, Kubernetes Auth, Service Account, Authentication

Description: Learn how to configure OpenTofu to authenticate with HashiCorp Vault using the Kubernetes auth method, enabling pods and CI/CD jobs to authenticate using service account tokens.

## Introduction

Vault's Kubernetes auth method uses Kubernetes service account JWT tokens for authentication. OpenTofu running in Kubernetes-based CI/CD systems (Argo CD, Tekton, GitLab Runners) can authenticate with Vault using the pod's mounted service account token - no separate credentials required.

## Configuring Kubernetes Auth in Vault

```hcl
# Enable Kubernetes auth method

resource "vault_auth_backend" "kubernetes" {
  type = "kubernetes"
  path = "kubernetes"
}

# Configure with the Kubernetes cluster's host and CA bundle
resource "vault_kubernetes_auth_backend_config" "config" {
  backend            = vault_auth_backend.kubernetes.path
  kubernetes_host    = "https://kubernetes.default.svc.cluster.local"
  kubernetes_ca_cert = file("${path.module}/k8s-ca.crt")
  # Use the login JWT for TokenReview instead of Vault's local service account token.
  disable_local_ca_jwt = true
}

# Create a role for the CI/CD service account
resource "vault_kubernetes_auth_backend_role" "opentofu_cicd" {
  backend                          = vault_auth_backend.kubernetes.path
  role_name                        = "opentofu-cicd"
  bound_service_account_names      = ["opentofu-runner"]
  bound_service_account_namespaces = ["ci-cd"]
  token_policies                   = ["opentofu-policy"]
  token_ttl                        = 3600
  token_max_ttl                    = 14400
  # Set audience = "vault" when you use a projected service account token with that audience.
  # audience = "vault"
}
```

## Creating the Kubernetes Service Account

```hcl
resource "kubernetes_service_account" "opentofu_runner" {
  metadata {
    name      = "opentofu-runner"
    namespace = "ci-cd"
  }
}

# If Vault uses the login JWT for TokenReview, this service account needs system:auth-delegator.
resource "kubernetes_cluster_role_binding" "token_review" {
  metadata {
    name = "opentofu-runner-token-review"
  }
  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = "system:auth-delegator"
  }
  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.opentofu_runner.metadata[0].name
    namespace = "ci-cd"
  }
}
```

## OpenTofu Provider Configuration

```hcl
# provider.tf - running inside Kubernetes
provider "vault" {
  address = "http://vault.vault.svc.cluster.local:8200"

  # Avoid requiring auth/token/create on the Kubernetes login token.
  skip_child_token = true

  auth_login {
    path = "auth/kubernetes/login"

    parameters = {
      role = "opentofu-cicd"
      # JWT token path (auto-mounted by Kubernetes)
      jwt = file("/var/run/secrets/kubernetes.io/serviceaccount/token")
      # Or for projected service account tokens:
      # jwt = file("/var/run/secrets/vault/token")
    }
  }
}
```

## Tekton Pipeline Configuration

```yaml
# tekton/pipeline-run.yaml
apiVersion: tekton.dev/v1
kind: TaskRun
metadata:
  name: opentofu-apply
spec:
  serviceAccountName: opentofu-runner
  taskSpec:
    steps:
      - name: tofu-apply
        image: ghcr.io/opentofu/opentofu:latest
        script: |
          tofu init
          tofu apply -auto-approve
        env:
          - name: VAULT_ADDR
            value: "http://vault.vault.svc.cluster.local:8200"
          # No static VAULT_TOKEN is required when the Vault provider logs in with Kubernetes auth.
```

## Argo CD Integration with Vault Agent

```yaml
# argocd/application.yaml - using vault-agent-injector annotations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opentofu-runner
  namespace: ci-cd
spec:
  selector:
    matchLabels:
      app: opentofu-runner
  template:
    metadata:
      labels:
        app: opentofu-runner
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "opentofu-cicd"
        vault.hashicorp.com/agent-inject-secret-aws: "aws/creds/opentofu-role"
        vault.hashicorp.com/agent-inject-template-aws: |
          {{- with secret "aws/creds/opentofu-role" -}}
          export AWS_ACCESS_KEY_ID="{{ .Data.access_key }}"
          export AWS_SECRET_ACCESS_KEY="{{ .Data.secret_key }}"
          export AWS_SESSION_TOKEN="{{ .Data.session_token }}"
          {{- end }}
    spec:
      serviceAccountName: opentofu-runner
      containers:
        - name: tofu
          image: ghcr.io/opentofu/opentofu:latest
```

## Projected Service Account Tokens

```yaml
# pod spec fragment - mount a projected token with vault audience
spec:
  serviceAccountName: opentofu-runner
  containers:
    - name: tofu
      image: ghcr.io/opentofu/opentofu:latest
      volumeMounts:
        - name: vault-token
          mountPath: /var/run/secrets/vault
          readOnly: true
  volumes:
    - name: vault-token
      projected:
        sources:
          - serviceAccountToken:
              audience: vault
              expirationSeconds: 7200
              path: token
```

```hcl
provider "vault" {
  address = "http://vault.vault.svc:8200"

  skip_child_token = true

  auth_login {
    path = "auth/kubernetes/login"

    parameters = {
      role = "opentofu-cicd"
      # Use this with a Vault role that sets audience = "vault".
      jwt  = file("/var/run/secrets/vault/token")
    }
  }
}
```

## Conclusion

Vault Kubernetes auth provides zero-secret authentication for OpenTofu running in Kubernetes environments. The bound service account name and namespace constraints ensure only authorized workloads can authenticate. Combined with Vault's dynamic secrets engines, OpenTofu can obtain short-lived AWS credentials or database passwords without storing any long-lived secrets in the cluster.
