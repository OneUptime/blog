# How to Configure Shared Control Plane in Multi-Cluster Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Control Plane, Kubernetes, Service Mesh

Description: How to set up a multi-cluster Istio mesh with a single shared control plane serving multiple Kubernetes clusters.

---

In a shared control plane model, one cluster runs the Istio control plane (istiod), and the other clusters connect to it as remote clusters. This is sometimes called a "primary-remote" setup. The advantage is less operational overhead since you only manage one control plane. The downside is that if the primary cluster goes down, the remote clusters lose their control plane.

## Architecture Overview

Here's what the setup looks like:

- **Primary cluster**: Runs istiod, the Istio control plane
- **Remote cluster(s)**: Run only the sidecar proxies, which connect back to istiod in the primary cluster

The remote cluster's sidecars get their configuration from the primary cluster's istiod. Service discovery works because the primary's istiod watches both the local Kubernetes API and the remote cluster's API (via remote secrets).

## Prerequisites

- Two Kubernetes clusters
- Network connectivity from remote cluster pods to the primary cluster's istiod (port 15012)
- istioctl 1.20+
- kubectl contexts configured

```bash
export CTX_PRIMARY=primary
export CTX_REMOTE=remote

kubectl --context=${CTX_PRIMARY} get nodes
kubectl --context=${CTX_REMOTE} get nodes
```

## Step 1: Set Up Shared Certificates

As with any multi-cluster Istio setup, you need a shared root of trust:

```bash
mkdir -p certs && cd certs

openssl req -new -newkey rsa:4096 -x509 -sha256 \
  -days 3650 -nodes \
  -subj "/O=Istio/CN=Root CA" \
  -keyout root-key.pem -out root-cert.pem

for cluster in primary remote; do
  openssl req -new -newkey rsa:4096 -nodes \
    -subj "/O=Istio/CN=Intermediate CA ${cluster}" \
    -keyout ${cluster}-ca-key.pem -out ${cluster}-ca-csr.pem

  openssl x509 -req -sha256 -days 3650 \
    -CA root-cert.pem -CAkey root-key.pem -CAcreateserial \
    -in ${cluster}-ca-csr.pem -out ${cluster}-ca-cert.pem
done
```

Create the secrets:

```bash
for ctx in ${CTX_PRIMARY} ${CTX_REMOTE}; do
  cluster=${ctx}
  kubectl --context=${ctx} create namespace istio-system
  kubectl --context=${ctx} create secret generic cacerts -n istio-system \
    --from-file=ca-cert.pem=${cluster}-ca-cert.pem \
    --from-file=ca-key.pem=${cluster}-ca-key.pem \
    --from-file=root-cert.pem=root-cert.pem \
    --from-file=cert-chain.pem=${cluster}-ca-cert.pem
done
```

## Step 2: Install Istio on the Primary Cluster

The primary cluster gets the full Istio installation with the control plane configured to serve external clusters:

```yaml
# primary-cluster.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-primary
spec:
  profile: default
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: primary
      network: network1
```

```bash
istioctl install --context=${CTX_PRIMARY} -f primary-cluster.yaml -y
```

## Step 3: Expose Istiod to the Remote Cluster

The remote cluster's sidecars need to reach istiod. If both clusters are on different networks, you need to expose istiod through a gateway.

Install the east-west gateway on the primary:

```yaml
# eastwest-gateway.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: eastwest
spec:
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
    global:
      meshID: mesh1
      multiCluster:
        clusterName: primary
      network: network1
```

```bash
istioctl install --context=${CTX_PRIMARY} -f eastwest-gateway.yaml -y
```

Expose istiod through the gateway:

```bash
kubectl --context=${CTX_PRIMARY} apply -n istio-system -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: istiod-gateway
spec:
  selector:
    istio: eastwestgateway
  servers:
    - port:
        number: 15012
        name: tls-istiod
        protocol: TLS
      tls:
        mode: AUTO_PASSTHROUGH
      hosts:
        - "*.local"
    - port:
        number: 15017
        name: tls-istiodwebhook
        protocol: TLS
      tls:
        mode: AUTO_PASSTHROUGH
      hosts:
        - "*.local"
EOF
```

Also expose services for cross-cluster traffic:

```bash
kubectl --context=${CTX_PRIMARY} apply -n istio-system -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: cross-network-gateway
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
EOF
```

Get the east-west gateway external IP:

```bash
export DISCOVERY_ADDRESS=$(kubectl --context=${CTX_PRIMARY} get svc -n istio-system istio-eastwestgateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Discovery address: ${DISCOVERY_ADDRESS}"
```

## Step 4: Install Istio on the Remote Cluster

The remote cluster uses the `remote` profile, which skips the control plane and configures sidecars to connect to the primary's istiod:

```yaml
# remote-cluster.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-remote
spec:
  profile: remote
  values:
    istiodRemote:
      injectionPath: /inject/cluster/remote/net/network2
    global:
      meshID: mesh1
      multiCluster:
        clusterName: remote
      network: network2
      remotePilotAddress: ${DISCOVERY_ADDRESS}
```

Replace `${DISCOVERY_ADDRESS}` with the actual IP from the previous step, then install:

```bash
istioctl install --context=${CTX_REMOTE} -f remote-cluster.yaml -y
```

## Step 5: Register the Remote Cluster

The primary's istiod needs access to the remote cluster's API server to discover services:

```bash
istioctl create-remote-secret --context=${CTX_REMOTE} --name=remote | \
  kubectl apply --context=${CTX_PRIMARY} -f -
```

This creates a secret in the primary cluster containing the kubeconfig for the remote cluster. Istiod uses this to watch for service and endpoint changes.

## Step 6: Verify the Setup

Check that the remote cluster's istiod connection is working:

```bash
# On the remote cluster, check if the sidecar injector webhook is configured
kubectl --context=${CTX_REMOTE} get mutatingwebhookconfiguration
```

You should see an `istio-sidecar-injector` webhook that points to the primary cluster's istiod (via the east-west gateway).

Deploy test workloads:

```bash
kubectl --context=${CTX_PRIMARY} create namespace sample
kubectl --context=${CTX_PRIMARY} label namespace sample istio-injection=enabled

kubectl --context=${CTX_REMOTE} create namespace sample
kubectl --context=${CTX_REMOTE} label namespace sample istio-injection=enabled

# Deploy sleep on primary
kubectl --context=${CTX_PRIMARY} apply -n sample -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/sleep/sleep.yaml

# Deploy helloworld on remote
kubectl --context=${CTX_REMOTE} apply -n sample -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/helloworld/helloworld.yaml
```

Test cross-cluster connectivity:

```bash
kubectl --context=${CTX_PRIMARY} exec -n sample deploy/sleep -c sleep -- \
  curl -s helloworld.sample:5000/hello
```

## Handling Primary Cluster Failures

The biggest risk with a shared control plane is that the remote clusters depend on it. If the primary goes down:

- Existing connections continue to work (the Envoy proxies cache their configuration)
- New pods won't get sidecar injection
- Configuration changes won't propagate
- New service endpoints won't be discovered

For production, consider these mitigations:

1. Run istiod with multiple replicas on the primary cluster
2. Use a multi-zone primary cluster for higher availability
3. Have a documented runbook for promoting the remote cluster to primary
4. Monitor the xDS connection health from remote proxies

```bash
# Check xDS connection status from a remote cluster pod
istioctl --context=${CTX_REMOTE} proxy-status
```

Proxies showing `STALE` in the status column have lost their control plane connection.

## Scaling Considerations

A single istiod instance can handle a significant number of sidecars (thousands), but you should monitor its resource usage as you add more remote clusters. Key metrics to watch:

```bash
kubectl --context=${CTX_PRIMARY} top pod -n istio-system -l app=istiod
```

If istiod is using excessive memory, it might be because it's watching too many endpoints across all clusters. Consider using Sidecar resources to limit the scope of configuration each proxy receives.

The shared control plane model keeps things simple when you have a clear primary cluster and one or more satellite clusters. It reduces the number of Istio components you need to manage and makes configuration consistent across the mesh. Just be aware of the single point of failure and plan accordingly.
