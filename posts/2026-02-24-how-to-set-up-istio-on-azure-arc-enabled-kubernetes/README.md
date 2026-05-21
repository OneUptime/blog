# How to Set Up Istio on Azure Arc-Enabled Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Azure Arc, Kubernetes, Service Mesh, Hybrid Cloud

Description: A practical guide to installing and configuring Istio service mesh on Azure Arc-enabled Kubernetes clusters for hybrid and multi-cloud environments.

---

Azure Arc lets you manage Kubernetes clusters running anywhere, whether they are on-premises, at the edge, or across other cloud providers, all from the Azure control plane. Combining that with Istio gives you a consistent service mesh layer that works across your entire hybrid infrastructure. If you have been wondering how to get these two technologies working together smoothly, this guide walks through the whole process.

## Prerequisites

Before you start, make sure you have a few things ready:

- An Azure subscription with the Arc-enabled Kubernetes resource provider registered
- A Kubernetes cluster version supported by your Istio release. For Istio 1.30, use Kubernetes 1.32 through 1.36.
- `kubectl` configured to talk to your cluster
- The Azure CLI with the `connectedk8s` extension
- `istioctl` installed locally for a currently supported Istio release
- Helm 3.x

If your cluster is not yet Arc-enabled, connect it first:

```bash
az connectedk8s connect --name my-cluster --resource-group my-rg
```

Verify the connection:

```bash
az connectedk8s show --name my-cluster --resource-group my-rg --query "connectivityStatus"
```

You should see `"Connected"` in the output.

## Understanding the Architecture

When you run Istio on an Arc-enabled cluster, the service mesh operates locally on the cluster while Azure Arc provides the management plane. The Istio control plane (istiod) runs inside your cluster just like any standard installation. Azure Arc does not interfere with Istio's data plane proxies or control plane components.

The key benefit here is that you can use Azure Policy, Azure Monitor, and GitOps through Arc to manage and observe your Istio configuration centrally, even when the cluster is running in a completely different environment.

## Step 1: Prepare the Cluster

Arc-enabled clusters sometimes have specific RBAC configurations. Make sure your current Kubernetes context has cluster-admin permissions:

```bash
kubectl auth can-i '*' '*' --all-namespaces
```

If that command does not return `yes`, ask a cluster administrator to grant the required Kubernetes RBAC permissions before installing Istio.

Check that your cluster has enough headroom for the Istio control plane and gateway pods. Exact sizing depends on traffic volume and mesh size, but you should verify node capacity before installing:

```bash
kubectl top nodes
```

## Step 2: Install Istio with IstioOperator

For Arc-enabled clusters, the recommended approach is using `istioctl` with a custom IstioOperator profile. Create a file called `istio-arc.yaml`:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-arc-config
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
    enableTracing: true
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          service:
            type: LoadBalancer
```

If your cluster does not have a cloud load balancer (common for on-premises Arc scenarios), change the service type to `NodePort`:

```yaml
          service:
            type: NodePort
            ports:
              - port: 80
                targetPort: 8080
                nodePort: 30080
                name: http2
              - port: 443
                targetPort: 8443
                nodePort: 30443
                name: https
```

Install Istio using this configuration:

```bash
istioctl install -f istio-arc.yaml -y
```

Verify that all components are running:

```bash
kubectl get pods -n istio-system
```

You should see `istiod` and `istio-ingressgateway` pods in a Running state.

## Step 3: Enable Sidecar Injection

Label the namespaces where you want automatic sidecar injection:

```bash
kubectl label namespace default istio-injection=enabled
```

For Arc-managed namespaces that might have specific labels, make sure the injection label does not conflict:

```bash
kubectl get namespace default --show-labels
```

## Step 4: Integrate with Azure Monitor

One of the nice things about running Istio on Arc is that you can pipe telemetry data into Azure Monitor. If you have the managed Prometheus metrics extension installed on your Arc cluster, you can add a custom scrape configuration for Istio metrics.

First, enable the monitoring extension if it is not already active:

```bash
az k8s-extension create --name azuremonitor-metrics \
  --cluster-name my-cluster \
  --resource-group my-rg \
  --cluster-type connectedClusters \
  --extension-type Microsoft.AzureMonitor.Containers.Metrics
```

Create a file named `prometheus-config` to tell the Azure Monitor agent to scrape Istio metrics:

```yaml
scrape_configs:
  - job_name: 'istiod'
    kubernetes_sd_configs:
      - role: endpoints
        namespaces:
          names:
            - istio-system
    relabel_configs:
      - source_labels: [__meta_kubernetes_service_name]
        action: keep
        regex: istiod
  - job_name: 'envoy-stats'
    metrics_path: /stats/prometheus
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_container_name]
        action: keep
        regex: istio-proxy
```

Create the ConfigMap from that file:

```bash
kubectl create configmap ama-metrics-prometheus-config \
  --from-file=prometheus-config \
  -n kube-system
```

## Step 5: Use Azure Policy with Istio

Azure Policy for Arc-enabled Kubernetes can enforce Istio-related configurations. For example, you can create a policy that requires all namespaces to have the `istio-injection` label:

```bash
az policy assignment create \
  --name "require-istio-injection" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/<policy-definition-id>" \
  --scope "/subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.Kubernetes/connectedClusters/my-cluster"
```

You can also use GitOps through Arc to manage your Istio configurations declaratively:

```bash
az k8s-configuration flux create \
  --name istio-config \
  --cluster-name my-cluster \
  --resource-group my-rg \
  --cluster-type connectedClusters \
  --namespace istio-system \
  --scope cluster \
  --kind git \
  --url https://github.com/your-org/istio-configs \
  --branch main \
  --kustomization name=istio-resources path=./overlays/production
```

## Step 6: Deploy a Test Application

Deploy a sample workload to verify everything works:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.30/samples/bookinfo/platform/kube/bookinfo.yaml
```

Check that the sidecar proxy was injected:

```bash
kubectl get pods -l app=productpage -o jsonpath='{.items[0].spec.containers[*].name}'
```

You should see both `productpage` and `istio-proxy` in the output.

Create a Gateway and VirtualService for external access:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: bookinfo-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: bookinfo
spec:
  hosts:
    - "*"
  gateways:
    - bookinfo-gateway
  http:
    - match:
        - uri:
            exact: /productpage
      route:
        - destination:
            host: productpage
            port:
              number: 9080
```

## Troubleshooting Common Issues

**Pod injection fails on Arc-managed namespaces**: Some Arc extensions create namespaces with restrictive admission webhooks. Check if there are conflicting webhook configurations:

```bash
kubectl get mutatingwebhookconfigurations
```

**Istiod cannot resolve services**: On some Arc environments, CoreDNS might need a configuration update. Verify DNS resolution from within the istio-system namespace:

```bash
kubectl run dns-test --image=busybox --rm -it --restart=Never -- nslookup kubernetes.default
```

**Load balancer stays in pending state**: For on-premises clusters, install MetalLB or switch to NodePort as mentioned earlier.

## Wrapping Up

Running Istio on Azure Arc-enabled Kubernetes gives you the best of both worlds. You get the powerful traffic management, security, and observability features of Istio, combined with centralized management through Azure Arc. The setup process is straightforward once you understand how the two technologies complement each other rather than overlap. The main thing to watch out for is resource constraints on smaller edge clusters and making sure your Arc extensions do not conflict with Istio's admission webhooks.
