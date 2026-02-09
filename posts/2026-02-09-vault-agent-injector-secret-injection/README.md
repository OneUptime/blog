# How to use Vault Agent Injector for automatic secret injection into pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, Kubernetes, Vault Agent, Secrets Management, Automation

Description: Master Vault Agent Injector to automatically inject secrets into Kubernetes pods using sidecar containers and init containers for seamless secret management.

---

Vault Agent Injector automatically injects secrets into pods without requiring application code changes. Using Kubernetes mutation webhooks, it adds init and sidecar containers that authenticate to Vault and write secrets to a shared volume. This guide shows you how to configure and use Agent Injector for transparent secret delivery.

## Understanding Vault Agent Injector

The Vault Agent Injector is a Kubernetes mutation webhook that intercepts pod creation requests. When it sees specific annotations on a pod, it injects Vault Agent containers that handle authentication, secret retrieval, and template rendering. Applications read secrets from files rather than directly calling Vault APIs.

The injection process works like this: pod is created with Vault annotations, webhook intercepts pod creation, init container authenticates and fetches initial secrets, sidecar container keeps secrets updated, and application reads secrets from shared volume.

## Installing Vault with Injector

Deploy Vault with the injector enabled:

```bash
# Install Vault with injector
helm install vault hashicorp/vault \
  --namespace vault \
  --set "injector.enabled=true" \
  --set "injector.replicas=1"

# Verify injector is running
kubectl -n vault get pods -l app.kubernetes.io/name=vault-agent-injector

# Check webhook configuration
kubectl get mutatingwebhookconfigurations vault-agent-injector-cfg
```

## Configuring Basic Secret Injection

Annotate your pod to inject secrets:

```yaml
# app-with-secrets.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-secrets
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "app"
    vault.hashicorp.com/agent-inject-secret-database: "secret/data/app/database"
spec:
  serviceAccountName: app-sa
  containers:
  - name: app
    image: nginx:latest
    command: ['sh', '-c', 'while true; do cat /vault/secrets/database; sleep 5; done']
```

Key annotations explained:
- `vault.hashicorp.com/agent-inject: "true"` enables injection
- `vault.hashicorp.com/role: "app"` specifies the Vault auth role
- `vault.hashicorp.com/agent-inject-secret-<name>` defines secrets to inject

```bash
kubectl apply -f app-with-secrets.yaml

# Verify injection occurred
kubectl get pod app-with-secrets -o jsonpath='{.spec.initContainers[*].name}'
# Should show: vault-agent-init

kubectl get pod app-with-secrets -o jsonpath='{.spec.containers[*].name}'
# Should show: app vault-agent

# Check injected secret
kubectl exec app-with-secrets -c app -- cat /vault/secrets/database
```

## Creating Custom Templates

Use custom templates to format secrets:

```yaml
# app-custom-template.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-custom-template
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "app"
    vault.hashicorp.com/agent-inject-secret-config: "secret/data/app/config"
    vault.hashicorp.com/agent-inject-template-config: |
      {{- with secret "secret/data/app/config" -}}
      export DATABASE_URL="{{ .Data.data.database_url }}"
      export API_KEY="{{ .Data.data.api_key }}"
      export DEBUG="{{ .Data.data.debug }}"
      {{- end -}}
spec:
  serviceAccountName: app-sa
  containers:
  - name: app
    image: ubuntu:latest
    command:
    - /bin/bash
    - -c
    - |
      source /vault/secrets/config
      echo "Database: $DATABASE_URL"
      echo "API Key: $API_KEY"
      sleep 3600
```

The template uses Go templating syntax to format secrets as environment variable exports.

## Injecting Secrets as Environment Variables

While file-based injection is preferred, you can inject to environment:

```yaml
# app-env-secrets.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-env-secrets
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
        vault.hashicorp.com/agent-inject-secret-config: "secret/data/app/config"
        vault.hashicorp.com/role: "app"
        vault.hashicorp.com/agent-inject-template-config: |
          {{ with secret "secret/data/app/config" }}
          DATABASE_URL={{ .Data.data.database_url }}
          API_KEY={{ .Data.data.api_key }}
          {{ end }}
    spec:
      serviceAccountName: app-sa
      containers:
      - name: app
        image: myapp:latest
        command:
        - /bin/sh
        - -c
        - |
          # Source secrets before starting app
          . /vault/secrets/config
          exec /app/start
```

## Advanced Template Features

Create sophisticated templates with logic:

```yaml
metadata:
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "app"
    vault.hashicorp.com/agent-inject-secret-config.json: "secret/data/app/config"
    vault.hashicorp.com/agent-inject-template-config.json: |
      {
        {{- with secret "secret/data/app/config" }}
        "database": {
          "host": "{{ .Data.data.db_host }}",
          "port": {{ .Data.data.db_port }},
          "username": "{{ .Data.data.db_user }}",
          "password": "{{ .Data.data.db_password }}"
        },
        {{- end }}
        {{- with secret "secret/data/app/api-keys" }}
        "api_keys": {
          "stripe": "{{ .Data.data.stripe_key }}",
          "sendgrid": "{{ .Data.data.sendgrid_key }}"
        },
        {{- end }}
        "feature_flags": {
          {{- with secret "secret/data/app/features" }}
          "new_ui": {{ .Data.data.new_ui }},
          "beta_features": {{ .Data.data.beta_features }}
          {{- end }}
        }
      }
```

## Configuring Agent Behavior

Customize agent settings with annotations:

```yaml
metadata:
  annotations:
    # Enable injection
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "app"

    # Agent configuration
    vault.hashicorp.com/agent-limits-cpu: "250m"
    vault.hashicorp.com/agent-limits-mem: "128Mi"
    vault.hashicorp.com/agent-requests-cpu: "100m"
    vault.hashicorp.com/agent-requests-mem: "64Mi"

    # Vault address (if different from default)
    vault.hashicorp.com/agent-inject-address: "https://vault.company.com"

    # CA certificate
    vault.hashicorp.com/ca-cert: "/vault/tls/ca.crt"

    # Agent run as user
    vault.hashicorp.com/agent-run-as-user: "1000"
    vault.hashicorp.com/agent-run-as-group: "1000"

    # Preserve case in secret keys
    vault.hashicorp.com/preserve-secret-case: "true"

    # Secret file permissions
    vault.hashicorp.com/agent-inject-perms: "0644"

    # Inject secret
    vault.hashicorp.com/agent-inject-secret-database: "secret/data/app/database"
```

## Using Init Container Only

For secrets that don't change frequently, use only the init container:

```yaml
metadata:
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/agent-pre-populate-only: "true"  # No sidecar
    vault.hashicorp.com/role: "app"
    vault.hashicorp.com/agent-inject-secret-config: "secret/data/app/config"
```

This reduces resource usage but secrets won't update automatically.

## Injecting Multiple Secrets

Inject secrets from different paths:

```yaml
metadata:
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "app"

    # Database credentials
    vault.hashicorp.com/agent-inject-secret-database: "secret/data/app/database"
    vault.hashicorp.com/agent-inject-template-database: |
      {{- with secret "secret/data/app/database" -}}
      postgresql://{{ .Data.data.username }}:{{ .Data.data.password }}@{{ .Data.data.host }}:5432/{{ .Data.data.database }}
      {{- end -}}

    # API keys
    vault.hashicorp.com/agent-inject-secret-api-keys: "secret/data/app/api-keys"
    vault.hashicorp.com/agent-inject-template-api-keys: |
      {{- with secret "secret/data/app/api-keys" -}}
      STRIPE_KEY={{ .Data.data.stripe }}
      SENDGRID_KEY={{ .Data.data.sendgrid }}
      {{- end -}}

    # TLS certificates
    vault.hashicorp.com/agent-inject-secret-tls.crt: "pki/issue/app-role"
    vault.hashicorp.com/agent-inject-template-tls.crt: |
      {{- with secret "pki/issue/app-role" "common_name=app.example.com" -}}
      {{ .Data.certificate }}
      {{- end -}}

    vault.hashicorp.com/agent-inject-secret-tls.key: "pki/issue/app-role"
    vault.hashicorp.com/agent-inject-template-tls.key: |
      {{- with secret "pki/issue/app-role" "common_name=app.example.com" -}}
      {{ .Data.private_key }}
      {{- end -}}
```

## Working with Dynamic Secrets

Inject database credentials that rotate:

```yaml
metadata:
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "app"
    vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/app-role"
    vault.hashicorp.com/agent-inject-template-db-creds: |
      {{- with secret "database/creds/app-role" -}}
      username: {{ .Data.username }}
      password: {{ .Data.password }}
      lease_duration: {{ .LeaseDuration }}
      {{- end -}}

    # Revoke on shutdown
    vault.hashicorp.com/agent-revoke-on-shutdown: "true"

    # Grace period before lease expiry
    vault.hashicorp.com/agent-revoke-grace: "5s"
```

The sidecar automatically renews the lease before expiration.

## Configuring the Injector Service

Customize the injector webhook:

```yaml
# Custom injector values
injector:
  enabled: true
  replicas: 2

  # Webhook failure policy
  failurePolicy: Fail  # or Ignore to allow pods without injection

  # Namespace selector
  namespaceSelector:
    matchLabels:
      vault-injection: enabled

  # Resource limits
  resources:
    requests:
      memory: 128Mi
      cpu: 50m
    limits:
      memory: 256Mi
      cpu: 100m

  # Specific Vault address
  externalVaultAddr: "https://vault.company.com:8200"

  # Image configuration
  image:
    repository: "hashicorp/vault-k8s"
    tag: "latest"

  # Log level
  logLevel: "info"

  # Metrics
  metrics:
    enabled: true
```

Apply with Helm:

```bash
helm upgrade vault hashicorp/vault \
  --namespace vault \
  --values custom-injector-values.yaml
```

## Troubleshooting Injection Issues

Debug common problems:

```bash
# Check if webhook is running
kubectl -n vault get pods -l app.kubernetes.io/name=vault-agent-injector

# View webhook logs
kubectl -n vault logs -l app.kubernetes.io/name=vault-agent-injector

# Check webhook configuration
kubectl get mutatingwebhookconfiguration vault-agent-injector-cfg -o yaml

# Verify pod has correct annotations
kubectl get pod app-with-secrets -o yaml | grep -A 10 annotations

# Check init container logs
kubectl logs app-with-secrets -c vault-agent-init

# Check sidecar logs
kubectl logs app-with-secrets -c vault-agent -f

# Verify service account exists
kubectl get sa app-sa
```

Common issues:

**Injection not occurring:**
```bash
# Verify namespace is not excluded
kubectl get mutatingwebhookconfiguration vault-agent-injector-cfg \
  -o jsonpath='{.webhooks[0].namespaceSelector}'

# Check if annotation is correct (common typo)
kubectl get pod app-with-secrets -o yaml | grep vault.hashicorp.com/agent-inject
```

**Authentication failures:**
```bash
# Check role exists
vault read auth/kubernetes/role/app

# Verify service account matches role binding
vault read auth/kubernetes/role/app | grep bound_service_account_names
```

**Secrets not appearing:**
```bash
# Check volume mount
kubectl get pod app-with-secrets -o jsonpath='{.spec.containers[0].volumeMounts}' | jq

# Verify path in application
kubectl exec app-with-secrets -c app -- ls -la /vault/secrets/
```

## Performance Optimization

Reduce resource usage:

```yaml
metadata:
  annotations:
    # Use pre-populate only for static secrets
    vault.hashicorp.com/agent-pre-populate-only: "true"

    # Reduce resource requests
    vault.hashicorp.com/agent-limits-cpu: "100m"
    vault.hashicorp.com/agent-limits-mem: "64Mi"

    # Cache secrets
    vault.hashicorp.com/agent-cache-enable: "true"
```

## Security Best Practices

Implement secure injection patterns:

```yaml
metadata:
  annotations:
    # Use strict file permissions
    vault.hashicorp.com/agent-inject-perms: "0600"

    # Run as non-root
    vault.hashicorp.com/agent-run-as-user: "1000"
    vault.hashicorp.com/agent-run-as-group: "1000"

    # Use specific roles
    vault.hashicorp.com/role: "app-production"

    # Enable TLS
    vault.hashicorp.com/tls-skip-verify: "false"
    vault.hashicorp.com/ca-cert: "/vault/tls/ca.crt"
```

Vault Agent Injector provides transparent secret injection without requiring application code changes. By leveraging Kubernetes native patterns like init containers and sidecars, it delivers secrets securely while handling authentication, renewal, and updates automatically. This approach simplifies secret management and reduces the surface area for credential exposure in your applications.
