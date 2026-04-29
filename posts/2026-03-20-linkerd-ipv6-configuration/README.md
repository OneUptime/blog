# How to Configure Linkerd with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linkerd, IPv6, Service Mesh, Dual-Stack, Kubernetes, Proxy

Description: A guide to configuring Linkerd service mesh with IPv6 and dual-stack Kubernetes clusters, including proxy injection, HTTPRoutes, and observability for IPv6 traffic.

Linkerd 2.16+ fully supports IPv6-only and dual-stack IPv4/IPv6 Kubernetes clusters. IPv6 support is disabled by default, so enable it during installation with `disableIPv6=false`. Once IPv6 is enabled and the cluster is configured for dual-stack, the Linkerd proxy (written in Rust) handles IPv6 connections transparently.

## Prerequisites: Dual-Stack Kubernetes Cluster

Linkerd requires the underlying Kubernetes cluster to support dual-stack. Verify:

```bash
# On kubeadm-based clusters, check the configured dual-stack service and pod CIDRs

kubectl get configmap kubeadm-config -n kube-system -o yaml | grep -A 5 networking

# Check a pod has both IPv4 and IPv6 addresses
kubectl run check-ipv6 --image=busybox --restart=Never -- sleep 60
kubectl wait --for=condition=Ready pod/check-ipv6 --timeout=60s
kubectl get pod check-ipv6 -o jsonpath='{.status.podIPs}'
# Output: [{"ip":"10.0.0.5"},{"ip":"fd00::5"}]
kubectl delete pod check-ipv6
```

## Installing Linkerd on a Dual-Stack Cluster

```bash
# Install Linkerd CLI
curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install | sh
export PATH=$PATH:$HOME/.linkerd2/bin

# If you plan to use HTTPRoute resources, check whether the Gateway API CRDs are installed
# If this returns NotFound, install a Gateway API release compatible with your Linkerd version
kubectl get crds/httproutes.gateway.networking.k8s.io \
  -o "jsonpath={.metadata.annotations.gateway\.networking\.k8s\.io/bundle-version}"

# Verify pre-installation checks
linkerd check --pre

# Install Linkerd CRDs
linkerd install --crds | kubectl apply -f -

# Install Linkerd control plane with IPv6 enabled
linkerd install --set disableIPv6=false | kubectl apply -f -

# Verify installation
linkerd check
```

## Verifying IPv6 in Linkerd Control Plane

```bash
# Check Linkerd control plane pods have dual-stack IPs
kubectl get pods -n linkerd -o wide
kubectl get pod -n linkerd -l linkerd.io/control-plane-component=destination \
  -o jsonpath='{.items[0].status.podIPs}'

# Check Linkerd destination EndpointSlices include IPv6 addresses
kubectl get endpointslice -n linkerd -l kubernetes.io/service-name=linkerd-dst \
  -o yaml | grep -A 3 "addresses:"

# Confirm IPv6 support is enabled in Linkerd's install values
kubectl get cm -n linkerd linkerd-config -o yaml | grep -i disableipv6
```

## Injecting Linkerd Proxy into Deployments

```yaml
# Deployment with Linkerd proxy injection
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
  annotations:
    linkerd.io/inject: enabled    # Inject Linkerd proxy
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        linkerd.io/inject: enabled
    spec:
      containers:
        - name: app
          image: nginx:alpine
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: default
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 80
```

```bash
kubectl apply -f deployment.yaml
kubectl rollout status deploy/my-app

# Verify proxy was injected (2/2 containers)
kubectl get pod -l app=my-app
# NAME                      READY   STATUS
# my-app-xxx-yyy            2/2     Running

# Check the meshed pod has both IPv4 and IPv6 addresses
kubectl get pod -l app=my-app -o jsonpath='{.items[0].status.podIPs}'
```

## Linkerd HTTPRoute for IPv6 Traffic

```yaml
# HTTPRoute (Gateway API) for traffic management
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app-route
  namespace: default
spec:
  parentRefs:
    - group: ""
      kind: Service
      name: my-app
      port: 80
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: my-app
          port: 80
```

## Server and AuthorizationPolicy for mTLS

```yaml
# Define a Server (inbound listener)
apiVersion: policy.linkerd.io/v1beta3
kind: Server
metadata:
  name: my-app-server
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: my-app
  port: 80
  proxyProtocol: HTTP/1
---
# Authenticate a specific client ServiceAccount over mTLS
apiVersion: policy.linkerd.io/v1alpha1
kind: MeshTLSAuthentication
metadata:
  name: frontend-authn
  namespace: default
spec:
  identityRefs:
    - kind: ServiceAccount
      name: frontend
---
# Authorize that authenticated client to access the Server
apiVersion: policy.linkerd.io/v1alpha1
kind: AuthorizationPolicy
metadata:
  name: my-app-authz
  namespace: default
spec:
  targetRef:
    group: policy.linkerd.io
    kind: Server
    name: my-app-server
  requiredAuthenticationRefs:
    - group: policy.linkerd.io
      kind: MeshTLSAuthentication
      name: frontend-authn
```

## Observability for IPv6 Traffic

```bash
# Install Linkerd Viz extension
linkerd viz install | kubectl apply -f -
linkerd viz check

# View real-time traffic stats (works for IPv4 and IPv6)
linkerd viz stat deploy/my-app

# Output includes:
# NAME      MESHED  SUCCESS  RPS  LATENCY_P50  LATENCY_P95  LATENCY_P99
# my-app    2/2     100.00%  1.2  1ms          2ms          3ms

# View live traffic (tap)
linkerd viz tap deploy/my-app

# Check specific IPv6 source connections
linkerd viz tap deploy/my-app -o wide | grep 'fd00::5'
```

## Linkerd Dashboard

```bash
# Open Linkerd dashboard
linkerd viz dashboard &

# The dashboard shows all traffic including IPv6
# Browse to http://localhost:50750
```

## Troubleshooting Linkerd IPv6

```bash
# Check the control plane was installed with IPv6 enabled
kubectl get cm -n linkerd linkerd-config -o yaml | grep -i disableipv6

# Check the meshed pod has both IPv4 and IPv6 addresses
kubectl get pod -l app=my-app -o jsonpath='{.items[0].status.podIPs}'

# Check the proxy logs for network or policy errors
kubectl logs $(kubectl get pod -l app=my-app -o name | head -1) -c linkerd-proxy \
  | grep -i "error\|failfast" | tail -20

# Check whether traffic redirection is handled by proxy-init or the CNI plugin
kubectl get pod $(kubectl get pod -l app=my-app -o name | head -1) \
  -o jsonpath='{.spec.initContainers[*].name}'

# Linkerd destination controller logs
kubectl logs -n linkerd deploy/linkerd-destination | grep -i "ipv6\|error" | tail -20

# Check if service EndpointSlices include IPv6 addresses
kubectl get endpointslice -l kubernetes.io/service-name=my-app -o yaml | grep -A 3 "addresses"
```

Linkerd handles IPv6 transparently on supported clusters, but you must enable IPv6 support when installing the control plane (and the Linkerd CNI plugin, if you use it). On dual-stack clusters, once IPv6 is enabled, Linkerd will use the IPv6 endpoints of destinations. Traffic interception is set up either by the `linkerd-init` init container or by the Linkerd CNI plugin.
