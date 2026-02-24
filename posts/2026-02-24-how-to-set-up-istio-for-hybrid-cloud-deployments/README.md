# How to Set Up Istio for Hybrid Cloud Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Hybrid Cloud, Kubernetes, Multicluster, Service Mesh

Description: A step-by-step guide for setting up Istio across hybrid cloud environments spanning on-premises data centers and public cloud providers.

---

Hybrid cloud is the reality for most enterprises. You have some workloads running on-premises, some in AWS, some in GCP, and the challenge is making them all work together seamlessly. Istio can bridge these environments with a unified service mesh, giving you consistent traffic management, security, and observability regardless of where a workload runs.

The key to making this work is understanding that hybrid cloud is really just a variation of Istio's multicluster on different networks. The clusters cannot route pod traffic directly to each other (your on-prem cluster cannot reach pod IPs in AWS), so you use east-west gateways to bridge the gap.

## Planning Your Hybrid Mesh

Before touching any configuration, you need to answer a few questions:

**Network connectivity**: Can the clusters reach each other at all? You typically need either VPN tunnels, direct connect links, or public internet connectivity between environments. The east-west gateways need to be reachable from the other environment.

**Control plane placement**: Where does Istiod run? You can go multi-primary (one Istiod per cluster) or single-primary (Istiod in one cluster, remote profiles in others). For hybrid cloud, multi-primary is usually the safer bet because each environment stays operational even if the connection between environments goes down.

**Certificate authority**: All clusters need to share a root CA. You can use Istio's self-signed CA for testing, but production deployments should use a proper PKI.

## Step 1: Set Up Network Connectivity

Ensure your environments can reach each other. The minimum requirement is that the east-west gateway LoadBalancer IPs are reachable from all environments.

If you are using AWS and on-prem:

```bash
# On-prem: Verify connectivity to AWS east-west gateway
curl -v https://<aws-eastwest-gateway-ip>:15443

# AWS: Verify connectivity to on-prem east-west gateway
curl -v https://<onprem-eastwest-gateway-ip>:15443
```

## Step 2: Generate Shared Certificates

```bash
mkdir -p certs && cd certs

# Root CA (store this securely - it is the root of trust for your entire mesh)
make -f ../tools/certs/Makefile.selfsigned.mk root-ca

# Per-environment intermediate CAs
make -f ../tools/certs/Makefile.selfsigned.mk onprem-cacerts
make -f ../tools/certs/Makefile.selfsigned.mk aws-cacerts
```

Distribute the certificates:

```bash
# On-prem cluster
kubectl create namespace istio-system --context="${CTX_ONPREM}"
kubectl create secret generic cacerts -n istio-system --context="${CTX_ONPREM}" \
  --from-file=onprem/ca-cert.pem \
  --from-file=onprem/ca-key.pem \
  --from-file=onprem/root-cert.pem \
  --from-file=onprem/cert-chain.pem

# AWS cluster
kubectl create namespace istio-system --context="${CTX_AWS}"
kubectl create secret generic cacerts -n istio-system --context="${CTX_AWS}" \
  --from-file=aws/ca-cert.pem \
  --from-file=aws/ca-key.pem \
  --from-file=aws/root-cert.pem \
  --from-file=aws/cert-chain.pem
```

## Step 3: Label Networks

Since the environments are on different networks:

```bash
kubectl label namespace istio-system topology.istio.io/network=onprem --context="${CTX_ONPREM}"
kubectl label namespace istio-system topology.istio.io/network=aws --context="${CTX_AWS}"
```

## Step 4: Install Istio on On-Premises Cluster

```yaml
# onprem-istio.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  values:
    global:
      meshID: hybrid-mesh
      multiCluster:
        clusterName: onprem
      network: onprem
```

```bash
istioctl install --context="${CTX_ONPREM}" -f onprem-istio.yaml
```

Install the east-west gateway:

```bash
samples/multicluster/gen-eastwest-gateway.sh --network onprem | \
  istioctl install --context="${CTX_ONPREM}" -f -

kubectl apply -n istio-system -f samples/multicluster/expose-services.yaml --context="${CTX_ONPREM}"
```

For on-prem, the east-west gateway needs a way to get an external IP. If you do not have a cloud load balancer, use NodePort or MetalLB:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
      - name: istio-eastwestgateway
        enabled: true
        k8s:
          service:
            type: NodePort
            ports:
              - name: tls
                port: 15443
                nodePort: 32443
```

## Step 5: Install Istio on AWS Cluster

```yaml
# aws-istio.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  values:
    global:
      meshID: hybrid-mesh
      multiCluster:
        clusterName: aws
      network: aws
```

```bash
istioctl install --context="${CTX_AWS}" -f aws-istio.yaml

samples/multicluster/gen-eastwest-gateway.sh --network aws | \
  istioctl install --context="${CTX_AWS}" -f -

kubectl apply -n istio-system -f samples/multicluster/expose-services.yaml --context="${CTX_AWS}"
```

## Step 6: Exchange Remote Secrets

```bash
istioctl create-remote-secret --context="${CTX_ONPREM}" --name=onprem | \
  kubectl apply -f - --context="${CTX_AWS}"

istioctl create-remote-secret --context="${CTX_AWS}" --name=aws | \
  kubectl apply -f - --context="${CTX_ONPREM}"
```

For hybrid cloud, the API server of each cluster must be reachable from the other. If the on-prem API server is behind a firewall, you need to expose it (typically through a VPN or a bastion).

## Step 7: Configure Locality-Based Routing

In hybrid cloud, you probably want traffic to prefer local endpoints. Configure locality load balancing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: prefer-local
  namespace: default
spec:
  host: "*.default.svc.cluster.local"
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
          - from: us-east-1
            to: onprem
```

This configuration prefers local endpoints but fails over to the other environment when local endpoints are unhealthy.

## Step 8: Verify Cross-Environment Communication

Deploy test services and verify that traffic flows between environments:

```bash
# Deploy on both environments
for ctx in "${CTX_ONPREM}" "${CTX_AWS}"; do
  kubectl create namespace sample --context="${ctx}"
  kubectl label namespace sample istio-injection=enabled --context="${ctx}"
done

# Different versions on each environment
kubectl apply -f samples/helloworld/helloworld.yaml -l version=v1 -n sample --context="${CTX_ONPREM}"
kubectl apply -f samples/helloworld/helloworld.yaml -l service=helloworld -n sample --context="${CTX_ONPREM}"

kubectl apply -f samples/helloworld/helloworld.yaml -l version=v2 -n sample --context="${CTX_AWS}"
kubectl apply -f samples/helloworld/helloworld.yaml -l service=helloworld -n sample --context="${CTX_AWS}"

kubectl apply -f samples/sleep/sleep.yaml -n sample --context="${CTX_ONPREM}"
```

Test it:

```bash
SLEEP_POD=$(kubectl get pod -n sample -l app=sleep --context="${CTX_ONPREM}" -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n sample -c sleep "${SLEEP_POD}" --context="${CTX_ONPREM}" -- curl -sS helloworld.sample:5000/hello
```

## Operational Tips for Hybrid Cloud

**Monitor cross-environment latency**: Use Istio's telemetry to track request durations between environments. Set up alerts when latency exceeds acceptable thresholds.

**Plan for disconnection**: If the link between environments goes down, each environment should continue to function independently. Multi-primary ensures this - each Istiod has a complete configuration and can serve its local sidecars without the remote cluster.

**Upgrade coordination**: Plan Istio upgrades to happen within a maintenance window for both environments. Version skew between control planes is supported (N-1 to N+1), but keeping them in sync is simpler to reason about.

Hybrid cloud with Istio is not a weekend project. But once set up, it gives you a powerful foundation for running services across any combination of environments with consistent networking, security, and visibility.
