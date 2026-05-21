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
- The matching Istio release directory available locally for the `samples` and `tools/certs` files
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
mkdir -p certs
pushd certs

# Run these from the top-level directory of an Istio release.
make -f ../tools/certs/Makefile.selfsigned.mk root-ca
make -f ../tools/certs/Makefile.selfsigned.mk primary-cacerts
make -f ../tools/certs/Makefile.selfsigned.mk remote-cacerts
```

Create the secrets:

```bash
for cluster in primary remote; do
  if [ "${cluster}" = "primary" ]; then
    ctx=${CTX_PRIMARY}
  else
    ctx=${CTX_REMOTE}
  fi

  kubectl --context=${ctx} create namespace istio-system
  kubectl --context=${ctx} create secret generic cacerts -n istio-system \
    --from-file=${cluster}/ca-cert.pem \
    --from-file=${cluster}/ca-key.pem \
    --from-file=${cluster}/root-cert.pem \
    --from-file=${cluster}/cert-chain.pem
done

popd
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
      externalIstiod: true
```

```bash
kubectl --context=${CTX_PRIMARY} label namespace istio-system topology.istio.io/network=network1

istioctl install --context=${CTX_PRIMARY} -f primary-cluster.yaml -y
```

## Step 3: Expose Istiod to the Remote Cluster

The remote cluster's sidecars need to reach istiod. If both clusters are on different networks, you need to expose istiod through a gateway.

Install the east-west gateway on the primary:

```bash
samples/multicluster/gen-eastwest-gateway.sh --network network1 | \
  istioctl --context=${CTX_PRIMARY} install -y -f -
```

Expose istiod through the gateway:

```bash
kubectl --context=${CTX_PRIMARY} apply -n istio-system -f samples/multicluster/expose-istiod.yaml
```

Get the east-west gateway external IP:

```bash
export DISCOVERY_ADDRESS=$(kubectl --context=${CTX_PRIMARY} get svc -n istio-system istio-eastwestgateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Discovery address: ${DISCOVERY_ADDRESS}"
```

## Step 4: Install Istio on the Remote Cluster

The remote cluster uses the `remote` profile, which skips the control plane and configures sidecars to connect to the primary's istiod:

```bash
kubectl --context=${CTX_REMOTE} annotate namespace istio-system topology.istio.io/controlPlaneClusters=primary
kubectl --context=${CTX_REMOTE} label namespace istio-system topology.istio.io/network=network2
```

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

Because this example uses different networks, install an east-west gateway in the remote cluster too:

```bash
samples/multicluster/gen-eastwest-gateway.sh --network network2 | \
  istioctl --context=${CTX_REMOTE} install -y -f -
```

Then expose services for cross-cluster traffic:

```bash
kubectl --context=${CTX_PRIMARY} apply -n istio-system -f samples/multicluster/expose-services.yaml
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

# Create the helloworld service in both clusters so DNS lookup succeeds
kubectl --context=${CTX_PRIMARY} apply -n sample -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/helloworld/helloworld.yaml -l service=helloworld
kubectl --context=${CTX_REMOTE} apply -n sample -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/helloworld/helloworld.yaml -l service=helloworld

# Deploy helloworld on remote
kubectl --context=${CTX_REMOTE} apply -n sample -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/helloworld/helloworld.yaml -l version=v1
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
