# Securing Typha Scaling in Calico the Hard Way

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Typha, Security, MTLS, TLS, CNI, Networking, RBAC

Description: Harden Calico Typha by enabling mutual TLS between Felix and Typha, restricting who can scale the Typha Deployment via RBAC, and auditing all scaling events - all in a manifest-based Calico...

---

## Introduction

Typha security has two dimensions. The first is network security: ensuring only authorized Felix agents can connect to Typha and receive network policy state. The second is operational security: ensuring only authorized principals can scale the Typha Deployment up or down, since reducing replicas below safe thresholds degrades cluster reliability.

This post covers both: mutual TLS authentication for Felix-to-Typha connections, RBAC restrictions for scaling operations, PodDisruptionBudget protection against accidental scale-to-zero, and audit logging for all Typha scaling events.

---

## Prerequisites

- Typha deployed in `kube-system` per the earlier posts in this series
- `kubectl` cluster-admin access
- `calicoctl` v3.x configured
- `openssl` available for certificate generation
- Prometheus Operator for alert rules (optional)

---

## Step 1: Enable Mutual TLS Between Felix and Typha

Generate a dedicated Calico CA and component certificates:

```bash
# Generate the Calico CA
openssl genrsa -out calico-ca.key 4096
openssl req -x509 -new -nodes -key calico-ca.key \
  -sha256 -days 3650 -out calico-ca.crt \
  -subj "/CN=calico-ca/O=calico"

# Generate Typha server certificate
openssl genrsa -out typha-server.key 4096
openssl req -new -key typha-server.key -out typha-server.csr -subj "/CN=calico-typha/O=calico"
openssl x509 -req -in typha-server.csr -CA calico-ca.crt -CAkey calico-ca.key \
  -CAcreateserial -out typha-server.crt -days 825 -sha256

# Generate Felix client certificate
openssl genrsa -out felix-client.key 4096
openssl req -new -key felix-client.key -out felix-client.csr -subj "/CN=calico-felix/O=calico"
openssl x509 -req -in felix-client.csr -CA calico-ca.crt -CAkey calico-ca.key \
  -CAcreateserial -out felix-client.crt -days 825 -sha256
```

Store the certificates as Kubernetes Secrets:

```bash
# Typha server credentials
kubectl create secret generic calico-typha-tls \
  --namespace kube-system \
  --from-file=ca.crt=calico-ca.crt \
  --from-file=tls.crt=typha-server.crt \
  --from-file=tls.key=typha-server.key

# Felix client credentials
kubectl create secret generic calico-felix-tls \
  --namespace kube-system \
  --from-file=ca.crt=calico-ca.crt \
  --from-file=tls.crt=felix-client.crt \
  --from-file=tls.key=felix-client.key
```

Update the Typha Deployment to mount and use the TLS credentials:

```yaml
# typha-deployment-tls.yaml
# Typha with mutual TLS - only Felix agents presenting a signed certificate can connect
apiVersion: apps/v1
kind: Deployment
metadata:
  name: calico-typha
  namespace: kube-system
  labels:
    k8s-app: calico-typha
spec:
  replicas: 3
  selector:
    matchLabels:
      k8s-app: calico-typha
  template:
    metadata:
      labels:
        k8s-app: calico-typha
    spec:
      serviceAccountName: calico-typha
      volumes:
        - name: typha-tls
          secret:
            secretName: calico-typha-tls
      containers:
        - name: calico-typha
          image: calico/typha:v3.27.0
          ports:
            - containerPort: 5473
              name: calico-typha
          volumeMounts:
            - name: typha-tls
              mountPath: /calico-secrets
              readOnly: true
          env:
            - name: TYPHA_LOGFILEPATH
              value: "none"
            - name: TYPHA_LOGSEVERITYSCREEN
              value: "info"
            # CA that signed the Felix client certificates
            - name: TYPHA_CLIENTCA
              value: "/calico-secrets/ca.crt"
            # Typha's own server certificate
            - name: TYPHA_SERVERCERTFILE
              value: "/calico-secrets/tls.crt"
            # Typha's private key
            - name: TYPHA_SERVERKEYFILE
              value: "/calico-secrets/tls.key"
            # Only accept Felix clients presenting this CN
            - name: TYPHA_CLIENTCN
              value: "calico-felix"
            - name: TYPHA_PROMETHEUSMETRICSENABLED
              value: "true"
            - name: TYPHA_PROMETHEUSMETRICSPORT
              value: "9093"
            - name: TYPHA_HEALTHENABLED
              value: "true"
          livenessProbe:
            httpGet:
              path: /liveness
              port: 9098
              host: localhost
            initialDelaySeconds: 30
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /readiness
              port: 9098
              host: localhost
            periodSeconds: 10
          resources:
            requests:
              cpu: 250m
              memory: 128Mi
            limits:
              cpu: 1000m
              memory: 512Mi
```

```bash
kubectl apply -f typha-deployment-tls.yaml
```

Configure Felix to use its client certificate:

```yaml
# felixconfiguration-tls.yaml
# FelixConfiguration pointing Felix at its client credentials and Typha's expected CN
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  typhaK8sServiceName: calico-typha
  # CA that signed Typha's certificate
  typhaCaFile: "/calico-secrets/ca.crt"
  # Felix's client certificate
  typhaClientCertFile: "/calico-secrets/tls.crt"
  # Felix's private key
  typhaClientKeyFile: "/calico-secrets/tls.key"
  # CN Typha must present - prevents Felix from connecting to a rogue server
  typhaServerCN: "calico-typha"
```

```bash
calicoctl apply -f felixconfiguration-tls.yaml
```

---

## Step 2: Restrict Typha Deployment Scaling via RBAC

Only the platform team and any authorized automation should be able to scale the Typha Deployment:

```yaml
# typha-scaler-role.yaml
# Minimal ClusterRole granting only the ability to scale Typha and list nodes
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: typha-scaler-restricted
rules:
  # Needed to count nodes and determine desired replica count
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["list", "get"]
  # Restricted to only the calico-typha Deployment's scale subresource
  - apiGroups: ["apps"]
    resources: ["deployments/scale"]
    verbs: ["patch", "get"]
    resourceNames: ["calico-typha"]
```

```bash
kubectl apply -f typha-scaler-role.yaml
```

Audit who currently has broad Deployment edit access in `kube-system`:

```bash
# Find all bindings granting edit or admin on kube-system
kubectl get rolebinding,clusterrolebinding -A -o json \
  | jq -r '.items[] | select(.roleRef.name | test("edit|admin|cluster-admin")) | .metadata.name'
```

---

## Step 3: Protect Against Scale-to-Zero with a PodDisruptionBudget

```yaml
# typha-pdb.yaml
# Ensures Typha can never be fully evicted; at least 2 pods must remain available
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: calico-typha-pdb
  namespace: kube-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      k8s-app: calico-typha
```

```bash
kubectl apply -f typha-pdb.yaml
```

---

## Step 4: Enable Audit Logging for Scaling Events

Add an audit policy rule on your API server to record all scale operations on Typha:

```yaml
# In /etc/kubernetes/audit-policy.yaml - add this rule before the catch-all
# Logs all patch/update operations on the Typha Deployment's scale subresource
- level: Request
  resources:
    - group: apps
      resources: ["deployments/scale"]
  namespaces: ["kube-system"]
  verbs: ["patch", "update"]
```

After the API server picks up the policy, verify events appear:

```bash
# Search the audit log for Typha scale operations
grep "calico-typha" /var/log/kubernetes/audit.log | grep "deployments/scale"
```

---

## Best Practices

- Use a dedicated CA for Calico certificates and store the CA private key outside the cluster in a secrets manager such as HashiCorp Vault.
- Rotate certificates at least 30 days before they expire; a certificate rotation that goes wrong can disconnect all Felix agents simultaneously.
- Apply a `NetworkPolicy` that restricts access to port 5473 to only the `calico-node` DaemonSet pods, adding defense-in-depth even with mTLS active.
- Set `minAvailable` in the PDB to `replicas - 1` so node drains can always proceed one node at a time.
- Alert on `kube_deployment_spec_replicas{deployment="calico-typha"}` dropping below 2 - this detects accidental or malicious scale-down before it becomes an outage.

---

## Conclusion

Securing Typha requires both network-level protection (mTLS) and operational access control (RBAC, PDB, and audit logging). Together, these controls ensure that only legitimate Felix agents can receive policy state from Typha and that only authorized principals can modify the Typha replica count.

---

*Monitor Typha availability and certificate expiry alongside your full Kubernetes infrastructure with [OneUptime](https://oneuptime.com).*
