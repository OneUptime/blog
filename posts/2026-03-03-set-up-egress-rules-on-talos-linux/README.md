# How to Set Up Egress Rules on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Network Policies, Egress, Security

Description: A comprehensive guide to setting up egress network policy rules on Talos Linux for controlling outbound traffic from your Kubernetes pods.

---

Controlling outbound traffic from your Kubernetes pods is just as important as controlling inbound traffic, and on Talos Linux, egress rules through Kubernetes network policies are your primary mechanism for doing so. This guide covers how to think about egress policies, write them correctly, and avoid the common mistakes that lead to broken applications.

## Why Egress Rules Matter

Most people start with ingress rules because they are thinking about who can access their services. But egress is where a compromised pod becomes truly dangerous. Without egress controls, a pod that gets exploited can reach out to command-and-control servers, exfiltrate data to external endpoints, scan your internal network for other vulnerable services, or make API calls to cloud provider metadata endpoints.

Talos Linux has host-level firewalling for node services, but that is not a replacement for controlling pod-to-pod or pod-to-external traffic. For Kubernetes workloads, CNI-enforced network policies are the practical mechanism for controlling outbound traffic.

## Prerequisites

You need a CNI that enforces network policies. On Talos Linux, Cilium is a common choice. Make sure your Talos cluster is created without the default CNI before installing Cilium:

```bash
# Install Cilium on a Talos cluster prepared for a custom CNI
cilium install \
  --version 1.19.3 \
  --set ipam.mode=kubernetes \
  --set kubeProxyReplacement=false \
  --set securityContext.capabilities.ciliumAgent="{CHOWN,KILL,NET_ADMIN,NET_RAW,IPC_LOCK,SYS_ADMIN,SYS_RESOURCE,DAC_OVERRIDE,FOWNER,SETGID,SETUID}" \
  --set securityContext.capabilities.cleanCiliumState="{NET_ADMIN,SYS_ADMIN,SYS_RESOURCE}" \
  --set cgroup.autoMount.enabled=false \
  --set cgroup.hostRoot=/sys/fs/cgroup

# Verify it is running
cilium status --wait
```

## Starting with Default Deny Egress

The safest starting point is to deny all egress traffic and then add specific allow rules:

```yaml
# default-deny-egress.yaml
# Deny all outbound traffic from all pods in the namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
```

After applying this, no pod in the production namespace can send traffic anywhere. This includes DNS, so name resolution will break immediately.

```bash
kubectl apply -f default-deny-egress.yaml
```

## Building Up Allow Rules

Now add rules for traffic that should be allowed. The first rule you always need is DNS:

```yaml
# allow-dns-egress.yaml
# Allow all pods to resolve DNS names
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

## Egress to Internal Services

Allow your web application to reach its database:

```yaml
# allow-web-to-db.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-web-to-db
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-api
  policyTypes:
    - Egress
  egress:
    # Allow traffic to PostgreSQL
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
    # Allow traffic to Redis
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
```

## Egress to Other Namespaces

If your application needs to reach services in other namespaces, specify the namespace selector:

```yaml
# allow-egress-to-other-ns.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-egress-to-shared-services
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-api
  policyTypes:
    - Egress
  egress:
    # Allow traffic to the message queue in the infrastructure namespace
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: infrastructure
          podSelector:
            matchLabels:
              app: rabbitmq
      ports:
        - protocol: TCP
          port: 5672
```

Make sure the target namespace has the correct labels:

```bash
# Kubernetes 1.21+ automatically sets this label
kubectl get namespace infrastructure --show-labels
```

## Egress to External Services

Many applications need to reach external APIs, package registries, or other internet services. Use CIDR blocks for this:

```yaml
# allow-external-egress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-apis
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-api
  policyTypes:
    - Egress
  egress:
    # Allow HTTPS to specific external IPs
    - to:
        - ipBlock:
            cidr: 52.20.0.0/16  # Example: AWS region
      ports:
        - protocol: TCP
          port: 443
    # Allow traffic to any external IP, excluding internal ranges
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 100.64.0.0/10
              - 172.16.0.0/12
              - 192.168.0.0/16
              - 169.254.0.0/16
      ports:
        - protocol: TCP
          port: 443
```

The second rule is a useful pattern - it allows HTTPS traffic to any external IP while blocking traffic to private, carrier-grade NAT, and link-local ranges. This helps prevent pods from reaching internal services or common cloud metadata endpoints while still allowing them to call external APIs.

## Egress to Kubernetes API Server

Some applications need to interact with the Kubernetes API. The API server usually runs on the control plane nodes and listens on port 6443. Standard Kubernetes network policies do not select Services directly, so use the actual control-plane endpoint or load-balancer address rather than relying on the `kubernetes` Service ClusterIP:

```yaml
# allow-kube-api-egress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-kube-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      needs-kube-api: "true"
  policyTypes:
    - Egress
  egress:
    # Allow traffic to the Kubernetes API server
    - to:
        - ipBlock:
            cidr: 10.0.0.10/32  # API server endpoint or load balancer IP
      ports:
        - protocol: TCP
          port: 6443
```

Find your API server endpoint addresses:

```bash
# Get the backend addresses and port for the kubernetes service
kubectl get endpointslice -n default \
  -l kubernetes.io/service-name=kubernetes \
  -o yaml
```

## Combining Multiple Egress Rules

Real-world policies typically combine several rules. Here is a comprehensive example:

```yaml
# comprehensive-egress.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web-api-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-api
  policyTypes:
    - Egress
  egress:
    # DNS resolution
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    # Database access
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
    # Cache access
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379
    # External HTTPS APIs
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 100.64.0.0/10
              - 172.16.0.0/12
              - 192.168.0.0/16
              - 169.254.0.0/16
      ports:
        - protocol: TCP
          port: 443
```

## Testing Egress Rules

After applying your policies, test that they work as expected:

```bash
# Verify allowed traffic works
kubectl exec -n production deploy/web-api -- \
  nc -vz -w 3 postgres 5432

# Verify blocked traffic is actually blocked
kubectl exec -n production deploy/web-api -- \
  nc -vz -w 3 some-other-service 8080

# Test external connectivity
kubectl exec -n production deploy/web-api -- \
  curl -s --connect-timeout 3 https://api.example.com

# Test that blocked external ports fail
kubectl exec -n production deploy/web-api -- \
  curl -s --connect-timeout 3 http://example.com:80
```

## Debugging Egress Issues on Talos

When egress rules do not work as expected on Talos Linux, use these approaches:

```bash
# Check current network policies
kubectl get networkpolicies -n production -o yaml

# If using Cilium, monitor policy decisions
kubectl -n kube-system exec <cilium-pod> -c cilium-agent -- \
  cilium-dbg monitor --type policy-verdict --to <endpoint-id>

# Check endpoint status in Cilium
kubectl -n kube-system exec <cilium-pod> -c cilium-agent -- \
  cilium-dbg endpoint list

# Use talosctl to check node-level networking
talosctl get addresses --nodes <node-ip>
talosctl dmesg --nodes <node-ip> | grep -i drop
```

A common debugging technique is to temporarily apply a wide-open egress rule and narrow it down:

```bash
# Temporarily allow all egress (for debugging only)
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: debug-allow-all-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web-api
  policyTypes:
    - Egress
  egress:
    - {}
EOF

# Test connectivity, then remove the debug policy
kubectl delete networkpolicy debug-allow-all-egress -n production
```

## Tips and Gotchas

Remember these things when working with egress rules on Talos Linux. Network policies are additive, meaning a pod only needs one policy to allow specific traffic. You cannot write a policy that overrides another policy's allow rule with a deny. Always include both UDP and TCP for DNS because some queries use TCP. When you specify a `to` block with both `namespaceSelector` and `podSelector` on the same level (same list item), they are ANDed together. When they are on separate list items, they are ORed. This distinction trips people up constantly. And finally, if you are blocking egress to all internal IPs using the `except` trick, make sure your cluster's pod and service CIDRs, node subnets, link-local ranges, and any cloud-provider metadata addresses are included in the exception list.

Egress rules are a critical part of a defense-in-depth strategy for your Talos Linux Kubernetes cluster. Start with deny-all, add DNS first, then layer on the specific rules your applications need. Test everything, and keep your policies as tight as possible.
