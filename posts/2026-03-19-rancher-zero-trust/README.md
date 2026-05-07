# How to Implement Zero Trust Security in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Security, Zero Trust

Description: Learn how to implement zero trust security principles in Rancher-managed Kubernetes clusters with network policies, mTLS, RBAC, and runtime verification.

Zero trust security operates on the principle that no entity, whether inside or outside the network, should be automatically trusted. Every access request must be verified. In a Kubernetes environment managed by Rancher, implementing zero trust requires layering multiple security controls. This guide covers the practical steps to achieve zero trust in your clusters.

## Prerequisites

- Rancher v2.5 or later; for Rancher v2.12 and later, use the supported Istio distribution for your Rancher version because Rancher-Istio is deprecated
- Kubernetes clusters with a CNI that supports Network Policies
- kubectl and Helm 3 access
- Admin privileges on Rancher

## Step 1: Apply Default Deny Network Policies

The foundation of zero trust networking is denying all traffic by default. Apply default deny policies to every namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

Automate this for all new namespaces by provisioning the namespace and its default deny policy together in the same GitOps change:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

## Step 2: Enable Mutual TLS with a Service Mesh

Deploy a service mesh to encrypt all service-to-service communication with mTLS.

### Install Istio via Rancher

1. Navigate to the cluster in Rancher.
2. Go to **Apps & Marketplace** > **Charts**.
3. Search for **Istio** or the supported Istio distribution for your Rancher version.
4. Click **Install** and configure options.

### Configure Strict mTLS

After Istio is installed, enforce strict mTLS mesh-wide by applying the policy in Istio's root namespace, which is commonly `istio-system`:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

Apply it:

```bash
kubectl apply -f strict-mtls.yaml
```

This ensures all communication between pods is encrypted and authenticated with mutual TLS.

## Step 3: Implement Least-Privilege RBAC

Create roles with minimal permissions for each team and service account:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-developer
  namespace: production
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "create", "update"]
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list"]
- apiGroups: [""]
  resources: ["services", "configmaps"]
  verbs: ["get", "list", "create", "update"]
```

Bind to specific users through Rancher:

1. Go to **Cluster Management** > **Members**.
2. Add users with specific roles.
3. Avoid granting cluster-admin to anyone who does not absolutely need it.

Audit existing RBAC to find overly permissive bindings:

```bash
kubectl get clusterrolebindings -o json | \
  jq '.items[] | select(.roleRef.name=="cluster-admin") | .subjects[]'
```

## Step 4: Enforce Service Account Token Restrictions

Disable automatic mounting of service account tokens where not needed:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  namespace: production
automountServiceAccountToken: false
```

For pods that need API access, mount tokens explicitly with a limited audience:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  serviceAccountName: my-app
  automountServiceAccountToken: false
  containers:
  - name: app
    image: my-app:latest
    volumeMounts:
    - name: token
      mountPath: /var/run/secrets/tokens
  volumes:
  - name: token
    projected:
      sources:
      - serviceAccountToken:
          path: token
          expirationSeconds: 3600
          audience: my-api
```

## Step 5: Implement Authorization Policies

With Istio, create fine-grained authorization policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-access
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
  - from:
    - source:
        serviceAccounts:
        - "production/frontend"
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/*"]
```

This allows only the frontend service account to access the API endpoints, and only using GET and POST methods.

## Step 6: Enable Runtime Security Monitoring

Deploy Falco for runtime threat detection:

```bash
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm repo update

helm install falco falcosecurity/falco \
  -n falco \
  --create-namespace \
  --set falcosidekick.enabled=true \
  --set falcosidekick.webui.enabled=true
```

Falco detects suspicious runtime behavior such as:
- Shell execution inside containers
- Unexpected network connections
- File access to sensitive paths
- Privilege escalation attempts

Create custom Falco rules for your environment:

```yaml
- list: approved_outbound_destination_ipaddrs
  items: ["10.0.0.10", "10.0.0.11"]

- rule: Unexpected Outbound Connection
  desc: Detect outbound connections to non-approved destinations
  condition: >
    outbound and not (fd.sip in (approved_outbound_destination_ipaddrs))
  output: >
    Unexpected outbound connection (user=%user.name command=%proc.cmdline
    connection=%fd.name %container.info)
  priority: WARNING
```

## Step 7: Verify Image Integrity

Ensure only signed and verified images are deployed:

```bash
# Install Cosign

go install github.com/sigstore/cosign/v3/cmd/cosign@latest

# Generate a key pair
cosign generate-key-pair

# Sign an image
cosign sign --key cosign.key your-registry/app:latest

# Verify an image
cosign verify --key cosign.pub your-registry/app:latest
```

With Sigstore policy-controller, opt the namespace in and create a ClusterImagePolicy to enforce image signature verification:

```bash
kubectl label namespace production policy.sigstore.dev/include=true
```

```yaml
apiVersion: policy.sigstore.dev/v1beta1
kind: ClusterImagePolicy
metadata:
  name: production-images-must-be-signed
spec:
  images:
  - glob: "your-registry.example.com/**"
  authorities:
  - key:
      data: |
        -----BEGIN PUBLIC KEY-----
        REPLACE_WITH_YOUR_COSIGN_PUBLIC_KEY
        -----END PUBLIC KEY-----
```

## Step 8: Encrypt Data at Rest and in Transit

Ensure all data is encrypted:

- **In Transit**: mTLS via service mesh (Step 2).
- **At Rest**: Enable etcd encryption (see the encryption at rest guide).
- **Secrets**: Use external secrets management:

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets external-secrets/external-secrets \
  -n external-secrets \
  --create-namespace
```

## Step 9: Implement Continuous Verification

Set up continuous security scanning and policy evaluation:

```bash
# Install kube-bench for CIS benchmark checking
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml
```

Schedule regular security assessments:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: security-audit
spec:
  schedule: "0 6 * * 1"
  jobTemplate:
    spec:
      template:
        spec:
          hostPID: true
          containers:
          - name: audit
            image: docker.io/aquasec/kube-bench:v0.15.4
            command: ["kube-bench"]
            volumeMounts:
            - name: var-lib-cni
              mountPath: /var/lib/cni
              readOnly: true
            - name: var-lib-etcd
              mountPath: /var/lib/etcd
              readOnly: true
            - name: var-lib-kubelet
              mountPath: /var/lib/kubelet
              readOnly: true
            - name: var-lib-kube-scheduler
              mountPath: /var/lib/kube-scheduler
              readOnly: true
            - name: var-lib-kube-controller-manager
              mountPath: /var/lib/kube-controller-manager
              readOnly: true
            - name: etc-systemd
              mountPath: /etc/systemd
              readOnly: true
            - name: lib-systemd
              mountPath: /lib/systemd/
              readOnly: true
            - name: srv-kubernetes
              mountPath: /srv/kubernetes/
              readOnly: true
            - name: etc-kubernetes
              mountPath: /etc/kubernetes
              readOnly: true
            - name: usr-bin
              mountPath: /usr/local/mount-from-host/bin
              readOnly: true
            - name: etc-cni-netd
              mountPath: /etc/cni/net.d/
              readOnly: true
            - name: opt-cni-bin
              mountPath: /opt/cni/bin/
              readOnly: true
          restartPolicy: Never
          volumes:
          - name: var-lib-cni
            hostPath:
              path: /var/lib/cni
          - name: var-lib-etcd
            hostPath:
              path: /var/lib/etcd
          - name: var-lib-kubelet
            hostPath:
              path: /var/lib/kubelet
          - name: var-lib-kube-scheduler
            hostPath:
              path: /var/lib/kube-scheduler
          - name: var-lib-kube-controller-manager
            hostPath:
              path: /var/lib/kube-controller-manager
          - name: etc-systemd
            hostPath:
              path: /etc/systemd
          - name: lib-systemd
            hostPath:
              path: /lib/systemd
          - name: srv-kubernetes
            hostPath:
              path: /srv/kubernetes
          - name: etc-kubernetes
            hostPath:
              path: /etc/kubernetes
          - name: usr-bin
            hostPath:
              path: /usr/bin
          - name: etc-cni-netd
            hostPath:
              path: /etc/cni/net.d/
          - name: opt-cni-bin
            hostPath:
              path: /opt/cni/bin/
```

## Zero Trust Checklist

- [ ] Default deny network policies on all namespaces
- [ ] Mutual TLS for all service communication
- [ ] Least-privilege RBAC for all users and service accounts
- [ ] Service account token restrictions
- [ ] Authorization policies for service-to-service access
- [ ] Runtime security monitoring (Falco)
- [ ] Image signing and verification
- [ ] Encryption at rest and in transit
- [ ] Continuous security scanning
- [ ] Audit logging for all API access

## Conclusion

Implementing zero trust in Rancher-managed Kubernetes clusters requires multiple complementary security layers. No single tool or configuration achieves zero trust alone. By combining default deny networking, mTLS, least-privilege RBAC, runtime monitoring, and continuous verification, you create an environment where every access request is verified and every anomaly is detected. Start with network policies and RBAC, then progressively add service mesh, runtime security, and image verification as your security maturity grows.
