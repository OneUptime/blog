# How to Implement Init Containers for Kubernetes Secret Decryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Init Containers, Security

Description: Learn how to use init containers to decrypt secrets from external vaults or encrypted storage before your application starts, improving security and secret management.

---

While Kubernetes provides native secret management, many organizations require additional encryption layers for compliance or security policies. Init containers offer a secure pattern for decrypting secrets from external vaults like HashiCorp Vault, AWS Secrets Manager, or encrypted ConfigMaps before your application starts.

This approach ensures that your application receives decrypted secrets only at runtime, never stores them in plain text in your cluster, and can rotate secrets without rebuilding container images. Init containers handle the complex authentication, decryption, and secret injection workflow before your main application starts.

## Why Use Init Containers for Secret Decryption

Kubernetes secrets are base64-encoded by default, which provides no real encryption. While encryption at rest can be enabled, many organizations use external secret management systems for centralized control, audit logging, and compliance requirements.

Init containers separate secret management from application logic. Your application doesn't need to know how to authenticate with Vault or AWS. It simply reads decrypted secrets from a file or environment variable that the init container prepares.

This pattern also enables dynamic secret rotation. Init containers can fetch short-lived credentials or dynamically generated passwords, improving security posture without requiring application changes.

## Basic Vault Secret Decryption

HashiCorp Vault is a popular secret management platform. This example shows how to use an init container to authenticate with Vault and retrieve secrets.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-service-account
  namespace: default
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-agent-config
  namespace: default
data:
  vault-agent.hcl: |
    exit_after_auth = true
    pid_file = "/tmp/vault-agent.pid"

    auto_auth {
      method "kubernetes" {
        mount_path = "auth/kubernetes"
        config = {
          role = "app-role"
        }
      }

      sink "file" {
        config = {
          path = "/vault/token"
        }
      }
    }

    template {
      source      = "/vault/templates/database.tmpl"
      destination = "/secrets/database.json"
    }

    template {
      source      = "/vault/templates/api-keys.tmpl"
      destination = "/secrets/api-keys.json"
    }

  database.tmpl: |
    {{ with secret "secret/data/database/prod" }}
    {
      "host": "{{ .Data.data.host }}",
      "port": {{ .Data.data.port }},
      "username": "{{ .Data.data.username }}",
      "password": "{{ .Data.data.password }}",
      "database": "{{ .Data.data.database }}"
    }
    {{ end }}

  api-keys.tmpl: |
    {{ with secret "secret/data/api/keys" }}
    {
      "stripe_key": "{{ .Data.data.stripe_key }}",
      "sendgrid_key": "{{ .Data.data.sendgrid_key }}",
      "aws_access_key": "{{ .Data.data.aws_access_key }}",
      "aws_secret_key": "{{ .Data.data.aws_secret_key }}"
    }
    {{ end }}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      serviceAccountName: app-service-account

      initContainers:
      - name: vault-agent
        image: hashicorp/vault:1.15.0
        command:
        - sh
        - -c
        - |
          echo "Starting Vault Agent for secret retrieval..."

          # Run vault agent to authenticate and fetch secrets
          vault agent -config=/vault/config/vault-agent.hcl

          # Verify secrets were written
          if [ ! -f /secrets/database.json ]; then
            echo "Failed to retrieve database secrets"
            exit 1
          fi

          if [ ! -f /secrets/api-keys.json ]; then
            echo "Failed to retrieve API key secrets"
            exit 1
          fi

          echo "Successfully retrieved all secrets"

          # Set restrictive permissions
          chmod 600 /secrets/*.json

          # Show secret files were created (without content)
          ls -la /secrets/
        env:
        - name: VAULT_ADDR
          value: "https://vault.vault-system.svc.cluster.local:8200"
        - name: VAULT_SKIP_VERIFY
          value: "false"
        - name: VAULT_CACERT
          value: "/vault/tls/ca.crt"
        volumeMounts:
        - name: vault-config
          mountPath: /vault/config
        - name: vault-templates
          mountPath: /vault/templates
        - name: vault-tls
          mountPath: /vault/tls
        - name: secrets
          mountPath: /secrets

      containers:
      - name: app
        image: myorg/secure-app:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_CONFIG_FILE
          value: "/secrets/database.json"
        - name: API_KEYS_FILE
          value: "/secrets/api-keys.json"
        volumeMounts:
        - name: secrets
          mountPath: /secrets
          readOnly: true
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      volumes:
      - name: vault-config
        configMap:
          name: vault-agent-config
          items:
          - key: vault-agent.hcl
            path: vault-agent.hcl
      - name: vault-templates
        configMap:
          name: vault-agent-config
          items:
          - key: database.tmpl
            path: database.tmpl
          - key: api-keys.tmpl
            path: api-keys.tmpl
      - name: vault-tls
        secret:
          secretName: vault-ca-cert
      - name: secrets
        emptyDir:
          medium: Memory
```

The init container uses Vault Agent to authenticate via Kubernetes service account tokens and retrieve secrets using templates. Secrets are written to an in-memory volume that only exists for the pod's lifetime.

## AWS Secrets Manager Integration

For applications running on AWS EKS, AWS Secrets Manager provides managed secret storage with automatic rotation support.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-with-irsa
  namespace: default
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/app-secrets-reader
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aws-secrets-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: aws-secrets-app
  template:
    metadata:
      labels:
        app: aws-secrets-app
    spec:
      serviceAccountName: app-with-irsa

      initContainers:
      - name: fetch-secrets
        image: amazon/aws-cli:2.13.0
        command:
        - sh
        - -c
        - |
          #!/bin/sh
          set -e

          echo "Fetching secrets from AWS Secrets Manager..."

          # Fetch database credentials
          aws secretsmanager get-secret-value \
            --region us-east-1 \
            --secret-id prod/database/credentials \
            --query SecretString \
            --output text > /secrets/database.json

          # Fetch API keys
          aws secretsmanager get-secret-value \
            --region us-east-1 \
            --secret-id prod/api/keys \
            --query SecretString \
            --output text > /secrets/api-keys.json

          # Fetch TLS certificates
          aws secretsmanager get-secret-value \
            --region us-east-1 \
            --secret-id prod/tls/certificate \
            --query SecretString \
            --output text > /secrets/tls-cert.pem

          aws secretsmanager get-secret-value \
            --region us-east-1 \
            --secret-id prod/tls/private-key \
            --query SecretString \
            --output text > /secrets/tls-key.pem

          # Set permissions
          chmod 600 /secrets/*

          echo "Successfully fetched all secrets"
          ls -la /secrets/
        env:
        - name: AWS_REGION
          value: "us-east-1"
        volumeMounts:
        - name: secrets
          mountPath: /secrets

      containers:
      - name: app
        image: myorg/aws-app:v1.0.0
        ports:
        - containerPort: 8443
          name: https
        env:
        - name: DATABASE_CREDENTIALS
          value: "/secrets/database.json"
        - name: API_KEYS_FILE
          value: "/secrets/api-keys.json"
        - name: TLS_CERT_FILE
          value: "/secrets/tls-cert.pem"
        - name: TLS_KEY_FILE
          value: "/secrets/tls-key.pem"
        volumeMounts:
        - name: secrets
          mountPath: /secrets
          readOnly: true
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      volumes:
      - name: secrets
        emptyDir:
          medium: Memory
```

This deployment uses IRSA (IAM Roles for Service Accounts) to authenticate with AWS. The init container fetches secrets and writes them to an in-memory volume.

## Decrypting Encrypted ConfigMaps with Mozilla SOPS

Mozilla SOPS allows encrypting configuration files that can be checked into version control. Init containers can decrypt them at runtime.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: encrypted-config
  namespace: default
data:
  config.enc.yaml: |
    apiVersion: ENC[AES256_GCM,data:Cl8=,iv:xxx,tag:xxx,type:str]
    kind: ENC[AES256_GCM,data:U2VjcmV0,iv:yyy,tag:yyy,type:str]
    metadata:
        name: ENC[AES256_GCM,data:cHJvZC1zZWNyZXRz,iv:zzz,tag:zzz,type:str]
    data:
        database_password: ENC[AES256_GCM,data:c3VwZXJzZWNyZXQ=,iv:aaa,tag:aaa,type:str]
        api_key: ENC[AES256_GCM,data:YWJjMTIzZGVmNDU2,iv:bbb,tag:bbb,type:str]
    sops:
        kms:
        - arn: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
          created_at: '2024-01-15T10:30:00Z'
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sops-decryption-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sops-app
  template:
    metadata:
      labels:
        app: sops-app
    spec:
      serviceAccountName: app-with-irsa

      initContainers:
      - name: sops-decrypt
        image: mozilla/sops:v3.8.1
        command:
        - sh
        - -c
        - |
          #!/bin/sh
          set -e

          echo "Decrypting configuration with SOPS..."

          # Decrypt the encrypted config
          sops --decrypt /encrypted/config.enc.yaml > /secrets/config.yaml

          if [ ! -f /secrets/config.yaml ]; then
            echo "Failed to decrypt configuration"
            exit 1
          fi

          echo "Successfully decrypted configuration"

          # Extract individual secrets from decrypted YAML
          grep "database_password:" /secrets/config.yaml | awk '{print $2}' > /secrets/db_password
          grep "api_key:" /secrets/config.yaml | awk '{print $2}' > /secrets/api_key

          # Set restrictive permissions
          chmod 600 /secrets/*

          echo "Secrets extracted and ready"
        env:
        - name: AWS_REGION
          value: "us-east-1"
        volumeMounts:
        - name: encrypted-config
          mountPath: /encrypted
        - name: secrets
          mountPath: /secrets

      containers:
      - name: app
        image: myorg/sops-app:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: CONFIG_FILE
          value: "/secrets/config.yaml"
        volumeMounts:
        - name: secrets
          mountPath: /secrets
          readOnly: true
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      volumes:
      - name: encrypted-config
        configMap:
          name: encrypted-config
      - name: secrets
        emptyDir:
          medium: Memory
```

SOPS decrypts the configuration using AWS KMS. The encrypted config can be stored in Git safely, while decryption happens at runtime.

## Google Cloud Secret Manager Integration

For GKE clusters, Google Cloud Secret Manager provides similar functionality to AWS Secrets Manager.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-gsa
  namespace: default
  annotations:
    iam.gke.io/gcp-service-account: app-secrets@project-id.iam.gserviceaccount.com
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gcp-secrets-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gcp-secrets-app
  template:
    metadata:
      labels:
        app: gcp-secrets-app
    spec:
      serviceAccountName: app-gsa

      initContainers:
      - name: fetch-gcp-secrets
        image: google/cloud-sdk:slim
        command:
        - sh
        - -c
        - |
          #!/bin/sh
          set -e

          PROJECT_ID="my-gcp-project"

          echo "Fetching secrets from Google Cloud Secret Manager..."

          # Fetch database credentials
          gcloud secrets versions access latest \
            --secret="database-credentials" \
            --project="${PROJECT_ID}" > /secrets/database.json

          # Fetch API keys
          gcloud secrets versions access latest \
            --secret="api-keys" \
            --project="${PROJECT_ID}" > /secrets/api-keys.json

          # Fetch service account key
          gcloud secrets versions access latest \
            --secret="service-account-key" \
            --project="${PROJECT_ID}" > /secrets/service-account.json

          chmod 600 /secrets/*

          echo "Successfully fetched all secrets"
        volumeMounts:
        - name: secrets
          mountPath: /secrets

      containers:
      - name: app
        image: myorg/gcp-app:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_CREDENTIALS
          value: "/secrets/database.json"
        - name: API_KEYS_FILE
          value: "/secrets/api-keys.json"
        - name: GOOGLE_APPLICATION_CREDENTIALS
          value: "/secrets/service-account.json"
        volumeMounts:
        - name: secrets
          mountPath: /secrets
          readOnly: true
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      volumes:
      - name: secrets
        emptyDir:
          medium: Memory
```

Workload Identity binds the Kubernetes service account to a GCP service account, enabling secure authentication to Secret Manager.

## Custom Encryption with Age or GPG

For environments without managed secret services, you can use tools like Age or GPG to encrypt secrets.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: decryption-key
  namespace: default
type: Opaque
data:
  age-key: AGE-SECRET-KEY-1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ...
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: encrypted-secrets
  namespace: default
data:
  database.age: |
    -----BEGIN AGE ENCRYPTED FILE-----
    YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IFgyNTUxOSBLd...
    -----END AGE ENCRYPTED FILE-----

  api-keys.age: |
    -----BEGIN AGE ENCRYPTED FILE-----
    YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IFgyNTUxOSB...
    -----END AGE ENCRYPTED FILE-----
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: age-encrypted-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: age-encrypted-app
  template:
    metadata:
      labels:
        app: age-encrypted-app
    spec:
      initContainers:
      - name: age-decrypt
        image: alpine:3.18
        command:
        - sh
        - -c
        - |
          #!/bin/sh
          set -e

          # Install age
          apk add --no-cache age

          echo "Decrypting secrets with Age..."

          # Decrypt database credentials
          age --decrypt \
            --identity /keys/age-key \
            --output /secrets/database.json \
            /encrypted/database.age

          # Decrypt API keys
          age --decrypt \
            --identity /keys/age-key \
            --output /secrets/api-keys.json \
            /encrypted/api-keys.age

          chmod 600 /secrets/*

          echo "Successfully decrypted all secrets"
        volumeMounts:
        - name: decryption-key
          mountPath: /keys
          readOnly: true
        - name: encrypted-secrets
          mountPath: /encrypted
        - name: secrets
          mountPath: /secrets

      containers:
      - name: app
        image: myorg/age-app:v1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_CREDENTIALS
          value: "/secrets/database.json"
        - name: API_KEYS_FILE
          value: "/secrets/api-keys.json"
        volumeMounts:
        - name: secrets
          mountPath: /secrets
          readOnly: true
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

      volumes:
      - name: decryption-key
        secret:
          secretName: decryption-key
          defaultMode: 0400
      - name: encrypted-secrets
        configMap:
          name: encrypted-secrets
      - name: secrets
        emptyDir:
          medium: Memory
```

Age provides simple, modern encryption without requiring external services. The decryption key is stored as a Kubernetes secret, and encrypted data lives in ConfigMaps.

## Security Best Practices

Always use in-memory volumes for decrypted secrets to prevent them from being written to disk. Set restrictive file permissions (600) on decrypted secret files.

Minimize the lifetime of decrypted secrets. Fetch them as late as possible and consider implementing secret rotation through sidecar containers.

Use separate service accounts with minimal permissions for secret access. Apply the principle of least privilege to limit what secrets each application can access.

Implement audit logging for secret access. Most managed secret services provide audit trails that show when secrets were accessed and by whom.

Never log decrypted secret values. Ensure your init container scripts don't accidentally output sensitive data to stdout or stderr.

## Conclusion

Init containers provide a secure, flexible pattern for decrypting and injecting secrets into Kubernetes applications. Whether you're using managed services like Vault, AWS Secrets Manager, or GCP Secret Manager, or implementing custom encryption with tools like SOPS or Age, init containers handle the complex authentication and decryption workflow before your application starts. This separation of concerns improves security by keeping secret management logic out of application code and enables centralized control over sensitive data access across your entire platform.
