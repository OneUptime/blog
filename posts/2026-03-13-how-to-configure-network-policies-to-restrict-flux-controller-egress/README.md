# How to Configure Network Policies to Restrict Flux Controller Egress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Network Policies, Egress, Zero Trust

Description: A step-by-step guide to configuring Kubernetes NetworkPolicies that restrict egress traffic from Flux controllers to only the endpoints they need.

---

Flux controllers run with broad network access by default. The source-controller fetches from Git repositories and container registries. The kustomize-controller and helm-controller apply resources to the cluster API server. The notification-controller sends alerts to external services. Without egress restrictions, a compromised controller could reach any network destination. Kubernetes NetworkPolicies let you lock down each controller to only the traffic it requires.

This guide walks through creating egress-restricted NetworkPolicies for every Flux controller in the flux-system namespace.

## Prerequisites

Before you begin, make sure you have the following in place:

- A Kubernetes cluster running version 1.24 or later
- A CNI plugin that supports NetworkPolicy enforcement (Calico, Cilium, Weave Net, or similar)
- Flux installed in the flux-system namespace
- kubectl configured with cluster-admin access
- Familiarity with Kubernetes NetworkPolicy resources

Verify that your CNI supports NetworkPolicies by creating a test policy:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: test-policy
  namespace: default
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress: []
EOF
```

If the resource is created without errors, your CNI supports NetworkPolicies. Clean up with:

```bash
kubectl delete networkpolicy test-policy -n default
```

## Understanding Flux Controller Network Requirements

Each Flux controller has different egress needs:

| Controller | Required Egress Destinations |
|---|---|
| source-controller | Git hosts, container registries, Helm repositories, Kubernetes API server |
| kustomize-controller | Kubernetes API server |
| helm-controller | Kubernetes API server |
| notification-controller | External webhook endpoints (Slack, Teams, etc.), Kubernetes API server |

The Kubernetes API server is required by all controllers for reconciliation and status updates.

## Step 1: Create a Default Deny Egress Policy

Start by denying all egress traffic from the flux-system namespace. This establishes a zero-trust baseline:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress: []
```

Apply the policy:

```bash
kubectl apply -f default-deny-egress.yaml
```

After applying this policy, all Flux controllers will lose network access. The following steps add back only the required access.

## Step 2: Allow DNS Resolution for All Controllers

Every controller needs DNS to resolve hostnames. Allow egress to the kube-dns service:

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

Apply it:

```bash
kubectl apply -f allow-dns.yaml
```

## Step 3: Allow Access to the Kubernetes API Server

All Flux controllers need to communicate with the Kubernetes API server. The API server typically runs on the host network, so you target it by IP:

```bash
KUBE_API_IP=$(kubectl get endpoints kubernetes -n default -o jsonpath='{.subsets[0].addresses[0].ip}')
echo "Kubernetes API server IP: $KUBE_API_IP"
```

Create the policy:

```yaml
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
            cidr: <KUBE_API_IP>/32
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 6443
```

Replace `<KUBE_API_IP>` with the actual IP, or use a script to generate the manifest:

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

## Step 4: Allow Source Controller Egress to Git and Registries

The source-controller needs access to external Git hosts and container registries. Create a policy that allows HTTPS egress only for the source-controller:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-source-controller-egress
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 22
```

This allows the source-controller to reach any external IP on ports 443 (HTTPS) and 22 (SSH for Git). Private network ranges are excluded. If you know the specific IPs of your Git server and registries, narrow the `cidr` to those addresses for tighter security.

## Step 5: Allow Notification Controller Egress

The notification-controller sends alerts to external services like Slack, PagerDuty, and custom webhooks:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-notification-controller-egress
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: notification-controller
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - protocol: TCP
          port: 443
```

## Step 6: Apply All Policies Together

Combine all policies into a single file for easier management:

```bash
cat <<'EOF' > flux-egress-policies.yaml
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Egress
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
  name: allow-source-controller-egress
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: source-controller
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 22
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-notification-controller-egress
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: notification-controller
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - protocol: TCP
          port: 443
EOF

kubectl apply -f flux-egress-policies.yaml
```

## Verification

After applying the policies, verify that Flux continues to reconcile successfully:

```bash
flux get sources git --all-namespaces
flux get kustomizations --all-namespaces
flux get helmreleases --all-namespaces
```

Check that all sources show a Ready status. If any source is failing, the egress policy may be blocking required traffic.

List the active NetworkPolicies:

```bash
kubectl get networkpolicies -n flux-system
```

Test that the source-controller can still reach your Git repository:

```bash
kubectl logs -n flux-system deployment/source-controller | tail -20
```

Look for successful fetch messages. Errors like `dial tcp: i/o timeout` indicate that the egress policy is too restrictive.

## Troubleshooting

**Flux reconciliation stops after applying policies**

Check which controller is failing and review its logs:

```bash
kubectl logs -n flux-system deployment/source-controller --tail=50
kubectl logs -n flux-system deployment/kustomize-controller --tail=50
kubectl logs -n flux-system deployment/helm-controller --tail=50
kubectl logs -n flux-system deployment/notification-controller --tail=50
```

**DNS resolution fails**

Verify that the kube-dns pods have the expected labels:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns --show-labels
```

If your cluster uses a different DNS implementation (such as CoreDNS with different labels), update the DNS policy's podSelector accordingly.

**API server connection refused**

Confirm the API server IP matches what is in the policy:

```bash
kubectl get endpoints kubernetes -n default -o jsonpath='{.subsets[0].addresses[0].ip}'
```

Some clusters expose the API server on port 443, others on 6443. Include both ports in the policy if you are unsure.

**Source controller cannot reach Git or registries**

If your Git server or registry is on a private IP range (10.x, 172.16.x, 192.168.x), the source-controller policy excludes those ranges. Add explicit allow rules for those internal IPs:

```yaml
egress:
  - to:
      - ipBlock:
          cidr: 10.0.50.100/32
    ports:
      - protocol: TCP
        port: 443
```

**Notification alerts stop working**

Verify that the notification-controller can reach the webhook endpoint. Check the provider status:

```bash
kubectl get providers -n flux-system
kubectl logs -n flux-system deployment/notification-controller --tail=20
```

If the webhook endpoint is on an internal network, add the IP to the notification-controller egress policy.
