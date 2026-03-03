# How to Encrypt Helm Values Files for ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, SOPS

Description: Learn how to encrypt sensitive Helm values files using SOPS and the helm-secrets plugin for secure GitOps deployments with ArgoCD, keeping credentials safe in your Git repository.

---

Helm values files often contain sensitive data like database passwords, API keys, and connection strings. Storing these in plaintext in Git is a security risk, but your GitOps workflow requires them to be in the repository. The solution is encrypting these values files so they can safely live in Git while ArgoCD decrypts them at deploy time.

In this guide, I will walk you through setting up SOPS encryption for Helm values files and configuring ArgoCD to decrypt them automatically during sync operations.

## Understanding the Problem

A typical Helm values file might look like this:

```yaml
# values-production.yaml - DO NOT commit this as plaintext
database:
  host: postgres.internal.example.com
  port: 5432
  username: app_user
  password: "s3cret_p@ssw0rd_123"  # This is the problem

redis:
  host: redis.internal.example.com
  password: "r3d1s_p@ss"

api:
  secretKey: "jwt_s1gn1ng_k3y_abc123"
  thirdPartyApiKey: "sk-live-abc123def456"
```

You need these values for Helm to deploy correctly, but committing them means anyone with repo access can read your production credentials.

## Setting Up SOPS with Age Encryption

Age is the recommended encryption backend for SOPS. It is simpler than GPG and easier to manage:

```bash
# Install age
brew install age

# Generate a key pair
age-keygen -o age-key.txt

# The output shows your public key
# age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p

# Install SOPS
brew install sops
```

Create a `.sops.yaml` configuration file for your repository:

```yaml
# .sops.yaml
creation_rules:
  # Encrypt only specific keys in values files
  - path_regex: .*values.*\.enc\.yaml$
    encrypted_regex: "^(password|secretKey|apiKey|thirdPartyApiKey|token|secret)$"
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p

  # Encrypt everything in files ending with .secret.yaml
  - path_regex: .*\.secret\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

Now encrypt your values file:

```bash
# Encrypt the values file
sops --encrypt values-production.yaml > values-production.enc.yaml

# Or encrypt in-place
sops --encrypt --in-place values-production.enc.yaml
```

The encrypted file looks like this:

```yaml
# values-production.enc.yaml - safe to commit
database:
  host: postgres.internal.example.com
  port: 5432
  username: app_user
  password: ENC[AES256_GCM,data:p673w+qlNDBMaBzNfQ==,iv:YY=,tag:A=,type:str]

redis:
  host: redis.internal.example.com
  password: ENC[AES256_GCM,data:Hx0xp45==,iv:Z=,tag:B=,type:str]

api:
  secretKey: ENC[AES256_GCM,data:DkWp8Fy3==,iv:W=,tag:C=,type:str]
  thirdPartyApiKey: ENC[AES256_GCM,data:GhT9p+3x==,iv:V=,tag:D=,type:str]

sops:
  age:
    - recipient: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
      enc: |
        -----BEGIN AGE ENCRYPTED FILE-----
        YWdlLWVuY3J5cHRpb24ub3JnL3YxCi0+IFgyNTUxOSBDbFl...
        -----END AGE ENCRYPTED FILE-----
  lastmodified: "2026-02-26T10:00:00Z"
  version: 3.8.0
```

Notice that non-sensitive values like hostnames and ports remain readable. Only the fields matching `encrypted_regex` are encrypted.

## Configuring ArgoCD to Decrypt SOPS Files

ArgoCD needs a Config Management Plugin (CMP) to handle SOPS decryption. Create a sidecar-based plugin:

```yaml
# argocd-repo-server-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      # Mount the age key as a volume
      volumes:
        - name: sops-age-key
          secret:
            secretName: sops-age-key

      containers:
        # The SOPS+Helm plugin sidecar
        - name: helm-sops
          image: alpine:3.19
          command: ["/var/run/argocd/argocd-cmp-server"]
          env:
            - name: SOPS_AGE_KEY_FILE
              value: /sops/age-key.txt
          volumeMounts:
            - name: var-files
              mountPath: /var/run/argocd
            - name: plugins
              mountPath: /home/argocd/cmp-server/plugins
            - name: sops-age-key
              mountPath: /sops
            - name: cmp-tmp
              mountPath: /tmp
          securityContext:
            runAsNonRoot: true
            runAsUser: 999

      initContainers:
        - name: install-tools
          image: alpine:3.19
          command:
            - sh
            - -c
            - |
              # Install sops, helm, and kustomize
              wget -O /custom-tools/sops https://github.com/getsops/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
              chmod +x /custom-tools/sops
              wget -O- https://get.helm.sh/helm-v3.14.0-linux-amd64.tar.gz | tar xz -C /custom-tools --strip-components=1 linux-amd64/helm
              chmod +x /custom-tools/helm
          volumeMounts:
            - name: custom-tools
              mountPath: /custom-tools
```

Create the plugin configuration:

```yaml
# cmp-plugin.yaml - ConfigMap for the plugin
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmp-cm
  namespace: argocd
data:
  plugin.yaml: |
    apiVersion: argoproj.io/v1alpha1
    kind: ConfigManagementPlugin
    metadata:
      name: helm-sops
    spec:
      version: v1.0
      init:
        command: ["/bin/sh", "-c"]
        args:
          - |
            # Decrypt all .enc.yaml files
            for f in $(find . -name '*.enc.yaml' -o -name '*.enc.yml'); do
              sops --decrypt "$f" > "${f%.enc.yaml}.yaml.dec" 2>/dev/null || \
              sops --decrypt "$f" > "${f%.enc.yml}.yml.dec" 2>/dev/null || true
            done
      generate:
        command: ["/bin/sh", "-c"]
        args:
          - |
            # Find the chart directory
            CHART_DIR="."

            # Build the helm command
            HELM_CMD="helm template $ARGOCD_APP_NAME $CHART_DIR"

            # Add all values files (prefer decrypted versions)
            for f in $(find . -name 'values*.yaml' -o -name 'values*.yml' | sort); do
              if [ -f "${f}.dec" ]; then
                HELM_CMD="$HELM_CMD -f ${f}.dec"
              elif [[ ! "$f" == *".enc."* ]]; then
                HELM_CMD="$HELM_CMD -f $f"
              fi
            done

            eval $HELM_CMD
      discover:
        find:
          glob: "**/Chart.yaml"
```

Store the age private key as a Kubernetes Secret:

```bash
# Create the secret with the age private key
kubectl create secret generic sops-age-key \
  --from-file=age-key.txt=age-key.txt \
  -n argocd
```

## Using the Plugin in ArgoCD Applications

Configure your ArgoCD Application to use the helm-sops plugin:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/helm-apps.git
    targetRevision: main
    path: charts/myapp
    plugin:
      name: helm-sops
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
```

## Alternative: helm-secrets Plugin

The helm-secrets plugin provides a more native Helm experience. Install it in the ArgoCD repo server:

```yaml
# Dockerfile for custom repo server
FROM quay.io/argoproj/argocd:v2.10.0

# Switch to root to install
USER root

# Install helm-secrets plugin
RUN helm plugin install https://github.com/jkroepke/helm-secrets --version v4.5.1

# Install sops
RUN wget -O /usr/local/bin/sops \
  https://github.com/getsops/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64 && \
  chmod +x /usr/local/bin/sops

# Install age
RUN wget -O /usr/local/bin/age \
  https://github.com/FiloSottile/age/releases/download/v1.1.1/age-v1.1.1-linux-amd64.tar.gz && \
  tar xzf /usr/local/bin/age -C /usr/local/bin/ --strip-components=1

USER argocd
```

With helm-secrets installed, you can reference encrypted values files directly:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/helm-apps.git
    targetRevision: main
    path: charts/myapp
    helm:
      valueFiles:
        - values.yaml
        - secrets://values-production.enc.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Multi-Environment Setup

Structure your Helm chart for multiple environments with encrypted values per environment:

```text
charts/myapp/
  Chart.yaml
  values.yaml                    # Shared defaults (no secrets)
  values-staging.enc.yaml        # Encrypted staging secrets
  values-production.enc.yaml     # Encrypted production secrets
  templates/
    deployment.yaml
    service.yaml
    secret.yaml
```

The base `values.yaml` contains non-sensitive defaults:

```yaml
# values.yaml - no secrets here
replicaCount: 2
image:
  repository: myapp
  tag: latest

database:
  host: ""
  port: 5432
  username: ""
  password: ""

resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
```

Each encrypted file overrides only the sensitive values:

```bash
# Create staging secrets
cat > values-staging.yaml << 'EOF'
database:
  host: staging-db.internal.example.com
  username: staging_user
  password: staging_password_123
EOF

# Encrypt it
sops --encrypt values-staging.yaml > values-staging.enc.yaml
rm values-staging.yaml
```

## Rotating Encrypted Values

When you need to update a secret:

```bash
# Decrypt, edit, re-encrypt
sops values-production.enc.yaml
# This opens your editor with the decrypted content
# Make changes and save - SOPS re-encrypts automatically

# Or update a specific value
sops --set '["database"]["password"] "new_password_456"' values-production.enc.yaml

# Commit the updated encrypted file
git add values-production.enc.yaml
git commit -m "rotate database password"
git push
```

ArgoCD detects the change in Git and syncs the application with the new decrypted values.

## Security Best Practices

1. Never commit the age private key to Git
2. Store the age private key in a secure location outside of Git
3. Use different age keys for different environments
4. Rotate age keys periodically and re-encrypt all files
5. Use `encrypted_regex` to only encrypt sensitive fields, keeping the rest readable for code review
6. Add `*.yaml.dec` to `.gitignore` to prevent decrypted files from being committed

```gitignore
# .gitignore
*.yaml.dec
*.yml.dec
age-key.txt
*.key
```

## Summary

Encrypting Helm values files with SOPS provides a practical way to store sensitive configuration in Git safely. Combined with ArgoCD's Config Management Plugin system, you get a workflow where encrypted values are committed to Git, ArgoCD decrypts them at sync time, and Helm renders the final manifests with real credentials. This keeps your GitOps workflow intact while ensuring secrets never appear in plaintext in your repository.
