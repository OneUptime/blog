# How to Configure Multi-Cluster Ingress with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ingress, Multi-Cluster, Kubernetes, Traffic Management

Description: How to set up ingress gateways across multiple clusters in an Istio mesh with global load balancing, failover, and consistent routing rules.

---

In a multi-cluster Istio deployment, external traffic needs to enter the mesh through ingress gateways. The question is: do you have an ingress gateway in every cluster, or just one? And how do you distribute external traffic across them?

This post covers the common patterns for multi-cluster ingress: per-cluster ingress with DNS-based routing, a global load balancer in front of multiple ingress gateways, and single-cluster ingress with cross-cluster routing.

## Pattern 1: Per-Cluster Ingress with DNS Routing

The most common approach is to deploy an Istio ingress gateway in every cluster and use DNS to route users to the nearest or healthiest cluster.

### Deploy Ingress Gateways

Each cluster gets its own ingress gateway:

```bash
# Cluster 1
istioctl install --context="${CTX_CLUSTER1}" -f - <<EOF
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster1
      network: network1
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        serviceAnnotations:
          service.beta.kubernetes.io/aws-load-balancer-type: nlb
EOF
```

Repeat for cluster2 (with different clusterName and network values).

### Configure Gateway and VirtualService

Apply identical Gateway and VirtualService resources to both clusters:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: app-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: app-tls-cert
    hosts:
    - "app.example.com"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-routes
  namespace: default
spec:
  hosts:
  - "app.example.com"
  gateways:
  - istio-system/app-gateway
  http:
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: api-server.default.svc.cluster.local
        port:
          number: 8080
  - route:
    - destination:
        host: frontend.default.svc.cluster.local
        port:
          number: 80
```

Apply to both clusters:

```bash
kubectl apply -f gateway.yaml --context="${CTX_CLUSTER1}"
kubectl apply -f gateway.yaml --context="${CTX_CLUSTER2}"
```

### Set Up DNS-Based Routing

Use a DNS provider with health checking to route traffic to the nearest healthy cluster:

**Route53 weighted routing:**

```bash
# Get ingress IPs
CLUSTER1_IP=$(kubectl get svc istio-ingressgateway -n istio-system --context="${CTX_CLUSTER1}" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
CLUSTER2_IP=$(kubectl get svc istio-ingressgateway -n istio-system --context="${CTX_CLUSTER2}" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Create Route53 records with health checks
aws route53 change-resource-record-sets --hosted-zone-id Z123456 --change-batch '{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "cluster1",
        "Weight": 50,
        "TTL": 60,
        "ResourceRecords": [{"Value": "'${CLUSTER1_IP}'"}],
        "HealthCheckId": "health-check-cluster1"
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "cluster2",
        "Weight": 50,
        "TTL": 60,
        "ResourceRecords": [{"Value": "'${CLUSTER2_IP}'"}],
        "HealthCheckId": "health-check-cluster2"
      }
    }
  ]
}'
```

**Cloudflare load balancing:**

Configure a Cloudflare load balancer with two origin pools, each pointing to a cluster's ingress gateway IP. Enable health checks for automatic failover.

## Pattern 2: Global Load Balancer

For more control over traffic distribution, put a global load balancer in front of the ingress gateways:

### GCP Global HTTP(S) Load Balancer

```bash
# Create health check
gcloud compute health-checks create http istio-health \
  --port=15021 \
  --request-path=/healthz/ready

# Create backend service
gcloud compute backend-services create istio-backend \
  --global \
  --health-checks=istio-health \
  --protocol=HTTP

# Add both clusters as NEGs or instance groups
gcloud compute backend-services add-backend istio-backend \
  --global \
  --network-endpoint-group=cluster1-neg \
  --network-endpoint-group-zone=us-east1-b

gcloud compute backend-services add-backend istio-backend \
  --global \
  --network-endpoint-group=cluster2-neg \
  --network-endpoint-group-zone=us-west1-a
```

### AWS Global Accelerator

```bash
aws globalaccelerator create-accelerator \
  --name istio-mesh-accelerator \
  --ip-address-type IPV4

aws globalaccelerator create-listener \
  --accelerator-arn arn:aws:globalaccelerator::123456:accelerator/abc \
  --port-ranges FromPort=443,ToPort=443 \
  --protocol TCP

# Add endpoint groups for each region/cluster
aws globalaccelerator create-endpoint-group \
  --listener-arn arn:aws:globalaccelerator::123456:listener/abc/def \
  --endpoint-group-region us-east-1 \
  --endpoint-configurations EndpointId=${CLUSTER1_NLB_ARN},Weight=50

aws globalaccelerator create-endpoint-group \
  --listener-arn arn:aws:globalaccelerator::123456:listener/abc/def \
  --endpoint-group-region us-west-2 \
  --endpoint-configurations EndpointId=${CLUSTER2_NLB_ARN},Weight=50
```

## Pattern 3: Single Ingress with Cross-Cluster Routing

You can run the ingress gateway in only one cluster and let Istio route to services in other clusters:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-routes
  namespace: default
spec:
  hosts:
  - "app.example.com"
  gateways:
  - istio-system/app-gateway
  http:
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: api-server.default.svc.cluster.local
        port:
          number: 8080
```

Even though the ingress gateway is in cluster1, if `api-server` has endpoints in cluster2, Istio will route some traffic there. This works because the ingress gateway sidecar has the merged endpoint list from all clusters.

The downside is that the single ingress gateway is a single point of failure for all external traffic.

## TLS Certificate Management

For multi-cluster ingress, you need the same TLS certificate available in every cluster that runs an ingress gateway:

```bash
# Create the TLS secret in both clusters
kubectl create secret tls app-tls-cert -n istio-system \
  --cert=app.example.com.crt \
  --key=app.example.com.key \
  --context="${CTX_CLUSTER1}"

kubectl create secret tls app-tls-cert -n istio-system \
  --cert=app.example.com.crt \
  --key=app.example.com.key \
  --context="${CTX_CLUSTER2}"
```

For automatic certificate management, use cert-manager with a DNS01 challenge solver:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-tls-cert
  namespace: istio-system
spec:
  secretName: app-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - app.example.com
```

Deploy this in each cluster, and cert-manager will issue and renew the certificate automatically.

## Consistent Configuration

The biggest operational challenge with multi-cluster ingress is keeping Gateway and VirtualService resources consistent across clusters. If you update a route in cluster1 but forget cluster2, you get inconsistent behavior depending on which ingress the user hits.

Use GitOps to deploy ingress configuration to all clusters simultaneously:

```bash
# Structure
ingress-config/
  gateway.yaml
  virtualservice-app.yaml
  virtualservice-api.yaml
```

Any change goes through Git, gets reviewed, and gets applied to all clusters atomically.

## Health Checking the Ingress Gateway

Istio's ingress gateway exposes a health endpoint on port 15021:

```bash
curl http://${INGRESS_IP}:15021/healthz/ready
```

Use this for your DNS health checks or global load balancer health checks. When the ingress gateway is healthy, it returns 200. When it is not ready, it returns 503.

## Summary

Multi-cluster ingress with Istio typically uses per-cluster ingress gateways with DNS or a global load balancer for traffic distribution. Keep your Gateway and VirtualService configurations consistent across clusters using GitOps. For TLS, either distribute certificates manually or use cert-manager in each cluster. The choice between DNS routing, global load balancer, or single ingress depends on your failover requirements and how much control you need over traffic distribution.
