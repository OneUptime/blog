# How to Configure Istio for CIS Benchmarks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, CIS Benchmark, Compliance, Kubernetes

Description: How to configure Istio to meet CIS benchmark requirements for Kubernetes and service mesh security compliance.

---

If your organization needs to comply with CIS (Center for Internet Security) benchmarks, you need to make sure your Istio deployment meets those requirements. The CIS Kubernetes Benchmark covers general cluster security, while Istio-specific security controls map to various sections. Getting Istio configured to pass a CIS audit involves tightening security at the control plane, data plane, and network level.

This guide maps CIS benchmark requirements to specific Istio configurations.

## Understanding Relevant CIS Sections

The CIS Kubernetes Benchmark has several sections that relate directly to Istio:

- **Section 1**: Control plane security
- **Section 4**: Worker node security (applies to sidecar proxies)
- **Section 5**: Policies (RBAC, pod security, network policies)

There is no standalone CIS benchmark specifically for Istio, but the Kubernetes benchmark requirements apply to all workloads running in the cluster, including Istio components.

## Control Plane Component Security (CIS 1.x)

**1.1 - API Server Audit Logging**

Enable audit logging for Istio API resources so all changes are tracked:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
metadata:
  name: istio-audit-policy
rules:
- level: RequestResponse
  resources:
  - group: "networking.istio.io"
    resources: ["virtualservices", "destinationrules", "gateways", "serviceentries"]
  - group: "security.istio.io"
    resources: ["authorizationpolicies", "peerauthentications", "requestauthentications"]
  - group: "telemetry.istio.io"
    resources: ["telemetries"]
- level: Metadata
  resources:
  - group: ""
    resources: ["secrets", "configmaps"]
    namespaces: ["istio-system"]
```

**1.2 - Encryption at Rest**

Make sure etcd encryption is enabled for secrets, since Istio stores certificates and configuration in Kubernetes secrets:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
- resources:
  - secrets
  providers:
  - aescbc:
      keys:
      - name: key1
        secret: <base64-encoded-key>
  - identity: {}
```

## RBAC Requirements (CIS 5.1)

**5.1.1 - Minimize Cluster Admin Access**

istiod should not use cluster-admin. Create a scoped role:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istiod-restricted
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch", "create", "update"]
- apiGroups: [""]
  resources: ["endpoints", "pods", "services", "namespaces"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]
- apiGroups: ["networking.istio.io", "security.istio.io", "telemetry.istio.io"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["admissionregistration.k8s.io"]
  resources: ["mutatingwebhookconfigurations", "validatingwebhookconfigurations"]
  verbs: ["get", "list", "watch", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: istiod-restricted-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: istiod-restricted
subjects:
- kind: ServiceAccount
  name: istiod
  namespace: istio-system
```

**5.1.3 - Minimize Wildcard Permissions**

Review Istio roles for wildcard usage and replace with specific resources:

```bash
kubectl get clusterrole -o json | \
  jq '.items[] | select(.metadata.name | startswith("istio")) | {name: .metadata.name, wildcards: [.rules[] | select(.resources[] == "*" or .verbs[] == "*")]}'
```

## Pod Security Standards (CIS 5.2)

**5.2.1 - Minimize Privileged Containers**

Configure Istio to avoid running privileged containers:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        privileged: false
  components:
    cni:
      enabled: true
    pilot:
      k8s:
        securityContext:
          runAsNonRoot: true
          runAsUser: 1337
```

The Istio CNI plugin eliminates the need for privileged init containers.

**5.2.2 - Minimize Containers Running as Root**

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata: {}
  values:
    global:
      proxy:
        privileged: false
```

Verify no Istio containers run as root:

```bash
kubectl get pods -n istio-system -o json | \
  jq '.items[].spec.containers[] | {name: .name, runAsNonRoot: .securityContext.runAsNonRoot, runAsUser: .securityContext.runAsUser}'
```

**5.2.3 - Minimize Capabilities**

With Istio CNI enabled, the proxy sidecar does not need `NET_ADMIN` or `NET_RAW`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
      - name: myapp
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
          runAsNonRoot: true
```

## Network Policies (CIS 5.3)

**5.3.1 - Ensure Network Policies Are Used**

Apply network policies to the istio-system namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: istiod-policy
  namespace: istio-system
spec:
  podSelector:
    matchLabels:
      app: istiod
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector: {}
    ports:
    - port: 15010
    - port: 15012
    - port: 15014
    - port: 15017
    - port: 15021
  egress:
  - to:
    - namespaceSelector: {}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ingress-gateway-policy
  namespace: istio-system
spec:
  podSelector:
    matchLabels:
      istio: ingressgateway
  policyTypes:
  - Ingress
  ingress:
  - ports:
    - port: 80
    - port: 443
    - port: 15021
```

## Secrets Management (CIS 5.4)

**5.4.1 - Prefer External Secret Management**

Instead of storing TLS certificates directly in Kubernetes secrets, use an external secret manager:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: istio-tls-cert
  namespace: istio-system
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: gateway-tls-cert
    template:
      type: kubernetes.io/tls
  data:
  - secretKey: tls.crt
    remoteRef:
      key: istio/tls-cert
      property: certificate
  - secretKey: tls.key
    remoteRef:
      key: istio/tls-cert
      property: private_key
```

## Encryption in Transit

Enforce mTLS across the entire mesh to meet encryption in transit requirements:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: mesh-strict-mtls
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

Verify mTLS is enforced everywhere:

```bash
# Check for any permissive policies
kubectl get peerauthentication --all-namespaces -o json | \
  jq '.items[] | select(.spec.mtls.mode != "STRICT") | {name: .metadata.name, namespace: .metadata.namespace, mode: .spec.mtls.mode}'
```

## Resource Quotas

Apply resource quotas to the istio-system namespace:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: istio-system-quota
  namespace: istio-system
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    pods: "50"
```

## Running a CIS Compliance Check

Use tools like kube-bench to verify your configuration:

```bash
# Run kube-bench
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml

# Check results
kubectl logs job/kube-bench
```

For Istio-specific checks, use `istioctl analyze`:

```bash
istioctl analyze --all-namespaces
```

And verify security settings:

```bash
# Check all PeerAuthentication policies
kubectl get peerauthentication --all-namespaces

# Check all AuthorizationPolicies
kubectl get authorizationpolicies --all-namespaces

# Verify no services use plain HTTP
kubectl get gateway --all-namespaces -o json | \
  jq '.items[].spec.servers[] | select(.port.protocol == "HTTP" and .tls.httpsRedirect != true)'
```

CIS compliance with Istio is achievable but requires deliberate configuration across multiple dimensions: RBAC, pod security, network policies, encryption, and auditing. Start with the highest-impact items (mTLS, RBAC, pod security) and work through the rest systematically.
