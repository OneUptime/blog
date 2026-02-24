# How to Deploy Istio with External Control Plane Architecture

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Control Plane, Kubernetes, Architecture, Service Mesh

Description: A practical guide to deploying Istio with an external control plane where Istiod runs in a separate cluster from your workloads for better isolation and management.

---

The external control plane architecture separates Istio's control plane from the data plane. Instead of running Istiod alongside your application workloads, you host it in a dedicated cluster (or a management cluster) and have your workload clusters connect to it remotely. This gives you a clean separation of concerns: one team manages the mesh infrastructure, and application teams just deploy their workloads with sidecar injection.

This pattern is popular in managed service mesh offerings and in large enterprises where a platform team operates the mesh for multiple application teams. It also reduces the resource footprint on workload clusters since they do not need to run Istiod.

## Architecture

The setup involves two types of clusters:

- **External control plane cluster**: Runs Istiod and any mesh management components
- **Remote cluster(s)**: Run application workloads with sidecar proxies that connect back to the external Istiod

The sidecars in remote clusters need to reach the external Istiod for configuration. This is done through an ingress gateway on the control plane cluster that exposes Istiod's xDS and injection endpoints.

## Step 1: Prepare the External Cluster

Set up context variables:

```bash
export CTX_EXTERNAL_CLUSTER=external-cluster
export CTX_REMOTE_CLUSTER=remote-cluster
export EXTERNAL_ISTIOD_ADDR=<external-cluster-ingress-ip>
```

Create the istio-system namespace:

```bash
kubectl create namespace istio-system --context="${CTX_EXTERNAL_CLUSTER}"
```

## Step 2: Set Up the Ingress Gateway on the External Cluster

You need a gateway to expose Istiod to remote clusters. Install a minimal Istio configuration first:

```yaml
# external-cluster-gateway.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  namespace: istio-system
spec:
  meshConfig:
    accessLogFile: /dev/stdout
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
    pilot:
      enabled: false
  values:
    global:
      istioNamespace: external-istiod
```

Actually, the recommended approach is to install the full control plane and expose it. Here is the configuration:

```yaml
# external-control-plane.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  namespace: external-istiod
spec:
  profile: empty
  meshConfig:
    rootNamespace: external-istiod
    defaultConfig:
      discoveryAddress: "${EXTERNAL_ISTIOD_ADDR}":15012
  components:
    base:
      enabled: true
    pilot:
      enabled: true
      k8s:
        overlays:
          - kind: Deployment
            name: istiod
            patches:
              - path: spec.template.spec.volumes[100]
                value:
                  name: config-volume
                  configMap:
                    name: istio
              - path: spec.template.spec.containers[0].volumeMounts[100]
                value:
                  name: config-volume
                  mountPath: /etc/istio/config
        env:
          - name: INJECTION_WEBHOOK_CONFIG_NAME
            value: ""
          - name: VALIDATION_WEBHOOK_CONFIG_NAME
            value: ""
```

## Step 3: Configure Istiod for Remote Clusters

The external Istiod needs to be able to read resources from the remote cluster. Create a remote secret:

```bash
istioctl create-remote-secret \
  --context="${CTX_REMOTE_CLUSTER}" \
  --name=remote-cluster \
  --type=config | \
  kubectl apply -f - --context="${CTX_EXTERNAL_CLUSTER}" -n external-istiod
```

## Step 4: Set Up the Remote Cluster

On the remote cluster, you install a minimal Istio configuration that just handles sidecar injection and points everything to the external control plane:

```yaml
# remote-cluster.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: remote
  values:
    istiodRemote:
      injectionPath: /inject/cluster/remote-cluster/net/network1
    global:
      remotePilotAddress: "${EXTERNAL_ISTIOD_ADDR}"
```

Install it:

```bash
istioctl install --context="${CTX_REMOTE_CLUSTER}" -f remote-cluster.yaml
```

The `profile: remote` is specifically designed for this use case. It installs the sidecar injector webhook that points to the external Istiod, along with the necessary RBAC and configuration.

## Step 5: Configure the Injection Webhook

The sidecar injection webhook on the remote cluster needs to call the external Istiod. Verify the webhook configuration:

```bash
kubectl get mutatingwebhookconfigurations --context="${CTX_REMOTE_CLUSTER}"
```

The webhook should have a URL pointing to the external Istiod address. If it is using a service reference, you need to set up the proper service to proxy requests to the external control plane.

## Step 6: Verify the Setup

Deploy a test application on the remote cluster:

```bash
kubectl create namespace sample --context="${CTX_REMOTE_CLUSTER}"
kubectl label namespace sample istio-injection=enabled --context="${CTX_REMOTE_CLUSTER}"
kubectl apply -f samples/httpbin/httpbin.yaml -n sample --context="${CTX_REMOTE_CLUSTER}"
kubectl apply -f samples/sleep/sleep.yaml -n sample --context="${CTX_REMOTE_CLUSTER}"
```

Check that sidecars are injected:

```bash
kubectl get pods -n sample --context="${CTX_REMOTE_CLUSTER}"
```

Each pod should show 2/2 containers (the app container plus the sidecar). If you see 1/1, the injection webhook is not reaching the external Istiod.

Test service-to-service communication:

```bash
kubectl exec -n sample -c sleep \
  "$(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' --context="${CTX_REMOTE_CLUSTER}")" \
  --context="${CTX_REMOTE_CLUSTER}" -- \
  curl -sS httpbin.sample:8000/headers
```

## Managing Multiple Remote Clusters

You can connect multiple remote clusters to the same external control plane. For each additional remote cluster:

1. Create a remote secret and apply it to the external cluster
2. Install the remote profile on the new cluster pointing to the same external Istiod
3. If you want cross-cluster communication between remote clusters, set up east-west gateways or ensure flat networking

```bash
# For each new remote cluster
istioctl create-remote-secret \
  --context="${CTX_NEW_REMOTE}" \
  --name=new-remote-cluster \
  --type=config | \
  kubectl apply -f - --context="${CTX_EXTERNAL_CLUSTER}" -n external-istiod
```

## Operational Considerations

**High availability**: The external Istiod is a single point of failure for all remote clusters. Run multiple replicas and consider spreading them across availability zones:

```yaml
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        affinity:
          podAntiAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
              - weight: 100
                podAffinityTerm:
                  labelSelector:
                    matchExpressions:
                      - key: app
                        operator: In
                        values:
                          - istiod
                  topologyKey: topology.kubernetes.io/zone
```

**Network reliability**: If the connection between a remote cluster and the external Istiod drops, existing proxy configurations continue to work. But no new configuration updates will be applied until the connection is restored. New pods will not get sidecars injected either.

**Upgrades**: Upgrading the external control plane affects all remote clusters. Plan upgrades carefully and test with a canary remote cluster first. The Istio revision-based upgrade model works well here since you can run two versions of Istiod simultaneously.

The external control plane model is the right choice when you want centralized mesh management. It takes more initial setup compared to running Istiod in each cluster, but the operational benefits of managing a single control plane are significant at scale.
