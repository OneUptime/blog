# How to Create Runbook for Istio Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Runbook, Installation, DevOps

Description: A complete runbook template for installing Istio on Kubernetes clusters covering prerequisites, installation steps, validation, and rollback procedures.

---

A runbook is one of those things that seems unnecessary until you really need it. When your on-call engineer needs to install Istio on a new cluster at 2 AM, or when a team member who has never touched Istio before needs to set it up in a staging environment, having a step-by-step runbook makes the difference between a smooth operation and a stressful scramble.

Here is a complete runbook template for Istio installation that you can adapt for your organization.

## Runbook: Istio Installation

### Purpose
Install Istio service mesh on a Kubernetes cluster with production-ready configuration.

### Prerequisites Checklist

Before starting, verify all of the following:

```bash
# 1. Kubernetes cluster version (Istio 1.24 supports K8s 1.28-1.31)
kubectl version --short

# 2. kubectl access with cluster-admin privileges
kubectl auth can-i create clusterroles --all-namespaces

# 3. Sufficient cluster resources (minimum for production)
#    - 4 nodes with at least 4 CPU and 8GB RAM each
kubectl get nodes -o custom-columns=NAME:.metadata.name,CPU:.status.capacity.cpu,MEMORY:.status.capacity.memory

# 4. No existing Istio installation
kubectl get namespace istio-system
# Should return "not found"

# 5. istioctl installed and version matches target
istioctl version

# 6. Helm installed (if using Helm installation method)
helm version
```

### Step 1: Download and Verify istioctl

```bash
# Download the target version
ISTIO_VERSION=1.24.0
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=$ISTIO_VERSION sh -

# Add to PATH
export PATH=$PWD/istio-$ISTIO_VERSION/bin:$PATH

# Verify the binary
istioctl version --remote=false
```

### Step 2: Run Pre-Installation Checks

```bash
# Run Istio's built-in pre-check
istioctl x precheck

# Expected output should show all checks passing
# If any checks fail, resolve them before proceeding
```

Common pre-check failures and fixes:

| Failure | Fix |
|---|---|
| Insufficient privileges | Ensure RBAC allows cluster-admin |
| Unsupported K8s version | Upgrade Kubernetes to a supported version |
| Existing Istio CRDs | Remove old CRDs with `kubectl delete crds -l operator.istio.io/component` |

### Step 3: Create the IstioOperator Configuration

Create a file called `istio-config.yaml`:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-production
spec:
  profile: default
  meshConfig:
    accessLogFile: ""
    enableAutoMtls: true
    defaultConfig:
      holdApplicationUntilProxyStarts: true
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          resources:
            requests:
              cpu: "200m"
              memory: "128Mi"
            limits:
              cpu: "2000m"
              memory: "1Gi"
          hpaSpec:
            minReplicas: 2
            maxReplicas: 10
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: "10m"
            memory: "64Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
    pilot:
      env:
        PILOT_ENABLE_STATUS: "true"
```

### Step 4: Install Istio

```bash
# Install with the configuration file
istioctl install -f istio-config.yaml -y

# This will:
# - Create the istio-system namespace
# - Install CRDs
# - Deploy istiod
# - Deploy ingress gateway
```

Expected output:

```
✔ Istio core installed
✔ Istiod installed
✔ Ingress gateways installed
✔ Installation complete
```

### Step 5: Verify Installation

Run all verification checks:

```bash
# 1. Check all pods in istio-system are running
kubectl get pods -n istio-system
# All pods should be Running with all containers ready

# 2. Check istiod is healthy
kubectl get deploy -n istio-system
# istiod should show READY and AVAILABLE

# 3. Run Istio's validation
istioctl verify-install -f istio-config.yaml

# 4. Check the mesh configuration
kubectl get configmap istio -n istio-system -o yaml

# 5. Verify the webhook is configured
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml | head -20

# 6. Check CRDs are installed
kubectl get crds | grep istio
```

### Step 6: Enable Sidecar Injection

```bash
# Label namespaces for automatic sidecar injection
kubectl label namespace default istio-injection=enabled

# Verify the label
kubectl get namespace -L istio-injection
```

### Step 7: Deploy a Test Application

```bash
# Deploy the sample httpbin application
kubectl apply -f istio-$ISTIO_VERSION/samples/httpbin/httpbin.yaml

# Wait for it to be ready
kubectl wait --for=condition=ready pod -l app=httpbin --timeout=120s

# Verify the sidecar was injected (should show 2/2 containers)
kubectl get pods -l app=httpbin

# Test connectivity through the sidecar
kubectl exec deploy/httpbin -c httpbin -- curl -s localhost:15000/server_info | head -5
```

### Step 8: Configure Gateway (if needed)

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
```

```bash
kubectl apply -f gateway.yaml

# Verify the gateway
kubectl get gateway -n istio-system

# Get the external IP of the ingress gateway
kubectl get svc istio-ingressgateway -n istio-system
```

### Step 9: Post-Installation Configuration

```bash
# Apply PeerAuthentication for strict mTLS (optional, evaluate first)
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
EOF

# Verify mTLS is working
istioctl proxy-config secret deploy/httpbin | head -5
```

### Rollback Procedure

If the installation needs to be rolled back:

```bash
# 1. Remove namespace labels
kubectl label namespace default istio-injection-

# 2. Restart workloads to remove sidecars
kubectl rollout restart deployment --all -n default

# 3. Uninstall Istio
istioctl uninstall --purge -y

# 4. Remove the namespace
kubectl delete namespace istio-system

# 5. Remove CRDs (optional, only if fully removing Istio)
kubectl get crds -oname | grep istio | xargs kubectl delete
```

### Troubleshooting

| Symptom | Diagnostic Command | Common Fix |
|---|---|---|
| istiod not starting | `kubectl logs -n istio-system deploy/istiod` | Check resource limits, RBAC |
| Sidecar not injected | `kubectl get mutatingwebhookconfiguration` | Check namespace label, webhook config |
| Gateway not reachable | `kubectl logs -n istio-system -l app=istio-ingressgateway` | Check Service type, security groups |
| Pods stuck in Init | `kubectl logs <pod> -c istio-init` | Check init container permissions, CNI compatibility |

### Sign-Off

After installation, record:

- Date and time of installation
- Istio version installed
- Configuration file used (commit to git)
- Operator who performed the installation
- Any deviations from this runbook

Store the IstioOperator configuration in version control alongside this runbook so that future installations are reproducible.
