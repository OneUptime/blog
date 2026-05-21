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
- **Remote cluster(s)**: Run application workloads with sidecar proxies that connect back to the external Istiod. The first remote cluster also serves as the config cluster for the mesh.

The sidecars in remote clusters need to reach the external Istiod for configuration. This is done through an ingress gateway on the control plane cluster that exposes Istiod's xDS, CA, injection, and validation endpoints. The external Istiod also needs network access to the remote cluster's Kubernetes API server so it can watch services, endpoints, pods, and Istio configuration.

## Step 1: Prepare the External Cluster

Set up context variables:

```bash
export CTX_EXTERNAL_CLUSTER=external-cluster
export CTX_REMOTE_CLUSTER=remote-cluster
export REMOTE_CLUSTER_NAME=remote-cluster
export EXTERNAL_ISTIOD_ADDR=<external-istiod-hostname>
export SSL_SECRET_NAME=<external-istiod-tls-secret>
```

Create the namespaces used by the gateway and the external control plane:

```bash
kubectl create namespace istio-system --context="${CTX_EXTERNAL_CLUSTER}"
kubectl create namespace external-istiod --context="${CTX_EXTERNAL_CLUSTER}"
```

## Step 2: Set Up the Ingress Gateway on the External Cluster

You need a gateway to expose Istiod to remote clusters. Install a gateway in the external cluster with the control plane ports exposed:

```yaml
# controlplane-gateway.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  namespace: istio-system
spec:
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          service:
            ports:
              - port: 15021
                targetPort: 15021
                name: status-port
              - port: 15012
                targetPort: 15012
                name: tls-xds
              - port: 15017
                targetPort: 15017
                name: tls-webhook
```

Install it:

```bash
istioctl install -f controlplane-gateway.yaml --context="${CTX_EXTERNAL_CLUSTER}"
```

If you are using a load balancer IP address for testing instead of a DNS hostname with a signed certificate, set `EXTERNAL_ISTIOD_ADDR` from the gateway service and use the IP-address settings shown later:

```bash
export EXTERNAL_ISTIOD_ADDR=$(kubectl -n istio-system --context="${CTX_EXTERNAL_CLUSTER}" get svc istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
export SSL_SECRET_NAME=NONE
```

## Step 3: Configure Istiod for Remote Clusters

The first remote cluster is also the config cluster for the mesh. Install the remote profile there with the config-cluster settings enabled:

```yaml
# remote-config-cluster.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  namespace: external-istiod
spec:
  profile: remote
  values:
    global:
      istioNamespace: external-istiod
      configCluster: true
    pilot:
      configMap: true
    istiodRemote:
      injectionURL: https://${EXTERNAL_ISTIOD_ADDR}:15017/inject/cluster/${REMOTE_CLUSTER_NAME}/net/network1
    base:
      validationURL: https://${EXTERNAL_ISTIOD_ADDR}:15017/validate
```

If you are using an IP address for `EXTERNAL_ISTIOD_ADDR`, use a discovery address and injection path instead of webhook URLs:

```yaml
# remote-config-cluster.yaml for IP-address testing
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  namespace: external-istiod
spec:
  profile: remote
  values:
    global:
      istioNamespace: external-istiod
      configCluster: true
      remotePilotAddress: ${EXTERNAL_ISTIOD_ADDR}
    pilot:
      configMap: true
    istiodRemote:
      injectionPath: /inject/cluster/${REMOTE_CLUSTER_NAME}/net/network1
```

Install it:

```bash
kubectl create namespace external-istiod --context="${CTX_REMOTE_CLUSTER}"
istioctl install -f remote-config-cluster.yaml --set values.defaultRevision=default --context="${CTX_REMOTE_CLUSTER}"
```

The external Istiod needs to be able to read resources from the remote cluster. Create a remote secret:

```bash
istioctl create-remote-secret \
  --context="${CTX_REMOTE_CLUSTER}" \
  --type=config \
  --namespace=external-istiod \
  --service-account=istiod \
  --create-service-account=false | \
  kubectl apply -f - --context="${CTX_EXTERNAL_CLUSTER}"
```

Now install the external control plane in the external cluster:

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
      discoveryAddress: ${EXTERNAL_ISTIOD_ADDR}:15012
      proxyMetadata:
        XDS_ROOT_CA: /etc/ssl/certs/ca-certificates.crt
        CA_ROOT_CA: /etc/ssl/certs/ca-certificates.crt
  components:
    pilot:
      enabled: true
      k8s:
        overlays:
          - kind: Deployment
            name: istiod
            patches:
              - path: spec.template.spec.volumes[100]
                value: |-
                  name: config-volume
                  configMap:
                    name: istio
              - path: spec.template.spec.volumes[100]
                value: |-
                  name: inject-volume
                  configMap:
                    name: istio-sidecar-injector
              - path: spec.template.spec.containers[0].volumeMounts[100]
                value: |-
                  name: config-volume
                  mountPath: /etc/istio/config
              - path: spec.template.spec.containers[0].volumeMounts[100]
                value: |-
                  name: inject-volume
                  mountPath: /var/lib/istio/inject
        env:
          - name: INJECTION_WEBHOOK_CONFIG_NAME
            value: ""
          - name: VALIDATION_WEBHOOK_CONFIG_NAME
            value: ""
          - name: EXTERNAL_ISTIOD
            value: "true"
          - name: LOCAL_CLUSTER_SECRET_WATCHER
            value: "true"
          - name: CLUSTER_ID
            value: ${REMOTE_CLUSTER_NAME}
          - name: SHARED_MESH_CONFIG
            value: istio
  values:
    global:
      externalIstiod: true
      caAddress: ${EXTERNAL_ISTIOD_ADDR}:15012
      istioNamespace: external-istiod
      operatorManageWebhooks: true
      configValidation: false
      meshID: mesh1
      multiCluster:
        clusterName: ${REMOTE_CLUSTER_NAME}
      network: network1
```

If you are using an IP address for `EXTERNAL_ISTIOD_ADDR`, remove the `proxyMetadata` block and set the webhook config names:

```yaml
          - name: INJECTION_WEBHOOK_CONFIG_NAME
            value: istio-sidecar-injector-external-istiod
          - name: VALIDATION_WEBHOOK_CONFIG_NAME
            value: istio-validator-external-istiod
```

Install it:

```bash
istioctl install -f external-control-plane.yaml --context="${CTX_EXTERNAL_CLUSTER}"
```

Expose the external Istiod through the gateway:

```yaml
# external-istiod-gw.yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: external-istiod-gw
  namespace: external-istiod
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 15012
        protocol: https
        name: https-XDS
      tls:
        mode: SIMPLE
        credentialName: ${SSL_SECRET_NAME}
      hosts:
        - ${EXTERNAL_ISTIOD_ADDR}
    - port:
        number: 15017
        protocol: https
        name: https-WEBHOOK
      tls:
        mode: SIMPLE
        credentialName: ${SSL_SECRET_NAME}
      hosts:
        - ${EXTERNAL_ISTIOD_ADDR}
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: external-istiod-vs
  namespace: external-istiod
spec:
  hosts:
    - ${EXTERNAL_ISTIOD_ADDR}
  gateways:
    - external-istiod-gw
  http:
    - match:
        - port: 15012
      route:
        - destination:
            host: istiod.external-istiod.svc.cluster.local
            port:
              number: 15012
    - match:
        - port: 15017
      route:
        - destination:
            host: istiod.external-istiod.svc.cluster.local
            port:
              number: 443
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-istiod-dr
  namespace: external-istiod
spec:
  host: istiod.external-istiod.svc.cluster.local
  trafficPolicy:
    portLevelSettings:
      - port:
          number: 15012
        tls:
          mode: SIMPLE
        connectionPool:
          http:
            h2UpgradePolicy: UPGRADE
      - port:
          number: 443
        tls:
          mode: SIMPLE
```

```bash
kubectl apply -f external-istiod-gw.yaml --context="${CTX_EXTERNAL_CLUSTER}"
```

For IP-address testing, use TLS passthrough routing and omit the `DestinationRule` instead of terminating TLS at the gateway.

## Step 4: Set Up the Remote Cluster

The `profile: remote` is specifically designed for this use case. It installs the sidecar injector webhook that points to the external Istiod, along with the necessary RBAC and configuration. You installed it in the previous step because the first remote cluster also serves as the config cluster. For additional remote clusters, install the remote profile with `global.istioNamespace: external-istiod` and an `injectionURL` for that cluster, then annotate the `external-istiod` namespace with `topology.istio.io/controlPlaneClusters=${REMOTE_CLUSTER_NAME}`.

## Step 5: Configure the Injection Webhook

The sidecar injection webhook on the remote cluster needs to call the external Istiod. Verify the webhook configuration:

```bash
kubectl get mutatingwebhookconfigurations --context="${CTX_REMOTE_CLUSTER}"
```

With the DNS-hostname configuration, the webhook should have a URL pointing to `https://${EXTERNAL_ISTIOD_ADDR}:15017`. With the IP-address testing configuration, it should use the configured injection path together with `global.remotePilotAddress`.

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

1. Install the remote profile on the new cluster pointing to the same external Istiod
2. Annotate the `external-istiod` namespace on the new cluster with `topology.istio.io/controlPlaneClusters=${REMOTE_CLUSTER_NAME}`
3. Create a remote secret with `--type=remote` and apply it to the external cluster
4. If you want cross-cluster communication between remote clusters, set up east-west gateways or ensure flat networking

```bash
# For each new remote cluster
kubectl create namespace external-istiod --context="${CTX_NEW_REMOTE}"
kubectl annotate namespace external-istiod \
  "topology.istio.io/controlPlaneClusters=${REMOTE_CLUSTER_NAME}" \
  --context="${CTX_NEW_REMOTE}"

istioctl create-remote-secret \
  --context="${CTX_NEW_REMOTE}" \
  --name=new-remote-cluster \
  --type=remote \
  --namespace=external-istiod \
  --create-service-account=false | \
  kubectl apply -f - --context="${CTX_EXTERNAL_CLUSTER}"
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
