# How to Use HelmRelease for Deploying Vault with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Vault, Secrets Management, HashiCorp

Description: Learn how to deploy HashiCorp Vault for secrets management on Kubernetes using a Flux HelmRelease.

---

HashiCorp Vault provides centralized secrets management, encryption as a service, and identity-based access control. Running Vault on Kubernetes gives your applications a native way to fetch secrets, generate dynamic credentials, and manage PKI certificates. Deploying Vault through a Flux HelmRelease ensures your secrets infrastructure is version-controlled and automatically reconciled from Git.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- A GitOps repository connected to Flux
- A storage backend for Vault data (Raft integrated storage or an external backend like Consul)

## Creating the HelmRepository

HashiCorp publishes official Helm charts through their releases repository.

```yaml
# helmrepository-hashicorp.yaml - HashiCorp Helm chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: hashicorp
  namespace: flux-system
spec:
  interval: 1h
  url: https://helm.releases.hashicorp.com
```

## Deploying Vault with HelmRelease

The following HelmRelease deploys Vault in high-availability mode using the integrated Raft storage backend.

```yaml
# helmrelease-vault.yaml - Vault deployment via Flux
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: vault
  namespace: vault
spec:
  interval: 15m
  chart:
    spec:
      chart: vault
      version: "0.x"
      sourceRef:
        kind: HelmRepository
        name: hashicorp
        namespace: flux-system
      interval: 15m
  install:
    createNamespace: true
    timeout: 10m
    remediation:
      retries: 3
  upgrade:
    timeout: 10m
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
  values:
    # Global settings
    global:
      enabled: true
      tlsDisable: false

    # Vault Server configuration
    server:
      # High Availability mode with Raft
      ha:
        enabled: true
        replicas: 3
        raft:
          enabled: true
          config: |
            ui = true

            listener "tcp" {
              tls_disable = 0
              address = "[::]:8200"
              cluster_address = "[::]:8201"
              tls_cert_file = "/vault/userconfig/vault-tls/tls.crt"
              tls_key_file = "/vault/userconfig/vault-tls/tls.key"
              tls_client_ca_file = "/vault/userconfig/vault-tls/ca.crt"
            }

            storage "raft" {
              path = "/vault/data"

              retry_join {
                leader_api_addr = "https://vault-0.vault-internal:8200"
                leader_ca_cert_file = "/vault/userconfig/vault-tls/ca.crt"
              }
              retry_join {
                leader_api_addr = "https://vault-1.vault-internal:8200"
                leader_ca_cert_file = "/vault/userconfig/vault-tls/ca.crt"
              }
              retry_join {
                leader_api_addr = "https://vault-2.vault-internal:8200"
                leader_ca_cert_file = "/vault/userconfig/vault-tls/ca.crt"
              }
            }

            service_registration "kubernetes" {}

      # Resource limits
      resources:
        requests:
          cpu: 250m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi

      # Persistent storage for Raft data
      dataStorage:
        enabled: true
        size: 10Gi
        storageClass: null

      # Audit log storage
      auditStorage:
        enabled: true
        size: 5Gi

      # Extra volumes for TLS certificates
      extraVolumes:
        - type: secret
          name: vault-tls

      # Ingress for the Vault UI
      ingress:
        enabled: true
        ingressClassName: nginx
        hosts:
          - host: vault.example.com
        tls:
          - secretName: vault-ingress-tls
            hosts:
              - vault.example.com

    # Vault UI
    ui:
      enabled: true
      serviceType: ClusterIP

    # Injector for automatic sidecar injection
    injector:
      enabled: true
      replicas: 2
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 250m
          memory: 128Mi

    # CSI provider for mounting secrets as volumes
    csi:
      enabled: true
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 200m
          memory: 128Mi
```

## Initializing and Unsealing Vault

Vault requires initialization and unsealing after the first deployment. This is a manual step that cannot be automated through GitOps for security reasons.

```bash
# Check HelmRelease status
flux get helmrelease vault -n vault

# Initialize Vault (first time only)
kubectl exec -n vault vault-0 -- vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json > vault-init.json

# Unseal each Vault instance (repeat with 3 of 5 unseal keys)
kubectl exec -n vault vault-0 -- vault operator unseal <UNSEAL_KEY_1>
kubectl exec -n vault vault-0 -- vault operator unseal <UNSEAL_KEY_2>
kubectl exec -n vault vault-0 -- vault operator unseal <UNSEAL_KEY_3>

# Join other replicas to the Raft cluster
kubectl exec -n vault vault-1 -- vault operator raft join https://vault-0.vault-internal:8200
kubectl exec -n vault vault-2 -- vault operator raft join https://vault-0.vault-internal:8200

# Unseal vault-1 and vault-2 similarly
```

Store the initialization output (root token and unseal keys) securely outside of Git.

## Configuring Kubernetes Authentication

Enable the Kubernetes auth method so pods can authenticate with Vault using their service account tokens.

```bash
# Login to Vault
kubectl exec -n vault vault-0 -- vault login <ROOT_TOKEN>

# Enable Kubernetes auth
kubectl exec -n vault vault-0 -- vault auth enable kubernetes

# Configure the Kubernetes auth method
kubectl exec -n vault vault-0 -- vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443"
```

## Using the Vault Injector

With the injector enabled, annotate your pods to have secrets injected automatically.

```yaml
# deployment.yaml - Application with Vault sidecar injection
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: apps
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "my-app-role"
        vault.hashicorp.com/agent-inject-secret-config: "secret/data/my-app/config"
      labels:
        app: my-app
    spec:
      serviceAccountName: my-app
      containers:
        - name: my-app
          image: my-app:latest
```

## Verifying the Deployment

```bash
# Check all Vault pods are running
kubectl get pods -n vault

# Verify Vault status
kubectl exec -n vault vault-0 -- vault status

# Check Raft cluster members
kubectl exec -n vault vault-0 -- vault operator raft list-peers

# Verify the injector is running
kubectl get pods -n vault -l app.kubernetes.io/name=vault-agent-injector
```

## Summary

Deploying Vault through a Flux HelmRelease from `https://helm.releases.hashicorp.com` provides GitOps-managed secrets infrastructure for your Kubernetes clusters. While the Vault deployment itself is managed declaratively, initialization and unsealing remain intentionally manual operations for security. The combination of Flux for deployment management and Vault for secrets management creates a robust, auditable infrastructure layer.
