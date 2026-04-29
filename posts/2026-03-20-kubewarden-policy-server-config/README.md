# How to Configure Kubewarden Policy Server - Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Policy Server, Configuration, Kubernetes, Admission Control, SUSE Rancher

Description: Learn how to configure the Kubewarden Policy Server including resource limits, replica counts, tracing, logging, and custom policy server deployments for workload isolation.

---

The Kubewarden Policy Server is the component that runs WebAssembly policies and evaluates admission requests. Proper configuration ensures availability, performance, and isolation for different policy workloads.

---

## Policy Server Architecture

```text
┌─────────────────────────────────────────────┐
│           Kubernetes Cluster                │
│                                             │
│  Admission Request                          │
│       │                                     │
│       ▼                                     │
│  ┌────────────────────────────────────┐     │
│  │     Kubewarden Policy Server       │     │
│  │  ┌──────────┐  ┌───────────────┐   │     │
│  │  │ Policy 1 │  │   Policy 2    │   │     │
│  │  │ (WASM)   │  │   (WASM)      │   │     │
│  │  └──────────┘  └───────────────┘   │     │
│  └────────────────────────────────────┘     │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Step 1: View the Default Policy Server

```bash
# Check the default policy server

kubectl get policyserver -n kubewarden

# Describe for full configuration
kubectl describe policyserver default -n kubewarden
```

---

## Step 2: Configure Resource Limits

```yaml
# policy-server-production.yaml
apiVersion: policies.kubewarden.io/v1
kind: PolicyServer
metadata:
  name: default
  namespace: kubewarden
spec:
  image: ghcr.io/kubewarden/policy-server:latest

  # Number of replicas for high availability
  replicas: 3

  # Resource requests and limits
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2000m
    memory: 1Gi

  # Pod anti-affinity for HA
  affinity:
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              kubewarden/policy-server: default
          topologyKey: kubernetes.io/hostname

  # Service account used by this Policy Server
  serviceAccountName: policy-server
```

```bash
kubectl apply -f policy-server-production.yaml
```

---

## Step 3: Configure Logging

```yaml
# Enable verbose logging for debugging
apiVersion: policies.kubewarden.io/v1
kind: PolicyServer
metadata:
  name: default
  namespace: kubewarden
spec:
  image: ghcr.io/kubewarden/policy-server:latest
  replicas: 2

  env:
    - name: KUBEWARDEN_LOG_LEVEL
      value: "debug"    # Options: trace, debug, info, warn, error
    - name: KUBEWARDEN_LOG_FMT
      value: "json"     # Options: text, json, otlp
```

```bash
# View Policy Server logs
kubectl logs -n kubewarden \
  $(kubectl get pod -n kubewarden -l kubewarden/policy-server=default -o name | head -1) \
  | jq .
```

---

## Step 4: Enable OpenTelemetry Tracing

```yaml
apiVersion: policies.kubewarden.io/v1
kind: PolicyServer
metadata:
  name: default
  namespace: kubewarden
spec:
  image: ghcr.io/kubewarden/policy-server:latest
  replicas: 2

  # OpenTelemetry configuration
  env:
    - name: KUBEWARDEN_LOG_FMT
      value: "otlp"
    - name: OTEL_EXPORTER_OTLP_ENDPOINT
      value: "http://otel-collector:4317"
    - name: KUBEWARDEN_ENABLE_METRICS
      value: "true"
```

---

## Step 5: Create a Custom Policy Server for Isolation

For high-security or high-volume policies, create a dedicated policy server:

```yaml
# security-policy-server.yaml
apiVersion: policies.kubewarden.io/v1
kind: PolicyServer
metadata:
  name: security-policies
  namespace: kubewarden
spec:
  image: ghcr.io/kubewarden/policy-server:latest
  replicas: 3
  requests:
    cpu: 1000m
    memory: 1Gi
  limits:
    cpu: 4000m
    memory: 2Gi

  # Tolerate taint for dedicated security nodes
  tolerations:
    - key: "security"
      operator: "Equal"
      value: "true"
      effect: "NoSchedule"

  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: node-type
                operator: In
                values:
                  - security
```

Then assign policies to this policy server:

```yaml
# policy using custom policy server
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: require-labels
spec:
  policyServer: security-policies    # Reference custom policy server
  module: registry://ghcr.io/kubewarden/policies/safe-labels:v1.0.9
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE"]
  mutating: false
  settings:
    mandatory_labels:
      - cost-center
```

---

## Step 6: Configure Private Registry Credentials for Policy Modules

```yaml
apiVersion: policies.kubewarden.io/v1
kind: PolicyServer
metadata:
  name: default
  namespace: kubewarden
spec:
  image: ghcr.io/kubewarden/policy-server:latest
  replicas: 2

  # Secret used when fetching policy modules from private OCI registries
  imagePullSecret: registry-credentials
```

---

## Step 7: Configure Policy Signature Verification

```yaml
apiVersion: policies.kubewarden.io/v1
kind: PolicyServer
metadata:
  name: default
  namespace: kubewarden
spec:
  image: ghcr.io/kubewarden/policy-server:latest
  replicas: 2

  # Only allow signed policies from trusted sources
  verificationConfig: kubewarden-verification-config
```

```yaml
# kubewarden-verification-config ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubewarden-verification-config
  namespace: kubewarden
data:
  verification-config: |
    apiVersion: v1
    allOf:
      - kind: pubKey
        owner: platform-team
        key: |
          -----BEGIN PUBLIC KEY-----
          MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
          -----END PUBLIC KEY-----
```

---

## Step 8: Monitor Policy Server Health

```bash
# Check Policy Server pod readiness
kubectl get pods -n kubewarden -l kubewarden/policy-server=default

# If Kubewarden telemetry is enabled in sidecar mode, check the metrics endpoint
kubectl port-forward -n kubewarden \
  $(kubectl get pod -n kubewarden -l kubewarden/policy-server=default -o name | head -1) \
  8080:8080 &

curl http://localhost:8080/metrics | grep kubewarden
```

---

## Best Practices

- Run at least 2 replicas of the Policy Server in production and configure pod anti-affinity to spread replicas across nodes.
- Create separate Policy Servers for security-critical policies vs. general policies - this isolates performance issues and lets you apply different resource limits.
- Enable JSON logging and send logs to your centralized log aggregation system to maintain an audit trail of all admission decisions.
