# How to Install Istio in Dual-Stack (IPv4/IPv6) Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, IPv6, Dual-Stack, Kubernetes, Networking, Service Mesh

Description: Step-by-step guide to installing and configuring Istio in dual-stack mode supporting both IPv4 and IPv6 traffic in Kubernetes clusters.

---

Running a dual-stack Kubernetes cluster is becoming more common as organizations prepare for IPv6 adoption while still maintaining IPv4 compatibility. Istio supports dual-stack networking, but setting it up requires some specific configuration that is easy to get wrong.

This guide covers how to get Istio running properly in a dual-stack environment so your services can communicate over both IPv4 and IPv6.

## Prerequisites

Before touching Istio, your Kubernetes cluster needs to be configured for dual-stack networking. This is a cluster-level setting that has to be in place first.

Verify your cluster supports dual-stack:

```bash
kubectl get nodes -o jsonpath='{.items[*].status.addresses}' | jq .
```

You should see both IPv4 and IPv6 addresses for each node. Also check that your pods are getting dual-stack addresses:

```bash
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.podIPs}{"\n"}{end}'
```

If you only see single-stack addresses, your cluster is not configured for dual-stack. You will need to fix that before proceeding.

For a kubeadm-based cluster, your cluster configuration should include:

```yaml
apiVersion: kubeadm.k8s.io/v1beta3
kind: ClusterConfiguration
networking:
  podSubnet: "10.244.0.0/16,fd00:10:244::/48"
  serviceSubnet: "10.96.0.0/16,fd00:10:96::/108"
```

## Kubernetes Version Requirements

Dual-stack has been stable since Kubernetes 1.23. Make sure you are running at least that version:

```bash
kubectl version --short
```

## Installing Istio with Dual-Stack Support

The key setting for dual-stack in Istio is the `ISTIO_DUAL_STACK` environment variable and the mesh configuration. Here is the IstioOperator configuration:

```yaml
# istio-dual-stack.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_DUAL_STACK: "true"
  values:
    pilot:
      env:
        ISTIO_DUAL_STACK: "true"
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          service:
            ipFamilyPolicy: PreferDualStack
            ipFamilies:
              - IPv4
              - IPv6
```

Install it:

```bash
istioctl install -f istio-dual-stack.yaml -y
```

If you prefer Helm, the equivalent values file looks like this:

```yaml
# values-dual-stack.yaml
meshConfig:
  defaultConfig:
    proxyMetadata:
      ISTIO_DUAL_STACK: "true"

pilot:
  env:
    ISTIO_DUAL_STACK: "true"
```

```bash
helm install istio-base istio/base -n istio-system --create-namespace
helm install istiod istio/istiod -n istio-system -f values-dual-stack.yaml
```

For the gateway, configure dual-stack service properties:

```yaml
# values-gateway-dual-stack.yaml
service:
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv4
    - IPv6
```

```bash
helm install istio-ingress istio/gateway \
  -n istio-ingress --create-namespace \
  -f values-gateway-dual-stack.yaml
```

## Understanding IP Family Policy Options

Kubernetes offers three options for `ipFamilyPolicy`:

- **SingleStack** - Service gets a single IP from the first entry in `ipFamilies`
- **PreferDualStack** - Service gets IPs from both families when available, falls back to single-stack
- **RequireDualStack** - Service must get IPs from both families or it fails

For most cases, `PreferDualStack` is the right choice because it is more forgiving during transitions.

## Verifying Dual-Stack is Working

After installation, check that istiod is aware of dual-stack:

```bash
kubectl logs -n istio-system deploy/istiod | grep -i "dual"
```

Check the gateway service to confirm it has both IPv4 and IPv6 addresses:

```bash
kubectl get svc -n istio-ingress istio-ingress -o yaml | grep -A 5 clusterIPs
```

You should see something like:

```yaml
clusterIPs:
  - 10.96.45.123
  - fd00:10:96::1a2b
ipFamilies:
  - IPv4
  - IPv6
ipFamilyPolicy: PreferDualStack
```

## Deploying a Test Application

Deploy a simple application and enable sidecar injection:

```bash
kubectl create namespace dual-stack-test
kubectl label namespace dual-stack-test istio-injection=enabled
```

```yaml
# test-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
  namespace: dual-stack-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: httpbin
  template:
    metadata:
      labels:
        app: httpbin
    spec:
      containers:
        - name: httpbin
          image: docker.io/kennethreitz/httpbin
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: httpbin
  namespace: dual-stack-test
spec:
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv4
    - IPv6
  selector:
    app: httpbin
  ports:
    - port: 80
      targetPort: 80
```

```bash
kubectl apply -f test-app.yaml
```

Verify the service has dual-stack IPs:

```bash
kubectl get svc httpbin -n dual-stack-test -o jsonpath='{.spec.clusterIPs}'
```

## Testing Connectivity Over Both Protocols

Deploy a sleep pod to act as a client:

```yaml
# sleep.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sleep
  namespace: dual-stack-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sleep
  template:
    metadata:
      labels:
        app: sleep
    spec:
      containers:
        - name: sleep
          image: curlimages/curl
          command: ["/bin/sleep", "infinity"]
```

```bash
kubectl apply -f sleep.yaml
```

Test IPv4 connectivity:

```bash
kubectl exec -n dual-stack-test deploy/sleep -- curl -4 -s http://httpbin.dual-stack-test/ip
```

Test IPv6 connectivity:

```bash
kubectl exec -n dual-stack-test deploy/sleep -- curl -6 -s http://httpbin.dual-stack-test/ip
```

Both should return successfully with the respective IP addresses.

## Configuring VirtualService for Dual-Stack

VirtualService and DestinationRule configurations work the same way in dual-stack mode. Istio handles the IP family selection transparently:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: httpbin
  namespace: dual-stack-test
spec:
  hosts:
    - httpbin
  http:
    - route:
        - destination:
            host: httpbin
            port:
              number: 80
```

## Common Issues and Troubleshooting

**Pods only getting IPv4 addresses**: Check your CNI plugin. Not all CNI plugins support dual-stack equally. Calico and Cilium both have good dual-stack support.

**Gateway only listening on one protocol**: Make sure the gateway Service has `ipFamilyPolicy: PreferDualStack` set explicitly.

**DNS resolution failing for IPv6**: Istio's DNS proxy needs to be configured to return both A and AAAA records. Verify the `ISTIO_META_DNS_CAPTURE` proxy metadata is set:

```yaml
meshConfig:
  defaultConfig:
    proxyMetadata:
      ISTIO_META_DNS_CAPTURE: "true"
      ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

**Connection timeouts on IPv6**: Check your node firewall rules. Often IPv4 traffic works fine but IPv6 is blocked by iptables/ip6tables rules that were not updated.

```bash
# Check ip6tables rules on a node
ip6tables -L -n -v
```

## Performance Considerations

Running dual-stack does add a small overhead. Each service gets two cluster IPs, and Envoy needs to maintain listeners for both protocols. In practice, the overhead is minimal, but if you are running thousands of services, the extra memory usage on istiod and each proxy is worth monitoring.

Keep an eye on proxy memory:

```bash
kubectl top pods -n dual-stack-test --containers
```

## Wrapping Up

Dual-stack Istio is straightforward once your cluster networking is properly configured. The main things to remember are enabling `ISTIO_DUAL_STACK` on both istiod and the proxy sidecars, and setting the right `ipFamilyPolicy` on your gateway and application services. Test both IPv4 and IPv6 paths independently to make sure traffic flows correctly through the mesh on both protocols.
