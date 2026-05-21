# How to Set Up Istio on KubeSphere Container Platform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, KubeSphere, Kubernetes, Service Mesh, Platform

Description: How to enable and configure Istio on KubeSphere Container Platform using its built-in service mesh integration and manual methods.

---

KubeSphere is an open-source container platform built on Kubernetes that adds a web-based management console, multi-tenancy, DevOps pipelines, and more. One of its standout features is built-in support for Istio as a service mesh. You can enable Istio through KubeSphere's installer or install it manually alongside KubeSphere.

This guide covers both approaches and the KubeSphere-specific features that make working with Istio easier.

## Prerequisites

- A Kubernetes cluster supported by KubeSphere 3.4.x (v1.20.x through v1.26.x)
- kubectl access with cluster-admin privileges
- A default StorageClass configured in the cluster
- At least 4 CPU cores and 8 GB RAM available for KubeSphere and Istio

## Option A: Install KubeSphere with Istio Enabled

If you're setting up KubeSphere from scratch, you can enable Istio during installation.

### Step 1: Download the KubeSphere Configuration

Download the KubeSphere cluster configuration:

```bash
curl -LO https://github.com/kubesphere/ks-installer/releases/download/v3.4.1/cluster-configuration.yaml
```

### Step 2: Enable Service Mesh in Configuration

Before applying the configuration, edit `cluster-configuration.yaml` to enable the service mesh:

```bash
vi cluster-configuration.yaml
```

Find the `servicemesh` section and set it to enabled:

```yaml
servicemesh:
  enabled: true
```

### Step 3: Install KubeSphere

Deploy KubeSphere on an existing Kubernetes cluster:

```bash
kubectl apply -f https://github.com/kubesphere/ks-installer/releases/download/v3.4.1/kubesphere-installer.yaml
kubectl apply -f cluster-configuration.yaml
```

KubeSphere will install Istio as part of its setup. The installation takes about 10-15 minutes.

Monitor the progress:

```bash
kubectl logs -n kubesphere-system "$(kubectl get pod -n kubesphere-system -l 'app in (ks-install, ks-installer)' -o jsonpath='{.items[0].metadata.name}')" -f
```

When you see "Welcome to KubeSphere!" in the logs, the installation is complete.

### Step 4: Access the KubeSphere Console

Get the console URL:

```bash
kubectl get svc/ks-console -n kubesphere-system
```

The default credentials are:
- Username: admin
- Password: P@88w0rd

## Option B: Manual Istio Installation Alongside KubeSphere

If you already have KubeSphere running without the service mesh enabled, or you want a specific Istio version, install Istio manually. The example below pins Istio 1.24.0 for repeatability, but Istio 1.24 is no longer supported as of May 2026. For production, choose a currently supported Istio release and verify that your Kubernetes version is in that release's support matrix.

### Step 1: Install Istio with istioctl

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.24.0 sh -
cd istio-1.24.0
export PATH=$PWD/bin:$PATH
```

```bash
istioctl install --set profile=default -y
```

### Step 2: Verify

```bash
kubectl get pods -n istio-system
```

### Step 3: Enable Injection

```bash
kubectl label namespace default istio-injection=enabled
```

Manual Istio installation gives you the Istio control plane and APIs, but it does not enable KubeSphere's service mesh component in the console. For KubeSphere's grayscale release, tracing, and traffic monitoring UI, enable the KubeSphere Service Mesh component through the `ClusterConfiguration`.

## Using KubeSphere's Service Mesh Features

When Istio is enabled through KubeSphere, you get several nice features in the web console.

### Application Topology

KubeSphere shows a visual topology of your microservices, including the traffic flow between them. Navigate to your project (namespace) and click on "Services" to see the topology view.

### Traffic Management Through the UI

Instead of writing YAML for VirtualServices and DestinationRules, KubeSphere provides a graphical interface:

1. Go to your project in the KubeSphere console
2. Navigate to "Composed Apps" or "Services"
3. Select a service
4. Click "Traffic Management"
5. Configure canary releases, traffic mirroring, or circuit breaking through the UI

Behind the scenes, KubeSphere creates the appropriate Istio resources.

### Grayscale Release (Canary Deployments)

KubeSphere has a built-in grayscale release feature powered by Istio:

1. Go to Project > Grayscale Release
2. Select your app
3. Choose between canary release, blue-green deployment, or traffic mirroring
4. Configure the traffic split

This creates the underlying VirtualService and DestinationRule resources:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
    - reviews
  http:
    - route:
        - destination:
            host: reviews
            subset: v1
          weight: 90
        - destination:
            host: reviews
            subset: v2
          weight: 10
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews
spec:
  host: reviews
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

## Deploying a Sample Application

To test with Istio's Bookinfo sample from the command line, run these commands from an Istio release directory:

```bash
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml -n default
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml -n default
```

You can also deploy KubeSphere's Bookinfo sample from the console. In the KubeSphere console, navigate to your project. If KubeSphere Service Mesh is enabled and Application Governance is turned on for the app, you should see Bookinfo's mesh traffic information in the KubeSphere views.

## Custom Istio Configuration with KubeSphere

If KubeSphere installed Istio for you, you can still customize it. The Istio configuration is managed through the ClusterConfiguration resource:

```bash
kubectl edit clusterconfiguration ks-installer -n kubesphere-system
```

```yaml
servicemesh:
  enabled: true
  istio:
    components:
      ingressGateways:
        - name: istio-ingressgateway
          enabled: true
      cni:
        enabled: false
```

After saving, KubeSphere reconciles the changes.

For more detailed customization, use the Istio APIs and configuration fields supported by the Istio version that KubeSphere installed.

## Monitoring and Tracing

KubeSphere integrates with Istio's observability features. If you enabled the monitoring system in KubeSphere:

```yaml
monitoring:
  enabled: true
```

You get:
- Service-level metrics (request rate, error rate, latency)
- Per-service dashboards in the KubeSphere console
- Distributed tracing (if Jaeger is enabled)

Access tracing through the KubeSphere console under "Tracing" in your project when KubeSphere Service Mesh and the required logging/tracing components are enabled.

## Multi-Tenant Mesh with KubeSphere

KubeSphere's multi-tenancy model works well with Istio. Each KubeSphere workspace can have its own set of namespaces with independent Istio configurations:

- Workspace A: namespace-a1, namespace-a2 (with sidecar injection)
- Workspace B: namespace-b1, namespace-b2 (without sidecar injection)

Each workspace admin can manage their own VirtualServices and DestinationRules without affecting other workspaces.

Enable KubeSphere's app governance features through the console:
1. Go to Project Settings
2. Click "Gateway Settings"
3. Enable a gateway and turn on Application Governance when creating composed applications that need tracing and grayscale release features

## Troubleshooting

If the service mesh features don't show up in the KubeSphere console after enabling, restart the ks-apiserver:

```bash
kubectl rollout restart deployment ks-apiserver -n kubesphere-system
```

If Istio pods are in CrashLoopBackOff, check resource availability. KubeSphere itself uses quite a bit of resources, and combined with Istio, you might need more nodes:

```bash
kubectl top nodes
```

If the traffic topology graph is empty, make sure your services have the `app` and `version` labels set. Both KubeSphere and Istio use these labels for service identification:

```yaml
metadata:
  labels:
    app: my-service
    version: v1
```

KubeSphere adds a nice layer of usability on top of Istio. The web console makes it approachable for teams that aren't comfortable writing Istio YAML directly, while power users can still access the full Istio API through kubectl. Whether you let KubeSphere manage Istio or install it yourself, the mesh functionality works the same way underneath.
