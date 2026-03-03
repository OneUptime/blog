# How to Configure Service Discovery for Hybrid Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Hybrid Cloud, Service Discovery, Kubernetes, Multi-Environment

Description: Set up Istio service discovery across hybrid environments spanning Kubernetes clusters, VMs, and on-premise infrastructure.

---

Most organizations don't run everything in a single Kubernetes cluster. You might have services split across Kubernetes and VMs, on-premise data centers and cloud providers, or multiple clouds. Making service discovery work seamlessly across these different environments is one of the harder problems in infrastructure, and it's something Istio is specifically designed to help with.

## The Hybrid Challenge

In a pure Kubernetes environment, service discovery is straightforward. Kubernetes Services and DNS handle it. But in a hybrid environment, you're dealing with:

- Kubernetes services that need to call VM-based databases
- VM services that need to reach Kubernetes microservices
- On-premise systems that need to connect to cloud-hosted services
- Multiple Kubernetes clusters in different clouds

Each environment has its own networking model, DNS system, and service registry. Istio provides a unified service mesh that spans all of these.

## Architecture Overview

A hybrid Istio setup typically looks like this:

- One or more Kubernetes clusters running Istio with sidecar injection
- VMs running the Istio agent and Envoy proxy
- ServiceEntry resources representing external and on-premise services
- East-west gateways for cross-network communication
- A shared root CA for mTLS across all environments

## Step 1: Establish a Common Trust Domain

All services in the mesh need to trust each other's mTLS certificates. Generate a shared root CA:

```bash
# Create root CA
openssl req -new -newkey rsa:4096 -x509 -sha256 \
  -days 3650 -nodes -out root-cert.pem -keyout root-key.pem \
  -subj "/O=MyOrg/CN=Root CA"
```

Create intermediate CAs for each environment:

```bash
# Kubernetes cluster CA
openssl req -new -newkey rsa:4096 -nodes \
  -out k8s-ca-cert.csr -keyout k8s-ca-key.pem \
  -subj "/O=MyOrg/CN=K8s Intermediate CA"

openssl x509 -req -days 730 -CA root-cert.pem -CAkey root-key.pem \
  -CAcreateserial -in k8s-ca-cert.csr -out k8s-ca-cert.pem

# VM environment CA
openssl req -new -newkey rsa:4096 -nodes \
  -out vm-ca-cert.csr -keyout vm-ca-key.pem \
  -subj "/O=MyOrg/CN=VM Intermediate CA"

openssl x509 -req -days 730 -CA root-cert.pem -CAkey root-key.pem \
  -CAcreateserial -in vm-ca-cert.csr -out vm-ca-cert.pem
```

Install the CA certificates in your Kubernetes cluster:

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=k8s-ca-cert.pem \
  --from-file=ca-key.pem=k8s-ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=k8s-cert-chain.pem
```

## Step 2: Configure Kubernetes Services

Install Istio on your Kubernetes cluster with support for external workloads:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: hybrid-mesh
      multiCluster:
        clusterName: k8s-primary
      network: kubernetes-network
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  components:
    egressGateways:
    - name: istio-egressgateway
      enabled: true
```

Your Kubernetes services are automatically discovered. No extra configuration needed for those.

## Step 3: Register VM Services

For VMs running application services, use WorkloadGroup and WorkloadEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: WorkloadGroup
metadata:
  name: legacy-billing
  namespace: backend
spec:
  metadata:
    labels:
      app: legacy-billing
      environment: on-prem
  template:
    serviceAccount: legacy-billing
    network: on-prem-network
  probe:
    httpGet:
      path: /health
      port: 8080
    periodSeconds: 10
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-billing
  namespace: backend
spec:
  ports:
  - port: 8080
    name: http
  selector:
    app: legacy-billing
```

Register each VM:

```yaml
apiVersion: networking.istio.io/v1
kind: WorkloadEntry
metadata:
  name: billing-vm-1
  namespace: backend
spec:
  address: 10.100.50.10
  labels:
    app: legacy-billing
    environment: on-prem
  serviceAccount: legacy-billing
  network: on-prem-network
---
apiVersion: networking.istio.io/v1
kind: WorkloadEntry
metadata:
  name: billing-vm-2
  namespace: backend
spec:
  address: 10.100.50.11
  labels:
    app: legacy-billing
    environment: on-prem
  serviceAccount: legacy-billing
  network: on-prem-network
```

## Step 4: Register On-Premise Services Without Sidecars

Some on-premise services can't run an Istio sidecar (legacy systems, appliances, third-party software). Use ServiceEntry to register them:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: on-prem-database
  namespace: backend
spec:
  hosts:
  - "mainframe-db.on-prem"
  location: MESH_EXTERNAL
  ports:
  - number: 1521
    name: oracle
    protocol: TCP
  resolution: STATIC
  endpoints:
  - address: 10.100.10.50
    labels:
      environment: on-prem
```

For services that have DNS names in your corporate DNS:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: erp-system
  namespace: backend
spec:
  hosts:
  - "erp.internal.company.com"
  location: MESH_EXTERNAL
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
```

## Step 5: Set Up Cross-Network Communication

If your Kubernetes cluster and VMs are on different networks (which they usually are in hybrid setups), you need an east-west gateway:

```bash
# Install the east-west gateway
samples/multicluster/gen-eastwest-gateway.sh --network kubernetes-network | \
  istioctl install -y -f -
```

Expose mesh services through the gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: cross-network-gateway
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
  - port:
      number: 15443
      name: tls
      protocol: TLS
    tls:
      mode: AUTO_PASSTHROUGH
    hosts:
    - "*.local"
```

## Step 6: Traffic Management Across Environments

Apply traffic policies that work across your hybrid environment. For example, route reads to the on-prem database and writes to the cloud database:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: hybrid-database
  namespace: backend
spec:
  host: database-service.backend.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 5s
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

Use VirtualService to handle failover between environments:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: billing-routing
  namespace: backend
spec:
  hosts:
  - legacy-billing.backend.svc.cluster.local
  http:
  - route:
    - destination:
        host: legacy-billing.backend.svc.cluster.local
    timeout: 10s
    retries:
      attempts: 3
      perTryTimeout: 3s
      retryOn: "5xx,connect-failure"
```

## Step 7: Monitoring Hybrid Service Discovery

Track the health of service discovery across all environments:

```bash
# Check all registered services including VMs and ServiceEntries
kubectl exec deploy/istiod -n istio-system -- curl -s localhost:15014/debug/registryz | python3 -m json.tool | grep hostname
```

Monitor VM connectivity:

```bash
kubectl get workloadentry -A -o wide
```

Check for unhealthy endpoints:

```text
sum(rate(istio_requests_total{response_code="503",reporter="source"}[5m])) by (destination_workload, destination_workload_namespace)
```

High 503 rates to specific services might indicate connectivity issues between environments.

## Handling Network Partitions

In hybrid environments, network partitions between environments are more likely than in a single cluster. Plan for them:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: resilient-service
  namespace: backend
spec:
  host: critical-service.backend.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutiveGatewayErrors: 2
      interval: 5s
      baseEjectionTime: 30s
    connectionPool:
      tcp:
        connectTimeout: 3s
      http:
        maxRetries: 3
```

If the on-prem network goes down, endpoints in that environment get ejected and traffic flows to healthy endpoints in other environments.

## Security Across Environments

Make sure your authorization policies cover the hybrid topology:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: billing-access
  namespace: backend
spec:
  selector:
    matchLabels:
      app: legacy-billing
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/backend/sa/order-service"
        - "cluster.local/ns/backend/sa/invoice-service"
```

This policy works regardless of whether the caller is in Kubernetes or on a VM, because it uses the SPIFFE identity from the mTLS certificate, not the network location.

Hybrid service discovery with Istio requires more setup than a single-cluster deployment, but the result is a unified mesh where services can find and communicate with each other regardless of where they're running. The key is getting the trust domain right, registering all your services (whether they're in Kubernetes, VMs, or on-premise), and setting up proper cross-network connectivity.
