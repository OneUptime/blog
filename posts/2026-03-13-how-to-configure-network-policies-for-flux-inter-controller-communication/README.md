# How to Configure Network Policies for Flux Inter-Controller Communication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Network Policies, Microservices, Zero Trust

Description: Secure internal communication between Flux controllers using Kubernetes NetworkPolicies that enforce least-privilege access between components.

---

Flux is built as a set of specialized controllers that work together. The source-controller fetches and serves artifacts. The kustomize-controller and helm-controller consume those artifacts and apply them to the cluster. The notification-controller handles alerts and webhook receivers. These controllers communicate over HTTP within the flux-system namespace. By default, any pod in the cluster can reach these internal endpoints. Applying fine-grained NetworkPolicies between Flux controllers enforces a zero-trust posture where each controller can only talk to the specific controllers it needs.

## Prerequisites

- A Kubernetes cluster (v1.24+) with a CNI plugin that enforces NetworkPolicies
- Flux installed in the flux-system namespace
- kubectl configured with cluster-admin access
- An understanding of how Flux controllers interact

Verify all Flux controllers are running:

```bash
kubectl get deployments -n flux-system
```

Expected output:

```bash
NAME                      READY   UP-TO-DATE   AVAILABLE
helm-controller           1/1     1            1
kustomize-controller      1/1     1            1
notification-controller   1/1     1            1
source-controller         1/1     1            1
```

## Understanding Flux Inter-Controller Communication

Before writing policies, understand how the controllers interact:

| Source | Destination | Port | Purpose |
|---|---|---|---|
| kustomize-controller | source-controller | 9090 | Download artifacts (tarballs) |
| helm-controller | source-controller | 9090 | Download Helm charts |
| notification-controller | source-controller | 9090 | Read artifact metadata for events |
| kustomize-controller | notification-controller | 9292 | Send events for alerting |
| helm-controller | notification-controller | 9292 | Send events for alerting |
| source-controller | notification-controller | 9292 | Send events for alerting |
| All controllers | Kubernetes API server | 443/6443 | Reconciliation and status updates |
| Prometheus | All controllers | 8080 | Metrics scraping |

Each controller also exposes a health check endpoint on port 8080 and serves metrics on the same port.

## Step 1: Apply a Default Deny Policy

Deny all ingress and egress within flux-system to start from a clean baseline:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress: []
  egress: []
```

```bash
kubectl apply -f default-deny-all.yaml
```

## Step 2: Allow DNS for All Controllers

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

```bash
kubectl apply -f allow-dns.yaml
```

## Step 3: Allow Kubernetes API Server Access

```bash
KUBE_API_IP=$(kubectl get endpoints kubernetes -n default -o jsonpath='{.subsets[0].addresses[0].ip}')

cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-kube-api
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: ${KUBE_API_IP}/32
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 6443
EOF
```

## Step 4: Allow Kustomize Controller to Source Controller

The kustomize-controller needs to download artifacts from the source-controller:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-kustomize-to-source
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: kustomize-controller
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: source-controller
      ports:
        - protocol: TCP
          port: 9090
```

Create the corresponding ingress rule on the source-controller:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-source-ingress-from-kustomize
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: kustomize-controller
      ports:
        - protocol: TCP
          port: 9090
```

```bash
kubectl apply -f allow-kustomize-to-source.yaml
```

## Step 5: Allow Helm Controller to Source Controller

The helm-controller also downloads artifacts from the source-controller:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-helm-to-source
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: helm-controller
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: source-controller
      ports:
        - protocol: TCP
          port: 9090
```

And the ingress counterpart:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-source-ingress-from-helm
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: helm-controller
      ports:
        - protocol: TCP
          port: 9090
```

## Step 6: Allow Event Delivery to Notification Controller

All controllers send events to the notification-controller for alerting. Create egress rules for each controller and a single ingress rule on the notification-controller:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-controllers-to-notification
  namespace: flux-system
spec:
  podSelector:
    matchExpressions:
      - key: app
        operator: In
        values:
          - source-controller
          - kustomize-controller
          - helm-controller
  policyTypes:
    - Egress
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: notification-controller
      ports:
        - protocol: TCP
          port: 9292
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-notification-ingress-from-controllers
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: notification-controller
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - source-controller
                  - kustomize-controller
                  - helm-controller
      ports:
        - protocol: TCP
          port: 9292
```

```bash
kubectl apply -f allow-events-to-notification.yaml
```

## Step 7: Allow Prometheus Metrics Scraping

Allow Prometheus to scrape metrics from all controllers:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scrape
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
          podSelector:
            matchLabels:
              app.kubernetes.io/name: prometheus
      ports:
        - protocol: TCP
          port: 8080
```

## Step 8: Combine into a Complete Policy Set

Here is a script that generates and applies all policies:

```bash
cat <<'EOF' > flux-inter-controller-policies.yaml
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress: []
  egress: []
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-source-ingress
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - kustomize-controller
                  - helm-controller
                  - notification-controller
      ports:
        - protocol: TCP
          port: 9090
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-notification-ingress
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: notification-controller
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - source-controller
                  - kustomize-controller
                  - helm-controller
      ports:
        - protocol: TCP
          port: 9292
EOF

kubectl apply -f flux-inter-controller-policies.yaml
```

## Verification

After applying all policies, verify that Flux reconciliation still works:

```bash
# Force a full reconciliation
flux reconcile source git flux-system
flux reconcile kustomization flux-system

# Check all sources
flux get sources all

# Check all kustomizations
flux get kustomizations -A

# Check all Helm releases
flux get helmreleases -A
```

Verify policies are active:

```bash
kubectl get networkpolicies -n flux-system
```

Check controller logs for communication errors:

```bash
for ctrl in source-controller kustomize-controller helm-controller notification-controller; do
  echo "=== $ctrl ==="
  kubectl logs -n flux-system deployment/$ctrl --tail=10
done
```

## Troubleshooting

**Kustomizations fail with artifact download errors**

The kustomize-controller cannot reach the source-controller. Verify the egress and ingress policies:

```bash
kubectl describe networkpolicy allow-kustomize-to-source -n flux-system
kubectl describe networkpolicy allow-source-ingress -n flux-system
```

Check that the pod labels match. List the labels on each controller pod:

```bash
kubectl get pods -n flux-system --show-labels
```

**Alerts and notifications stop working**

The controllers cannot reach the notification-controller. Verify the event delivery policies are applied:

```bash
kubectl get networkpolicy allow-notification-ingress -n flux-system -o yaml
```

**Health checks fail after applying policies**

If your liveness and readiness probes are failing, you may need to allow the kubelet to reach the health check port. The kubelet runs on the node, so its traffic comes from the node IP:

```yaml
ingress:
  - ports:
      - protocol: TCP
        port: 8080
```

Adding an ingress rule without a `from` clause allows all sources on that port, which covers kubelet health checks.

**Helm releases fail but kustomizations work**

The helm-controller may have different labels than expected. Check the actual labels:

```bash
kubectl get pods -n flux-system -l app=helm-controller --show-labels
```

If the label is different, update the podSelector in your policies accordingly.
