# How to Deploy Vault Agent Sidecar for Kubernetes on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Vault, Kubernetes, Secret, Sidecar, HashiCorp, Linux

Description: Learn how to deploy the HashiCorp Vault Agent Injector as a sidecar in Kubernetes on RHEL to automatically inject secrets into pods using annotations, without modifying application code.

---

The Vault Agent Injector lets Kubernetes pods access Vault secrets without any application-level changes. It works by mutating pod specs through a webhook, adding an init container that fetches secrets before your app starts and a sidecar container that keeps them updated. This guide covers deploying the Vault Agent Injector on a Kubernetes cluster running on RHEL.

## How the Vault Agent Injector Works

When you annotate a pod with Vault-specific annotations, the injector webhook intercepts the pod creation and adds:

1. An **init container** that authenticates to Vault and fetches initial secrets
2. A **sidecar container** that keeps secrets refreshed as they rotate
3. A shared **memory volume** where secrets are written as files

Your application reads secrets from files at a known path, and the sidecar ensures they stay current.

## Prerequisites

- A Kubernetes cluster on RHEL
- Helm 3 installed
- A running Vault server (can be inside or outside the cluster)
- kubectl configured with cluster admin access

## Installing Vault in Kubernetes

If you do not already have Vault running, deploy it with Helm:

```bash
# Add the HashiCorp Helm repository
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update
```

```bash
# Install Vault in dev mode for testing
helm install vault hashicorp/vault \
  --namespace vault \
  --create-namespace \
  --set "server.dev.enabled=true" \
  --set "injector.enabled=true"
```

For production, use a non-dev deployment with persistent storage:

```bash
# Install Vault for production
helm install vault hashicorp/vault \
  --namespace vault \
  --create-namespace \
  --set "server.ha.enabled=true" \
  --set "server.ha.replicas=3" \
  --set "injector.enabled=true"
```

Wait for the pods to be ready:

```bash
# Check Vault pods
kubectl -n vault get pods
```

## Configuring Vault for Kubernetes Authentication

Enable the Kubernetes auth method in Vault:

```bash
# Exec into the Vault pod
kubectl -n vault exec -it vault-0 -- /bin/sh
```

Inside the Vault pod:

```bash
# Enable Kubernetes auth
vault auth enable kubernetes
```

```bash
# Configure Kubernetes auth with the cluster's service account
vault write auth/kubernetes/config \
  kubernetes_host="https://$KUBERNETES_PORT_443_TCP_ADDR:443"
```

## Creating Vault Policies and Roles

Create a policy that allows reading secrets:

```bash
# Create a read-only policy for the app
vault policy write app-policy - << 'EOF'
path "secret/data/myapp/*" {
  capabilities = ["read"]
}
path "secret/data/shared/*" {
  capabilities = ["read"]
}
EOF
```

Create a Kubernetes auth role that maps service accounts to policies:

```bash
# Create a role for the app's service account
vault write auth/kubernetes/role/myapp \
  bound_service_account_names=myapp-sa \
  bound_service_account_namespaces=default \
  policies=app-policy \
  ttl=1h
```

## Storing Secrets in Vault

Add some secrets that the application will use:

```bash
# Enable the KV secrets engine (version 2)
vault secrets enable -path=secret kv-v2
```

```bash
# Store database credentials
vault kv put secret/myapp/database \
  username="appuser" \
  password="s3cur3P@ssw0rd" \
  host="db.example.com" \
  port="5432"
```

```bash
# Store API keys
vault kv put secret/myapp/api \
  stripe_key="sk_live_abc123" \
  sendgrid_key="SG.xyz789"
```

## Creating the Application Service Account

```bash
# Create a service account for the application
kubectl create serviceaccount myapp-sa
```

## Deploying an Application with Vault Annotations

Create a deployment with Vault Agent Injector annotations:

```yaml
# myapp-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "myapp"
        vault.hashicorp.com/agent-inject-secret-database.txt: "secret/data/myapp/database"
        vault.hashicorp.com/agent-inject-secret-api-keys.txt: "secret/data/myapp/api"
    spec:
      serviceAccountName: myapp-sa
      containers:
      - name: myapp
        image: myapp:latest
        ports:
        - containerPort: 8080
        command: ["/bin/sh", "-c"]
        args:
        - |
          echo "Database config:"
          cat /vault/secrets/database.txt
          echo "API keys:"
          cat /vault/secrets/api-keys.txt
          # Start the actual application
          exec /app/start
```

```bash
# Deploy the application
kubectl apply -f myapp-deployment.yaml
```

## Custom Secret Templates

By default, Vault writes secrets as JSON. Use templates to format them differently:

```yaml
metadata:
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "myapp"
    vault.hashicorp.com/agent-inject-secret-db.env: "secret/data/myapp/database"
    vault.hashicorp.com/agent-inject-template-db.env: |
      {{- with secret "secret/data/myapp/database" -}}
      DB_HOST={{ .Data.data.host }}
      DB_PORT={{ .Data.data.port }}
      DB_USER={{ .Data.data.username }}
      DB_PASS={{ .Data.data.password }}
      {{- end }}
```

This renders the secrets as environment variable assignments that your application can source.

## Rendering Secrets as a Properties File

```yaml
vault.hashicorp.com/agent-inject-template-config.properties: |
  {{- with secret "secret/data/myapp/database" -}}
  database.host={{ .Data.data.host }}
  database.port={{ .Data.data.port }}
  database.username={{ .Data.data.username }}
  database.password={{ .Data.data.password }}
  {{- end }}
```

## Configuring Secret Rotation

The Vault Agent sidecar automatically refreshes secrets. Control the refresh interval:

```yaml
metadata:
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "myapp"
    vault.hashicorp.com/agent-inject-secret-database.txt: "secret/data/myapp/database"
    vault.hashicorp.com/agent-cache-enable: "true"
    vault.hashicorp.com/agent-run-as-same-user: "true"
```

## Verifying Secret Injection

Check that secrets were injected:

```bash
# Check the pod has the init and sidecar containers
kubectl get pods -l app=myapp -o jsonpath='{.items[0].spec.containers[*].name}'
```

```bash
# Read the injected secrets
kubectl exec deploy/myapp -c myapp -- cat /vault/secrets/database.txt
```

## Troubleshooting

Check the Vault Agent sidecar logs:

```bash
# View the Vault Agent logs
kubectl logs deploy/myapp -c vault-agent
```

```bash
# Check the init container logs
kubectl logs deploy/myapp -c vault-agent-init
```

Common issues:

- Service account mismatch between the pod and the Vault role
- Missing or incorrect Vault policy
- Vault server unreachable from the cluster

## Conclusion

The Vault Agent Injector on RHEL Kubernetes clusters provides a transparent way to deliver secrets to pods without embedding them in ConfigMaps, environment variables, or container images. By using pod annotations, you keep secret management separate from application code, and the sidecar handles authentication, secret fetching, and automatic renewal.
