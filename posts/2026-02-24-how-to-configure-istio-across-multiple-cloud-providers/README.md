# How to Configure Istio Across Multiple Cloud Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cloud, Multi-Cluster, Kubernetes, Service Mesh

Description: How to deploy and configure Istio service mesh spanning multiple cloud providers for resilient and portable multi-cloud architectures.

---

Running Istio across multiple cloud providers is the ultimate test of service mesh portability. You might have workloads on AWS and GCP, or AKS and EKS, or any combination. The goal is a single mesh where services on one cloud can securely communicate with services on another, with consistent traffic management and security policies everywhere. It takes some work to set up, but it is entirely doable.

## Why Multi-Cloud Istio?

There are several real reasons teams go multi-cloud:

- Avoiding vendor lock-in by distributing workloads
- Taking advantage of specific services on different clouds (GCP for ML, AWS for databases)
- Geographic distribution where one cloud provider does not cover all needed regions
- Business continuity and disaster recovery across providers
- Regulatory requirements that mandate data residency in specific jurisdictions

## Architecture

The architecture for multi-cloud Istio follows the multi-primary or primary-remote model:

- Each cloud has its own Kubernetes cluster
- All clusters share the same root CA for mutual trust
- All clusters use the same trust domain
- East-west gateways handle cross-cloud traffic since pod networks are not directly routable
- Each cluster has its own Istio control plane (multi-primary) or uses a remote profile

Multi-primary is recommended for multi-cloud because each control plane can operate independently if cross-cloud connectivity is lost.

## Setting Up the Clusters

Create clusters on each cloud provider:

```bash
# AWS EKS
eksctl create cluster \
  --name mesh-aws \
  --region us-east-1 \
  --node-type m5.xlarge \
  --nodes 3

# GCP GKE
gcloud container clusters create mesh-gcp \
  --zone us-central1-a \
  --machine-type e2-standard-4 \
  --num-nodes 3 \
  --enable-ip-alias
```

Set up kubectl contexts:

```bash
# Rename contexts for clarity
kubectl config rename-context <aws-context> aws
kubectl config rename-context <gcp-context> gcp
```

## Establishing Cross-Cloud Network Connectivity

The clusters need to be able to reach each other's east-west gateways. The east-west gateways expose a public or private IP, so you need connectivity between those IPs.

Options include:

- Public internet (east-west gateways with public IPs, encrypted via mTLS)
- VPN tunnels between cloud VPCs
- Dedicated interconnects

For many teams, using public IPs on the east-west gateways is the simplest approach. Since all traffic is mTLS-encrypted, it is secure even over the public internet. You just need to make sure firewall rules allow port 15443 between the clusters.

## Creating the Shared Root CA

Generate a root CA and per-cluster intermediate CAs:

```bash
# Root CA
openssl req -new -newkey rsa:4096 -x509 -sha256 \
  -days 3650 -nodes \
  -out certs/root-cert.pem \
  -keyout certs/root-key.pem \
  -subj "/O=MyCompany/CN=Root CA"

# AWS cluster intermediate CA
openssl req -new -newkey rsa:4096 -nodes \
  -out certs/aws-ca-cert.csr \
  -keyout certs/aws-ca-key.pem \
  -subj "/O=MyCompany/CN=AWS Intermediate CA"

openssl x509 -req -sha256 -days 1825 \
  -CA certs/root-cert.pem -CAkey certs/root-key.pem -CAcreateserial \
  -in certs/aws-ca-cert.csr -out certs/aws-ca-cert.pem \
  -extfile <(printf "basicConstraints=CA:TRUE\nkeyUsage=critical,digitalSignature,keyCertSign")

cat certs/aws-ca-cert.pem certs/root-cert.pem > certs/aws-cert-chain.pem

# GCP cluster intermediate CA
openssl req -new -newkey rsa:4096 -nodes \
  -out certs/gcp-ca-cert.csr \
  -keyout certs/gcp-ca-key.pem \
  -subj "/O=MyCompany/CN=GCP Intermediate CA"

openssl x509 -req -sha256 -days 1825 \
  -CA certs/root-cert.pem -CAkey certs/root-key.pem -CAcreateserial \
  -in certs/gcp-ca-cert.csr -out certs/gcp-ca-cert.pem \
  -extfile <(printf "basicConstraints=CA:TRUE\nkeyUsage=critical,digitalSignature,keyCertSign")

cat certs/gcp-ca-cert.pem certs/root-cert.pem > certs/gcp-cert-chain.pem
```

Install the CA secrets:

```bash
# AWS cluster
kubectl --context=aws create namespace istio-system
kubectl --context=aws create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=certs/aws-ca-cert.pem \
  --from-file=ca-key.pem=certs/aws-ca-key.pem \
  --from-file=root-cert.pem=certs/root-cert.pem \
  --from-file=cert-chain.pem=certs/aws-cert-chain.pem

# GCP cluster
kubectl --context=gcp create namespace istio-system
kubectl --context=gcp create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=certs/gcp-ca-cert.pem \
  --from-file=ca-key.pem=certs/gcp-ca-key.pem \
  --from-file=root-cert.pem=certs/root-cert.pem \
  --from-file=cert-chain.pem=certs/gcp-cert-chain.pem
```

## Installing Istio on Both Clusters

Both clusters run as primaries with the same mesh ID and trust domain:

```yaml
# aws-istio.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: mycompany.com
  values:
    global:
      meshID: multi-cloud-mesh
      multiCluster:
        clusterName: aws-cluster
      network: aws-network
```

```yaml
# gcp-istio.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    trustDomain: mycompany.com
  values:
    global:
      meshID: multi-cloud-mesh
      multiCluster:
        clusterName: gcp-cluster
      network: gcp-network
```

```bash
istioctl install --context=aws -f aws-istio.yaml -y
istioctl install --context=gcp -f gcp-istio.yaml -y
```

## Setting Up East-West Gateways

Deploy east-west gateways on both clusters:

```bash
# AWS cluster
samples/multicluster/gen-eastwest-gateway.sh \
  --mesh multi-cloud-mesh --cluster aws-cluster --network aws-network | \
  istioctl --context=aws install -y -f -

kubectl --context=aws apply -n istio-system -f samples/multicluster/expose-services.yaml

# GCP cluster
samples/multicluster/gen-eastwest-gateway.sh \
  --mesh multi-cloud-mesh --cluster gcp-cluster --network gcp-network | \
  istioctl --context=gcp install -y -f -

kubectl --context=gcp apply -n istio-system -f samples/multicluster/expose-services.yaml
```

Verify the east-west gateways have external IPs:

```bash
kubectl --context=aws get svc istio-eastwestgateway -n istio-system
kubectl --context=gcp get svc istio-eastwestgateway -n istio-system
```

## Cross-Cluster Service Discovery

Create remote secrets so each cluster can discover services in the other:

```bash
istioctl create-remote-secret --context=gcp --name=gcp-cluster | \
  kubectl apply --context=aws -f -

istioctl create-remote-secret --context=aws --name=aws-cluster | \
  kubectl apply --context=gcp -f -
```

## Testing Cross-Cloud Communication

Deploy test workloads:

```bash
# Deploy httpbin on AWS
kubectl --context=aws create namespace sample
kubectl --context=aws label namespace sample istio-injection=enabled
kubectl --context=aws apply -n sample -f samples/httpbin/httpbin.yaml

# Deploy sleep on GCP
kubectl --context=gcp create namespace sample
kubectl --context=gcp label namespace sample istio-injection=enabled
kubectl --context=gcp apply -n sample -f samples/sleep/sleep.yaml
```

Test the connection from GCP to AWS:

```bash
kubectl --context=gcp exec -n sample deploy/sleep -- \
  curl -s httpbin.sample.svc.cluster.local:8000/headers
```

If everything is set up correctly, the request goes from the GCP cluster through the east-west gateway to the AWS cluster, all encrypted with mTLS.

## Traffic Management Across Clouds

Use locality-based routing to prefer local services while falling back to the other cloud:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin
  namespace: sample
spec:
  host: httpbin.sample.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
        - from: us-east-1
          to: us-central1
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

This keeps traffic local to the cloud where the caller is running, but automatically fails over to the other cloud if the local service is unhealthy.

## Security Policies Across Clouds

Authorization policies work consistently across both clouds:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: httpbin-policy
  namespace: sample
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "mycompany.com/ns/sample/sa/sleep"
```

This policy is applied on the AWS cluster but accepts requests from the sleep service on the GCP cluster because they share the same trust domain and root CA.

## Monitoring Multi-Cloud

Centralize observability by federating Prometheus instances or using a centralized monitoring solution:

```yaml
# prometheus-federation.yaml on the central cluster
- job_name: 'aws-istio'
  honor_labels: true
  metrics_path: '/federate'
  params:
    'match[]':
    - '{job="istio-mesh"}'
  static_configs:
  - targets:
    - 'prometheus-aws.monitoring.svc.cluster.local:9090'
```

Multi-cloud Istio is not trivial to set up, but once the foundation is in place - shared root CA, matching trust domains, east-west gateways, cross-cluster discovery - it works remarkably well. Services communicate across cloud providers as if they were in the same cluster, with full mTLS encryption and consistent policy enforcement.
