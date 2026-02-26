# Automate ArgoCD Cluster Registration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Automation, Multi-Cluster

Description: Learn how to automate ArgoCD cluster registration using scripts, Kubernetes secrets, and CI/CD pipelines for scalable multi-cluster GitOps management.

---

Managing a multi-cluster Kubernetes environment with ArgoCD means registering each cluster so ArgoCD can deploy workloads to it. In small setups, the `argocd cluster add` command works fine. But when you are provisioning clusters regularly - through Terraform, Cluster API, or cloud provider APIs - manual registration becomes a bottleneck. This guide covers several approaches to automating ArgoCD cluster registration.

## How ArgoCD Stores Cluster Information

Before automating, it helps to understand what happens under the hood. When you run `argocd cluster add`, ArgoCD:

1. Creates a ServiceAccount in the target cluster's `kube-system` namespace
2. Binds it to a ClusterRole with broad permissions
3. Retrieves the ServiceAccount token
4. Stores the cluster connection details as a Kubernetes Secret in the `argocd` namespace

That Secret has a specific label: `argocd.argoproj.io/secret-type: cluster`. This is the key insight for automation - you can create these Secrets directly without using the CLI.

## Automating with the ArgoCD CLI

The simplest automation approach wraps the ArgoCD CLI:

```bash
#!/bin/bash
# register-cluster.sh - Register a Kubernetes cluster with ArgoCD
set -euo pipefail

CLUSTER_NAME="${1:?Usage: $0 <cluster-name> <kubeconfig-context>}"
CONTEXT="${2:?Specify kubeconfig context}"
LABELS="${3:-}"
ARGOCD_SERVER="${ARGOCD_SERVER:-argocd.example.com}"

echo "Registering cluster: ${CLUSTER_NAME} (context: ${CONTEXT})"

# Verify we can reach the cluster
if ! kubectl --context "${CONTEXT}" cluster-info &>/dev/null; then
  echo "ERROR: Cannot connect to cluster using context '${CONTEXT}'"
  exit 1
fi

# Check if already registered
if argocd cluster get "${CLUSTER_NAME}" &>/dev/null; then
  echo "Cluster '${CLUSTER_NAME}' is already registered. Updating..."
  argocd cluster rm "${CLUSTER_NAME}" --yes
fi

# Register the cluster
argocd cluster add "${CONTEXT}" \
  --name "${CLUSTER_NAME}" \
  --yes

# Apply labels if provided
if [[ -n "${LABELS}" ]]; then
  echo "Applying labels: ${LABELS}"
  # Labels are comma-separated key=value pairs
  IFS=',' read -ra LABEL_PAIRS <<< "${LABELS}"
  for pair in "${LABEL_PAIRS[@]}"; do
    argocd cluster set "${CLUSTER_NAME}" --label "${pair}"
  done
fi

# Verify registration
echo "Verifying cluster connection..."
argocd cluster get "${CLUSTER_NAME}"

echo "Cluster '${CLUSTER_NAME}' registered successfully"
```

## Direct Secret Creation

For automation scenarios where you cannot use the ArgoCD CLI (CI/CD pipelines, Terraform, etc.), create the cluster Secret directly:

```bash
#!/bin/bash
# register-cluster-secret.sh - Register cluster via Kubernetes Secret
set -euo pipefail

CLUSTER_NAME="${1:?Usage: $0 <cluster-name> <api-server-url> <bearer-token> [ca-data]}"
API_SERVER="${2:?Specify API server URL}"
BEARER_TOKEN="${3:?Specify bearer token}"
CA_DATA="${4:-}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"

echo "Registering cluster via Secret: ${CLUSTER_NAME}"

# Build the cluster config JSON
if [[ -n "${CA_DATA}" ]]; then
  CLUSTER_CONFIG=$(cat <<CONF
{
  "bearerToken": "${BEARER_TOKEN}",
  "tlsClientConfig": {
    "insecure": false,
    "caData": "${CA_DATA}"
  }
}
CONF
)
else
  CLUSTER_CONFIG=$(cat <<CONF
{
  "bearerToken": "${BEARER_TOKEN}",
  "tlsClientConfig": {
    "insecure": true
  }
}
CONF
)
fi

# Create the Secret
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: cluster-${CLUSTER_NAME}
  namespace: ${NAMESPACE}
  labels:
    argocd.argoproj.io/secret-type: cluster
    environment: $(echo "${CLUSTER_NAME}" | grep -oP '(dev|staging|prod)' || echo "unknown")
    cluster-name: ${CLUSTER_NAME}
type: Opaque
stringData:
  name: "${CLUSTER_NAME}"
  server: "${API_SERVER}"
  config: '${CLUSTER_CONFIG}'
EOF

echo "Cluster Secret created. ArgoCD will detect it automatically."
```

## Batch Registration from a Configuration File

When you have multiple clusters to register at once:

```bash
#!/bin/bash
# batch-register-clusters.sh - Register multiple clusters from config
set -euo pipefail

CONFIG_FILE="${1:?Usage: $0 <clusters.yaml>}"
NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"

# Process each cluster entry using yq
CLUSTER_COUNT=$(yq '.clusters | length' "${CONFIG_FILE}")

echo "Registering ${CLUSTER_COUNT} clusters..."

for i in $(seq 0 $((CLUSTER_COUNT - 1))); do
  NAME=$(yq ".clusters[${i}].name" "${CONFIG_FILE}")
  SERVER=$(yq ".clusters[${i}].server" "${CONFIG_FILE}")
  TOKEN=$(yq ".clusters[${i}].token" "${CONFIG_FILE}")
  CA_DATA=$(yq ".clusters[${i}].caData // \"\"" "${CONFIG_FILE}")
  ENV=$(yq ".clusters[${i}].environment // \"unknown\"" "${CONFIG_FILE}")

  echo "---"
  echo "Registering: ${NAME} (${SERVER})"

  # Build config
  if [[ -n "${CA_DATA}" && "${CA_DATA}" != "null" ]]; then
    CONFIG="{\"bearerToken\":\"${TOKEN}\",\"tlsClientConfig\":{\"insecure\":false,\"caData\":\"${CA_DATA}\"}}"
  else
    CONFIG="{\"bearerToken\":\"${TOKEN}\",\"tlsClientConfig\":{\"insecure\":true}}"
  fi

  cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: cluster-${NAME}
  namespace: ${NAMESPACE}
  labels:
    argocd.argoproj.io/secret-type: cluster
    environment: ${ENV}
    managed-by: automation
type: Opaque
stringData:
  name: "${NAME}"
  server: "${SERVER}"
  config: '${CONFIG}'
EOF

  echo "  Registered: ${NAME}"
done

echo ""
echo "All ${CLUSTER_COUNT} clusters registered"
```

The clusters configuration file looks like this:

```yaml
# clusters.yaml
clusters:
  - name: dev-us-east
    server: https://dev-east.k8s.example.com
    token: eyJhbGciOiJSUzI1NiIsImtpZCI6...
    caData: LS0tLS1CRUdJTi...
    environment: dev
  - name: staging-us-east
    server: https://staging-east.k8s.example.com
    token: eyJhbGciOiJSUzI1NiIsImtpZCI6...
    caData: LS0tLS1CRUdJTi...
    environment: staging
  - name: prod-us-east
    server: https://prod-east.k8s.example.com
    token: eyJhbGciOiJSUzI1NiIsImtpZCI6...
    caData: LS0tLS1CRUdJTi...
    environment: production
```

## Integration with Terraform

If you provision clusters with Terraform, you can register them with ArgoCD as part of the same workflow:

```hcl
# terraform/argocd-cluster.tf

resource "kubernetes_secret" "argocd_cluster" {
  metadata {
    name      = "cluster-${var.cluster_name}"
    namespace = "argocd"
    labels = {
      "argocd.argoproj.io/secret-type" = "cluster"
      "environment"                     = var.environment
      "region"                          = var.region
      "managed-by"                      = "terraform"
    }
  }

  data = {
    name   = var.cluster_name
    server = var.cluster_endpoint
    config = jsonencode({
      bearerToken = var.cluster_token
      tlsClientConfig = {
        insecure = false
        caData   = base64encode(var.cluster_ca_cert)
      }
    })
  }

  type = "Opaque"
}
```

## Post-Registration Validation Script

After registering clusters, validate that ArgoCD can actually communicate with them:

```bash
#!/bin/bash
# validate-clusters.sh - Verify all registered clusters are reachable
set -euo pipefail

echo "Validating ArgoCD cluster connections..."
echo ""

TOTAL=0
HEALTHY=0
UNHEALTHY=0

argocd cluster list -o json | jq -r '.[] | "\(.name)\t\(.server)\t\(.connectionState.status)"' | \
  while IFS=$'\t' read -r name server status; do
    TOTAL=$((TOTAL + 1))
    if [[ "${status}" == "Successful" ]]; then
      echo "  OK:   ${name} (${server})"
      HEALTHY=$((HEALTHY + 1))
    else
      echo "  FAIL: ${name} (${server}) - Status: ${status}"
      UNHEALTHY=$((UNHEALTHY + 1))
    fi
  done

echo ""
echo "Validation complete"
echo "  Total:     ${TOTAL}"
echo "  Healthy:   ${HEALTHY}"
echo "  Unhealthy: ${UNHEALTHY}"

[[ ${UNHEALTHY} -eq 0 ]] || exit 1
```

## Auto-Registration with Cluster API

If you use Cluster API for provisioning, you can set up a controller or simple watch loop that detects new clusters and registers them automatically:

```bash
#!/bin/bash
# watch-new-clusters.sh - Watch for new CAPI clusters and register them
set -euo pipefail

NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"

echo "Watching for new Cluster API clusters..."

kubectl get clusters --all-namespaces -w -o json | jq --unbuffered -r \
  'select(.status.phase == "Provisioned") | "\(.metadata.name)\t\(.metadata.namespace)"' | \
  while IFS=$'\t' read -r cluster_name cluster_ns; do
    echo "New cluster detected: ${cluster_name} in ${cluster_ns}"

    # Get the kubeconfig for the new cluster
    KUBECONFIG_SECRET="${cluster_name}-kubeconfig"
    if kubectl get secret "${KUBECONFIG_SECRET}" -n "${cluster_ns}" &>/dev/null; then
      echo "Extracting kubeconfig and registering..."
      kubectl get secret "${KUBECONFIG_SECRET}" -n "${cluster_ns}" \
        -o jsonpath='{.data.value}' | base64 -d > "/tmp/${cluster_name}.kubeconfig"

      # Register with ArgoCD
      KUBECONFIG="/tmp/${cluster_name}.kubeconfig" \
        argocd cluster add "$(kubectl --kubeconfig="/tmp/${cluster_name}.kubeconfig" config current-context)" \
        --name "${cluster_name}" --yes

      rm -f "/tmp/${cluster_name}.kubeconfig"
      echo "Cluster ${cluster_name} registered with ArgoCD"
    fi
  done
```

## Summary

Automating ArgoCD cluster registration is essential for organizations running multiple Kubernetes clusters. Whether you use CLI wrappers, direct Secret creation, Terraform integration, or Cluster API watchers, the goal is the same - remove the manual bottleneck from cluster onboarding. Start with the approach that fits your current infrastructure, and evolve as your cluster fleet grows. For monitoring the health of all your registered clusters, consider integrating with [OneUptime](https://oneuptime.com) for centralized observability across your multi-cluster environment.
