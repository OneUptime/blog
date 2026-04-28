# How to Create a Kubernetes NetworkPolicy for IPv4 Ingress CIDRs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, NetworkPolicy, IPv4, Security, Ingress, CIDR

Description: Write Kubernetes NetworkPolicy manifests that allow inbound IPv4 traffic to pods only from specified CIDR ranges for network segmentation and security.

NetworkPolicy is a Kubernetes resource that controls traffic to and from pods. By default, pods accept all inbound traffic. Adding an ingress policy restricts access to only the specified sources.

## Basic Ingress Policy: Allow from a CIDR

```yaml
# allow-ingress-from-cidr.yaml

apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-from-vpn
  namespace: production
spec:
  # Apply to pods with this label
  podSelector:
    matchLabels:
      app: my-api
  # This policy type affects inbound traffic
  policyTypes:
  - Ingress
  ingress:
  - from:
    # Allow traffic from corporate VPN range
    - ipBlock:
        cidr: 10.10.0.0/16
    # Allow traffic from monitoring subnet
    - ipBlock:
        cidr: 192.168.100.0/24
    ports:
    # Only allow connections on port 8080
    - protocol: TCP
      port: 8080
```

```bash
kubectl apply -f allow-ingress-from-cidr.yaml

# Verify the policy was created
kubectl describe networkpolicy allow-ingress-from-vpn -n production
```

## Allow Multiple CIDRs with Exceptions

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-web-ingress
  namespace: default
spec:
  podSelector:
    matchLabels:
      tier: frontend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - ipBlock:
        # Allow the entire 10.0.0.0/8 private range
        cidr: 10.0.0.0/8
        # But exclude this specific subnet (e.g., development environment)
        except:
        - 10.200.0.0/24
    ports:
    - protocol: TCP
      port: 80
    - protocol: TCP
      port: 443
```

## Allow Ingress from Both Internal Pods and External CIDR

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-mixed-ingress
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: database
  policyTypes:
  - Ingress
  ingress:
  # Allow from pods in the same namespace with the 'backend' label
  - from:
    - podSelector:
        matchLabels:
          role: backend
    ports:
    - protocol: TCP
      port: 5432
  # Allow from a monitoring CIDR (e.g., Prometheus scraper)
  - from:
    - ipBlock:
        cidr: 10.96.0.0/12  # Kubernetes service CIDR
    ports:
    - protocol: TCP
      port: 9187  # postgres_exporter
```

## Testing the Policy

```bash
# From a pod in the allowed CIDR, connection should succeed
kubectl run test-allowed --image=alpine --restart=Never \
  -- sh -c "wget -qO- http://my-api-service:8080/health"

# From a pod outside the allowed CIDR, connection should fail
kubectl run test-blocked --image=alpine --restart=Never \
  -- sh -c "wget -qO- -T 5 http://my-api-service:8080/health && echo FAIL || echo BLOCKED"

# Verify by viewing the policy
kubectl get networkpolicy -n production
```

## Checking Policy Enforcement with Calico

```bash
# View Calico's view of applied policies
kubectl get networkpolicies --all-namespaces
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl get networkpolicy --all-namespaces -o yaml
```

Note: NetworkPolicy requires a CNI plugin that enforces them (Calico, Cilium, Weave). Flannel does NOT enforce NetworkPolicy without a separate policy plugin.
