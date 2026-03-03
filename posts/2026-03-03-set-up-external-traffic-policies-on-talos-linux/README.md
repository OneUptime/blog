# How to Set Up External Traffic Policies on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Networking, Traffic Policy, Load Balancing

Description: Learn how to configure external traffic policies on Talos Linux to control how incoming traffic reaches your Kubernetes services and preserve client IP addresses.

---

When you run services on Kubernetes in a Talos Linux environment, one of the things you will eventually need to think about is how external traffic reaches your pods. By default, Kubernetes distributes incoming traffic across all nodes in the cluster, which can cause unnecessary network hops and obscure the original client IP address. External traffic policies give you control over this behavior, and on Talos Linux, setting them up is straightforward once you understand the moving parts.

## What Are External Traffic Policies?

In Kubernetes, a Service of type LoadBalancer or NodePort can have an `externalTrafficPolicy` field set to either `Cluster` or `Local`. The default is `Cluster`, which means traffic arriving at any node gets distributed across all pods backing the service, regardless of which node they run on. This provides even load distribution but introduces an extra hop when traffic lands on a node that does not host the target pod.

Setting the policy to `Local` changes this behavior. Traffic is only forwarded to pods on the node where it arrives. If no matching pod exists on that node, the traffic is dropped. This approach preserves the client source IP and reduces latency from extra hops, but it requires careful planning to make sure pods are distributed properly.

## Why This Matters on Talos Linux

Talos Linux is a minimal, immutable operating system designed specifically for Kubernetes. Because you cannot SSH into Talos nodes or install additional packages, all networking configuration must go through the Talos machine configuration or Kubernetes manifests. This means you need to be deliberate about your networking choices from the start.

Talos ships with kube-proxy by default (unless you replace it with Cilium or another CNI that handles kube-proxy replacement). The external traffic policy is enforced by kube-proxy or your CNI plugin, so the configuration happens at the Kubernetes service level.

## Setting Up a Service with Local External Traffic Policy

Here is a basic service manifest that uses the Local external traffic policy:

```yaml
# service-local-traffic.yaml
# A LoadBalancer service that preserves client source IPs
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: production
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  selector:
    app: web-app
  ports:
    - name: http
      port: 80
      targetPort: 8080
      protocol: TCP
    - name: https
      port: 443
      targetPort: 8443
      protocol: TCP
```

Apply this to your Talos Linux cluster:

```bash
# Apply the service manifest
kubectl apply -f service-local-traffic.yaml

# Verify the external traffic policy is set
kubectl get svc web-app -n production -o jsonpath='{.spec.externalTrafficPolicy}'
```

The output should show `Local`.

## Configuring Health Check Node Ports

When you set `externalTrafficPolicy: Local`, Kubernetes automatically allocates a health check node port. External load balancers use this port to determine which nodes have ready pods for the service. Nodes without matching pods will fail the health check and stop receiving traffic.

You can specify a custom health check node port if needed:

```yaml
# service-custom-healthcheck.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: production
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  healthCheckNodePort: 30500
  selector:
    app: web-app
  ports:
    - name: http
      port: 80
      targetPort: 8080
```

To verify the health check node port is working:

```bash
# Check the allocated health check node port
kubectl get svc web-app -n production -o jsonpath='{.spec.healthCheckNodePort}'

# Test the health check endpoint from within the cluster
curl http://<node-ip>:30500/healthz
```

If a pod is running on that node, you will get a 200 response with the number of local endpoints. If not, you will get a 503.

## Handling Pod Distribution with DaemonSets

One challenge with the Local policy is that if your pods are not spread across all nodes, some nodes will reject traffic. You can address this by using a DaemonSet for workloads that need to receive external traffic on every node:

```yaml
# daemonset-web-app.yaml
# Run one instance on every node to ensure Local traffic policy works
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: web-app
  namespace: production
spec:
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web-app
          image: nginx:1.25
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

Alternatively, you can use pod topology spread constraints to distribute pods evenly:

```yaml
# deployment-spread.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: web-app
      containers:
        - name: web-app
          image: nginx:1.25
          ports:
            - containerPort: 8080
```

## Using Cilium as a kube-proxy Replacement

If you have replaced kube-proxy with Cilium on your Talos cluster, external traffic policies work similarly but with some additional options. You can configure Cilium through the Talos machine config:

```yaml
# talos-machine-config snippet for Cilium
cluster:
  inlineManifests:
    - name: cilium
      contents: |
        # Cilium HelmChart values
        kubeProxyReplacement: true
        externalTrafficPolicy: Local
        bpf:
          masquerade: true
        loadBalancer:
          algorithm: maglev
```

With Cilium, you also get support for Direct Server Return (DSR) mode, which can further reduce latency for external traffic:

```yaml
# Cilium DSR configuration
loadBalancer:
  mode: dsr
  algorithm: maglev
```

## Verifying Source IP Preservation

After setting up the Local traffic policy, you should verify that client IPs are being preserved. Deploy a simple echo server:

```bash
# Deploy an echo server
kubectl run echoserver --image=registry.k8s.io/echoserver:1.10 --port=8080

# Expose it with Local traffic policy
kubectl expose pod echoserver --type=LoadBalancer --port=80 --target-port=8080 \
  --overrides='{"spec":{"externalTrafficPolicy":"Local"}}'

# Test from an external client
curl http://<loadbalancer-ip>/
```

In the response, look for the `x-real-ip` or `x-forwarded-for` headers. With the Local policy, these should show your actual client IP instead of a cluster-internal IP.

## Monitoring Traffic Distribution

Once everything is configured, keep an eye on how traffic distributes across your nodes. If you notice uneven load, it usually means your pods are not evenly spread:

```bash
# Check which nodes have pods for the service
kubectl get pods -n production -l app=web-app -o wide

# Check endpoint slices for distribution info
kubectl get endpointslices -n production -l kubernetes.io/service-name=web-app
```

## Common Pitfalls

There are a few things to watch out for. First, if you are using MetalLB with Talos Linux (a common setup for bare-metal clusters), make sure your MetalLB speaker pods are running on the same nodes as your application pods when using the Local policy. Second, remember that switching from Cluster to Local on a live service will cause a brief disruption as the load balancer updates its health checks. Third, if you are running a small cluster with only a few nodes, the Local policy can lead to uneven load distribution if your pod replicas do not match the number of nodes.

## Wrapping Up

External traffic policies on Talos Linux work exactly as they do on any Kubernetes distribution, but the immutable nature of Talos means you need to plan your networking configuration carefully. The Local policy is valuable when you need source IP preservation or want to minimize network hops. Pair it with proper pod distribution strategies and health check monitoring, and you will have a solid foundation for handling external traffic in your Talos Linux cluster.
