# How to Set Up Network Policies with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Network Policies, Kubernetes, Security, CNI, Networking

Description: Learn how to implement Kubernetes network policies in Talos Linux clusters to control pod-to-pod traffic and improve cluster security.

---

Network policies in Kubernetes let you control which pods can talk to each other and which external endpoints they can reach. In a Talos Linux cluster, network policies work at the Kubernetes layer rather than the host layer, giving you fine-grained control over pod traffic flows. This is one of the most important security features you can enable, yet many clusters run without any network policies at all.

This guide covers how to set up and use Kubernetes network policies in a Talos Linux environment, including choosing the right CNI plugin and writing effective policies.

## Why Network Policies Matter

By default, Kubernetes allows all pods to communicate with all other pods. There are no restrictions. This means a compromised pod in one namespace can freely communicate with pods in every other namespace, including your database pods, secret stores, and internal APIs.

Network policies let you define rules like:

- Only the frontend pods can talk to the API pods
- Only the API pods can talk to the database
- Nothing in the development namespace can reach the production namespace
- Only specific pods can make external network calls

This is the principle of least privilege applied to network traffic.

## CNI Plugin Requirements

Not all CNI plugins support network policies. The default Flannel CNI in Talos Linux does not enforce network policies. If you apply network policy resources with Flannel, Kubernetes will accept them without errors, but they will have absolutely no effect.

CNI plugins that support network policies include:

- **Calico** - Full network policy support including Calico-specific extensions
- **Cilium** - Full support with additional CiliumNetworkPolicy CRDs
- **Weave Net** - Basic network policy support
- **Antrea** - Full network policy support

For Talos Linux, Calico and Cilium are the most popular choices for network policy enforcement.

## Installing Cilium for Network Policy Support

First, disable the default CNI in your Talos machine configuration:

```yaml
# Disable default Flannel CNI
cluster:
  network:
    cni:
      name: none
  proxy:
    disabled: true    # Cilium can replace kube-proxy
```

Then install Cilium:

```bash
# Add Cilium Helm repo
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with policy enforcement
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set policyEnforcementMode=default \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true
```

Verify that Cilium is running and network policy enforcement is active:

```bash
# Check Cilium pods
kubectl get pods -n kube-system -l k8s-app=cilium

# Verify policy enforcement mode
kubectl exec -n kube-system ds/cilium -- cilium status | grep "Policy Enforcement"
```

## Writing Your First Network Policy

Let us start with a simple example. Say you have a web application with frontend pods, API pods, and database pods, each in their own namespace.

### Default Deny All Traffic

The first step is always to create a default deny policy. This blocks all ingress traffic to pods in a namespace unless explicitly allowed:

```yaml
# Default deny all ingress traffic in the api namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: api
spec:
  podSelector: {}    # Applies to all pods in the namespace
  policyTypes:
    - Ingress
```

Apply it:

```bash
# Apply the default deny policy
kubectl apply -f default-deny-ingress.yaml

# Verify the policy was created
kubectl get networkpolicies -n api
```

### Allow Traffic from Specific Pods

Now allow the frontend pods to reach the API pods:

```yaml
# Allow frontend to reach API pods on port 8080
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-api
  namespace: api
spec:
  podSelector:
    matchLabels:
      app: api-server
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: frontend
          podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
```

### Allow API to Database

Similarly, allow only the API pods to reach the database:

```yaml
# Allow API pods to reach database on port 5432
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-to-database
  namespace: database
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: api
          podSelector:
            matchLabels:
              app: api-server
      ports:
        - protocol: TCP
          port: 5432
```

## Egress Policies

Egress policies control outbound traffic from pods. This is useful for preventing data exfiltration or ensuring pods only communicate with approved external services:

```yaml
# Restrict egress from API pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-egress
  namespace: api
spec:
  podSelector:
    matchLabels:
      app: api-server
  policyTypes:
    - Egress
  egress:
    # Allow DNS resolution
    - to: []
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    # Allow traffic to database namespace
    - to:
        - namespaceSelector:
            matchLabels:
              name: database
      ports:
        - protocol: TCP
          port: 5432
    # Allow traffic to external API
    - to:
        - ipBlock:
            cidr: 203.0.113.0/24    # External API server range
      ports:
        - protocol: TCP
          port: 443
```

Always remember to allow DNS (port 53) in your egress policies, or your pods will not be able to resolve any hostnames.

## Testing Network Policies

After applying policies, test them to make sure they work:

```bash
# Create a test pod in the frontend namespace
kubectl run test-frontend -n frontend --image=busybox --rm -it -- wget -qO- --timeout=5 http://api-server.api.svc:8080/health
# This should succeed

# Create a test pod in a random namespace
kubectl run test-random -n default --image=busybox --rm -it -- wget -qO- --timeout=5 http://api-server.api.svc:8080/health
# This should timeout or be refused
```

## Using Cilium Network Policies

If you are using Cilium, you can take advantage of CiliumNetworkPolicy resources that offer additional features beyond the standard Kubernetes network policy API:

```yaml
# Cilium-specific network policy with L7 filtering
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-l7-policy
  namespace: api
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              - method: "GET"
                path: "/api/v1/.*"    # Only allow GET requests to /api/v1/*
```

Cilium policies can filter at Layer 7, meaning you can write rules based on HTTP methods, paths, and headers - not just IP addresses and ports.

## Monitoring Policy Enforcement

With Cilium's Hubble observability tool, you can see exactly which traffic is being allowed and denied:

```bash
# Install Hubble CLI
export HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/master/stable.txt)
curl -L --remote-name-all https://github.com/cilium/hubble/releases/download/$HUBBLE_VERSION/hubble-linux-amd64.tar.gz
tar xzvf hubble-linux-amd64.tar.gz

# Port-forward to Hubble relay
kubectl port-forward -n kube-system svc/hubble-relay 4245:80 &

# Watch policy verdicts in real-time
hubble observe --verdict DROPPED
hubble observe --verdict FORWARDED --namespace api
```

## Common Mistakes to Avoid

1. **Forgetting DNS egress**: If you create an egress policy and forget to allow DNS, everything breaks because pods cannot resolve service names.

2. **Namespace labels**: Network policies use namespace selectors based on labels. Make sure your namespaces are labeled correctly:

```bash
# Label your namespaces
kubectl label namespace frontend name=frontend
kubectl label namespace api name=api
kubectl label namespace database name=database
```

3. **Policy ordering**: Network policies are additive. There is no concept of deny rules in the standard API. You start with a default deny and then add allow rules.

4. **System namespaces**: Be careful about applying deny-all policies to kube-system or other system namespaces. You can break critical cluster services.

## Conclusion

Network policies are a fundamental security layer for any Kubernetes cluster, and Talos Linux clusters are no exception. The main thing to remember is that you need a CNI plugin that actually enforces policies - Flannel does not. Cilium and Calico are both solid choices for Talos Linux. Start with default deny policies in each namespace, then carefully add allow rules for the specific traffic flows your applications need. Test every policy before rolling it out to production, and use tools like Hubble to monitor policy enforcement in real time.
