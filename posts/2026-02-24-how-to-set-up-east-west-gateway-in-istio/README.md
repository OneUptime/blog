# How to Set Up East-West Gateway in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, East-West Gateway, Multi-Cluster, Networking, Service Mesh

Description: Complete guide to deploying and configuring the Istio east-west gateway for cross-cluster communication in multi-network mesh deployments.

---

The east-west gateway is a special Istio gateway that handles traffic between clusters when pods cannot directly communicate across network boundaries. It sits at the edge of each cluster and uses SNI-based routing to forward mTLS traffic to the correct destination workload. If you are running a multi-cluster Istio mesh across different networks, VPCs, or cloud providers, you need this gateway.

## What the East-West Gateway Does

In a multi-network Istio mesh, pods in cluster1 cannot reach pods in cluster2 by their internal IP addresses. The east-west gateway solves this by acting as a bridge. Here is the flow:

1. A sidecar in cluster1 wants to reach `reviews.default` which has endpoints in cluster2
2. Istio knows those endpoints are on a different network (because of the `topology.istio.io/network` label)
3. Instead of the actual pod IP, the sidecar gets the east-west gateway IP of cluster2
4. The sidecar sends the request to cluster2's east-west gateway on port 15443 using mTLS with SNI
5. The east-west gateway reads the SNI header to determine the destination service
6. It forwards the request to the actual pod inside cluster2

The SNI header format is `outbound_.<port>_.<subset>_.<hostname>`, which gives the gateway all the information it needs to route correctly.

## Deploying the East-West Gateway

Istio provides a script that generates the IstioOperator configuration for the east-west gateway. You typically run this after installing the main Istio control plane.

### Generate and Install

```bash
# For cluster1 on network1
samples/multicluster/gen-eastwest-gateway.sh \
  --network network1 | \
  istioctl install --context="${CTX_CLUSTER1}" -y -f -
```

If you want to see what this generates before applying it:

```bash
samples/multicluster/gen-eastwest-gateway.sh --network network1
```

The output looks like this:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: eastwest
spec:
  revision: ""
  profile: empty
  components:
    ingressGateways:
    - name: istio-eastwestgateway
      label:
        istio: eastwestgateway
        app: istio-eastwestgateway
        topology.istio.io/network: network1
      enabled: true
      k8s:
        env:
        - name: ISTIO_META_REQUESTED_NETWORK_VIEW
          value: network1
        service:
          ports:
          - name: status-port
            port: 15021
            targetPort: 15021
          - name: tls
            port: 15443
            targetPort: 15443
          - name: tls-istiod
            port: 15012
            targetPort: 15012
          - name: tls-webhook
            port: 15017
            targetPort: 15017
  values:
    gateways:
      istio-ingressgateway:
        injectionTemplate: gateway
    global:
      network: network1
```

Key things to note:

- It uses the `empty` profile, so it only deploys the gateway without touching the existing Istiod
- The `ISTIO_META_REQUESTED_NETWORK_VIEW` environment variable tells the gateway which network it serves
- Port 15443 is the main data plane port for cross-cluster mTLS traffic
- Ports 15012 and 15017 are for control plane traffic (used in primary-remote setups)

### Wait for External IP

The east-west gateway needs a LoadBalancer IP or hostname:

```bash
kubectl get svc istio-eastwestgateway -n istio-system --context="${CTX_CLUSTER1}" -w
```

On cloud providers, this usually takes 30-60 seconds. On bare metal, you need MetalLB or a similar solution.

## Exposing Services Through the Gateway

Just deploying the gateway is not enough. You need to tell Istio which services should be accessible through it. Apply the expose-services configuration:

```bash
kubectl apply -n istio-system -f samples/multicluster/expose-services.yaml --context="${CTX_CLUSTER1}"
```

This creates a Gateway resource:

```yaml
apiVersion: networking.istio.io/v1beta1
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

The `AUTO_PASSTHROUGH` TLS mode is critical. It means the gateway does not terminate TLS. Instead, it inspects the SNI header and forwards the connection as-is to the destination. This preserves the end-to-end mTLS between sidecars.

## Exposing Istiod (Primary-Remote Setups)

If you are running a primary-remote configuration, the remote cluster's sidecars need to reach the primary's Istiod through the east-west gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: istiod-gateway
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
  - port:
      number: 15012
      name: tls-istiod
      protocol: TLS
    tls:
      mode: PASSTHROUGH
    hosts:
    - "*"
  - port:
      number: 15017
      name: tls-istiodwebhook
      protocol: TLS
    tls:
      mode: PASSTHROUGH
    hosts:
    - "*"
```

Apply this to the primary cluster:

```bash
kubectl apply -f expose-istiod.yaml -n istio-system --context="${CTX_CLUSTER1}"
```

## Scaling and High Availability

The east-west gateway is a critical path for all cross-cluster traffic. Treat it like you would treat any production load balancer:

```bash
# Scale to multiple replicas
kubectl scale deployment istio-eastwestgateway -n istio-system --replicas=3 --context="${CTX_CLUSTER1}"
```

Set up a PodDisruptionBudget:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istio-eastwestgateway
  namespace: istio-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: istio-eastwestgateway
```

Set resource requests and limits:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: eastwest
spec:
  components:
    ingressGateways:
    - name: istio-eastwestgateway
      enabled: true
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 256Mi
          limits:
            cpu: 2000m
            memory: 1Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
          metrics:
          - type: Resource
            resource:
              name: cpu
              target:
                type: Utilization
                averageUtilization: 80
```

## Monitoring the East-West Gateway

Check gateway health:

```bash
# Pod status
kubectl get pods -n istio-system -l app=istio-eastwestgateway --context="${CTX_CLUSTER1}"

# Gateway listeners
istioctl proxy-config listeners deployment/istio-eastwestgateway -n istio-system --context="${CTX_CLUSTER1}"

# Active connections
istioctl proxy-config clusters deployment/istio-eastwestgateway -n istio-system --context="${CTX_CLUSTER1}"
```

Monitor gateway metrics in Prometheus:

```
# Throughput through the east-west gateway
sum(rate(istio_requests_total{destination_workload="istio-eastwestgateway"}[5m]))

# Connection errors
sum(rate(envoy_cluster_upstream_cx_connect_fail{pod=~"istio-eastwestgateway.*"}[5m]))
```

## Troubleshooting

**Gateway has no external IP**: Check if your cluster supports LoadBalancer services. On bare metal, you need MetalLB or similar.

**Traffic not flowing through gateway**: Verify the `cross-network-gateway` Gateway resource exists and the `AUTO_PASSTHROUGH` mode is set. Also check that the network labels on `istio-system` namespace match the gateway's network configuration.

**SNI routing failures**: The east-west gateway relies on the SNI header. If clients connect without SNI (plaintext), the gateway cannot route. Make sure mTLS is enabled between sidecars.

```bash
# Check gateway access logs
kubectl logs -n istio-system -l app=istio-eastwestgateway --context="${CTX_CLUSTER1}" --tail=50
```

## Summary

The east-west gateway is the bridge between clusters in multi-network Istio deployments. It uses SNI-based routing with AUTO_PASSTHROUGH to forward mTLS connections without terminating them. Deploy it after installing Istiod, expose services through it with the appropriate Gateway resource, and scale it for production. It is a straightforward component, but since all cross-cluster traffic flows through it, treat it as critical infrastructure.
