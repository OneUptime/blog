# How to Generate kubeconfig from ServiceAccount Token

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubeconfig, ServiceAccount, Authentication, CI/CD

Description: Learn how to create a kubeconfig file from a Kubernetes ServiceAccount token for CI/CD pipelines, external tools, or limited-access users.

---

Sometimes you need a kubeconfig file for a specific ServiceAccount rather than a user account. This is common for CI/CD pipelines, monitoring tools, or providing limited cluster access to team members. This guide shows you how to generate a complete kubeconfig from a ServiceAccount.

## When to Use ServiceAccount kubeconfig

- CI/CD pipelines (GitLab, Jenkins, GitHub Actions)
- External monitoring or management tools
- Limited-access users who should not have admin privileges
- Automation scripts that need cluster access
- Multi-cluster management tools

## Step 1: Create the ServiceAccount

Create a ServiceAccount with appropriate permissions:

```yaml
# serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci-deployer
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer-role
  namespace: production
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deployer-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: ci-deployer
  namespace: production
roleRef:
  kind: Role
  name: deployer-role
  apiGroup: rbac.authorization.k8s.io
```

Apply it:

```bash
kubectl apply -f serviceaccount.yaml
```

## Step 2: Get the Token

### Method A: Create a Long-Lived Token (Kubernetes 1.24+)

```yaml
# token-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ci-deployer-token
  namespace: production
  annotations:
    kubernetes.io/service-account.name: ci-deployer
type: kubernetes.io/service-account-token
```

```bash
kubectl apply -f token-secret.yaml

# Wait a moment for the token to be populated
sleep 2

# Get the token
TOKEN=$(kubectl get secret ci-deployer-token -n production -o jsonpath='{.data.token}' | base64 -d)
```

### Method B: Request a Time-Bound Token

```bash
# Create token valid for 1 year (8760 hours)
TOKEN=$(kubectl create token ci-deployer -n production --duration=8760h)
```

## Step 3: Get Cluster Information

```bash
# Get the API server URL
APISERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')

# Get the cluster CA certificate
kubectl config view --raw --minify -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' | base64 -d > ca.crt

# Or if using a secret-based token
kubectl get secret ci-deployer-token -n production -o jsonpath='{.data.ca\.crt}' | base64 -d > ca.crt
```

## Step 4: Generate the kubeconfig

### Option A: Manual kubeconfig File

Create the kubeconfig manually:

```yaml
# kubeconfig.yaml
apiVersion: v1
kind: Config
clusters:
- name: my-cluster
  cluster:
    server: https://k8s.example.com:6443
    certificate-authority-data: <BASE64_CA_CERT>
contexts:
- name: ci-deployer-context
  context:
    cluster: my-cluster
    namespace: production
    user: ci-deployer
current-context: ci-deployer-context
users:
- name: ci-deployer
  user:
    token: <TOKEN>
```

### Option B: Shell Script Generator

Use this script to generate a complete kubeconfig:

```bash
#!/bin/bash
# generate-kubeconfig.sh
# Usage: ./generate-kubeconfig.sh <serviceaccount> <namespace> [output-file]

SA_NAME=${1:-ci-deployer}
NAMESPACE=${2:-production}
OUTPUT=${3:-kubeconfig-${SA_NAME}.yaml}

# Get cluster info
APISERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
CLUSTER_NAME=$(kubectl config view --minify -o jsonpath='{.clusters[0].name}')

# Get CA certificate (base64 encoded)
CA_DATA=$(kubectl config view --raw --minify -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')

# Create token (valid for 1 year)
TOKEN=$(kubectl create token $SA_NAME -n $NAMESPACE --duration=8760h)

# Generate kubeconfig
cat > $OUTPUT << EOF
apiVersion: v1
kind: Config
clusters:
- name: ${CLUSTER_NAME}
  cluster:
    server: ${APISERVER}
    certificate-authority-data: ${CA_DATA}
contexts:
- name: ${SA_NAME}@${CLUSTER_NAME}
  context:
    cluster: ${CLUSTER_NAME}
    namespace: ${NAMESPACE}
    user: ${SA_NAME}
current-context: ${SA_NAME}@${CLUSTER_NAME}
users:
- name: ${SA_NAME}
  user:
    token: ${TOKEN}
EOF

echo "Generated kubeconfig: $OUTPUT"
echo "Test with: kubectl --kubeconfig=$OUTPUT get pods"
```

Make it executable and run:

```bash
chmod +x generate-kubeconfig.sh
./generate-kubeconfig.sh ci-deployer production
```

### Option C: Using kubectl Commands

Build kubeconfig using kubectl commands:

```bash
#!/bin/bash
# Build kubeconfig step by step

SA_NAME=ci-deployer
NAMESPACE=production
KUBECONFIG_FILE=kubeconfig-ci.yaml

# Start with empty kubeconfig
export KUBECONFIG=$KUBECONFIG_FILE

# Get cluster info from current context
APISERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}' --kubeconfig=$HOME/.kube/config)
CLUSTER_NAME=$(kubectl config view --minify -o jsonpath='{.clusters[0].name}' --kubeconfig=$HOME/.kube/config)
CA_DATA=$(kubectl config view --raw --minify -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' --kubeconfig=$HOME/.kube/config)

# Create token
TOKEN=$(kubectl create token $SA_NAME -n $NAMESPACE --duration=8760h --kubeconfig=$HOME/.kube/config)

# Build the kubeconfig
kubectl config set-cluster $CLUSTER_NAME \
  --server=$APISERVER \
  --certificate-authority=<(echo $CA_DATA | base64 -d) \
  --embed-certs=true

kubectl config set-credentials $SA_NAME \
  --token=$TOKEN

kubectl config set-context $SA_NAME@$CLUSTER_NAME \
  --cluster=$CLUSTER_NAME \
  --user=$SA_NAME \
  --namespace=$NAMESPACE

kubectl config use-context $SA_NAME@$CLUSTER_NAME

echo "Generated: $KUBECONFIG_FILE"
```

## Step 5: Verify the kubeconfig

Test that the generated kubeconfig works:

```bash
# Test listing pods
kubectl --kubeconfig=kubeconfig-ci-deployer.yaml get pods

# Verify limited permissions
kubectl --kubeconfig=kubeconfig-ci-deployer.yaml auth can-i create deployments
# yes

kubectl --kubeconfig=kubeconfig-ci-deployer.yaml auth can-i delete namespaces
# no
```

## Using in CI/CD

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - name: Configure kubectl
      run: |
        mkdir -p $HOME/.kube
        echo "${{ secrets.KUBECONFIG }}" | base64 -d > $HOME/.kube/config
        chmod 600 $HOME/.kube/config

    - name: Deploy
      run: |
        kubectl apply -f k8s/
```

Store the base64-encoded kubeconfig as a secret:

```bash
cat kubeconfig-ci.yaml | base64 -w0
# Add this output to GitHub Secrets as KUBECONFIG
```

### GitLab CI

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  script:
    - mkdir -p $HOME/.kube
    - echo "$KUBECONFIG" | base64 -d > $HOME/.kube/config
    - kubectl apply -f k8s/
```

### Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent any
    environment {
        KUBECONFIG = credentials('kubernetes-config')
    }
    stages {
        stage('Deploy') {
            steps {
                sh 'kubectl apply -f k8s/'
            }
        }
    }
}
```

## Token Rotation

Tokens should be rotated periodically. Set up a rotation process:

```bash
#!/bin/bash
# rotate-token.sh
# Run this periodically (cron job) to rotate the token

SA_NAME=ci-deployer
NAMESPACE=production
KUBECONFIG_FILE=/secure/path/kubeconfig-ci.yaml

# Generate new token
NEW_TOKEN=$(kubectl create token $SA_NAME -n $NAMESPACE --duration=8760h)

# Update kubeconfig
kubectl config set-credentials $SA_NAME --token=$NEW_TOKEN --kubeconfig=$KUBECONFIG_FILE

echo "Token rotated at $(date)"
```

## Security Considerations

1. **Limit token lifetime** - Use `--duration` to create time-bound tokens
2. **Restrict permissions** - Only grant necessary RBAC permissions
3. **Secure storage** - Store kubeconfig in secure secrets management
4. **Audit access** - Monitor API audit logs for ServiceAccount usage
5. **Rotate regularly** - Set up automated token rotation

```yaml
# Example: Read-only kubeconfig for monitoring
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: monitoring-readonly
rules:
- apiGroups: [""]
  resources: ["pods", "services", "endpoints", "nodes"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets", "statefulsets"]
  verbs: ["get", "list", "watch"]
```

## Troubleshooting

### Token Not Working

```bash
# Verify token is valid
kubectl auth whoami --token=$TOKEN

# Check ServiceAccount exists
kubectl get serviceaccount $SA_NAME -n $NAMESPACE

# Check RBAC permissions
kubectl auth can-i --list --as=system:serviceaccount:$NAMESPACE:$SA_NAME
```

### Certificate Issues

```bash
# Verify CA certificate matches
openssl x509 -in ca.crt -noout -text | head -20

# Test connection with curl
curl --cacert ca.crt -H "Authorization: Bearer $TOKEN" $APISERVER/api/v1/namespaces
```

## Summary

Generating a kubeconfig from a ServiceAccount involves gathering the cluster CA certificate, API server URL, and a token for the ServiceAccount. Use time-bound tokens for better security, and restrict RBAC permissions to only what is needed. Store the kubeconfig securely in your CI/CD system and rotate tokens regularly. This approach provides controlled, auditable cluster access for automation and external tools.
