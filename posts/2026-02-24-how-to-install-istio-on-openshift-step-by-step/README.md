# How to Install Istio on OpenShift Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OpenShift, Red Hat, Kubernetes, Service Mesh

Description: Step-by-step instructions for installing upstream Istio on Red Hat OpenShift with security context and networking considerations.

---

OpenShift is Red Hat's enterprise Kubernetes platform. While Red Hat offers their own service mesh product (based on Istio through the Maistra project), sometimes you want to run upstream Istio directly. Maybe you need a newer version, or you want to stay closer to the community release.

Installing upstream Istio on OpenShift requires some extra steps compared to vanilla Kubernetes because OpenShift has stricter security defaults. This guide walks through the complete process.

## Prerequisites

- An OpenShift cluster (version 4.12+)
- `oc` CLI tool installed and logged in
- Cluster admin privileges
- istioctl

Log in to your cluster:

```bash
oc login --server=https://api.your-cluster.example.com:6443
```

Verify access:

```bash
oc get nodes
oc whoami
```

## Step 1: Create the Istio Namespace

```bash
oc new-project istio-system
```

Or using kubectl:

```bash
kubectl create namespace istio-system
```

## Step 2: Configure Security Context Constraints

OpenShift uses Security Context Constraints (SCCs) to control what pods can do. Istio's init containers need NET_ADMIN and NET_RAW capabilities to set up iptables rules. You need to grant the right SCCs:

```bash
oc adm policy add-scc-to-group anyuid system:serviceaccounts:istio-system
oc adm policy add-scc-to-group privileged system:serviceaccounts:istio-system
```

For namespaces that will have Istio sidecars, you also need:

```bash
oc adm policy add-scc-to-group anyuid system:serviceaccounts:default
oc adm policy add-scc-to-group privileged system:serviceaccounts:default
```

Replace `default` with whatever namespace your applications run in.

## Step 3: Download and Install Istio

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.24.0
export PATH=$PWD/bin:$PATH
```

Create an OpenShift-specific configuration:

```yaml
# istio-openshift.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
  values:
    global:
      platform: openshift
    cni:
      enabled: true
      chained: false
  components:
    cni:
      enabled: true
      namespace: kube-system
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
```

The key setting here is `global.platform: openshift`, which tells Istio to configure itself for OpenShift's security model. We also enable the Istio CNI plugin, which avoids the need for init containers with elevated privileges.

```bash
istioctl install -f istio-openshift.yaml -y
```

## Step 4: Verify the Installation

```bash
oc get pods -n istio-system
oc get pods -n kube-system | grep istio-cni
```

You should see istiod, the ingress gateway, and the CNI plugin pods running.

## Step 5: Enable Sidecar Injection

```bash
oc label namespace default istio-injection=enabled
```

## Step 6: Deploy a Test Application

When deploying apps on OpenShift with Istio, you might need to adjust the SCC for each namespace:

```bash
oc apply -f samples/bookinfo/platform/kube/bookinfo.yaml -n default
oc apply -f samples/bookinfo/networking/bookinfo-gateway.yaml -n default
```

Check pods:

```bash
oc get pods -n default
```

## Step 7: Expose Through OpenShift Route

OpenShift has its own routing mechanism. You can create a Route that points to the Istio ingress gateway:

```bash
oc expose svc istio-ingressgateway -n istio-system
```

Get the route URL:

```bash
oc get route istio-ingressgateway -n istio-system
```

Test it:

```bash
export GATEWAY_URL=$(oc get route istio-ingressgateway -n istio-system -o jsonpath='{.spec.host}')
curl http://$GATEWAY_URL/productpage
```

## Using Istio CNI on OpenShift

The Istio CNI plugin is strongly recommended on OpenShift. Without it, every pod needs init containers with NET_ADMIN capabilities, which goes against OpenShift's security model.

With the CNI plugin:
- No init containers needed in application pods
- iptables rules are set up by the CNI plugin on the node level
- More compatible with OpenShift's default security policies

The CNI plugin runs as a DaemonSet and configures network rules when pods are created. Check it's working:

```bash
oc get daemonset istio-cni-node -n kube-system
```

## OpenShift Routes vs Istio Gateway

OpenShift has its own ingress mechanism (Routes), which overlaps with Istio's Gateway/VirtualService model. You have a few options:

**Option 1: Use OpenShift Route + Istio Gateway**

Create a Route that sends traffic to the Istio ingress gateway, which then uses VirtualService rules to route to backends. This gives you the best of both worlds.

**Option 2: Use only Istio Gateway**

Skip OpenShift Routes entirely and expose the Istio ingress gateway through a LoadBalancer service or NodePort. This is cleaner from Istio's perspective.

**Option 3: Use only OpenShift Routes**

Disable Istio's ingress gateway and use OpenShift Routes for external access. Istio still handles internal mesh traffic.

For most setups, Option 1 is the pragmatic choice since it works with OpenShift's existing infrastructure.

## NetworkPolicy Integration

If your OpenShift cluster uses NetworkPolicy for namespace isolation (which is the default on OpenShift 4.x with OVN-Kubernetes), you need to allow Istio traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-istio
  namespace: default
spec:
  podSelector: {}
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
  policyTypes:
    - Ingress
```

This allows traffic from the istio-system namespace into your application namespace.

## Monitoring on OpenShift

OpenShift 4 ships with a built-in monitoring stack (Prometheus + Grafana). You can configure it to scrape Istio metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istiod-monitor
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: istiod
  endpoints:
    - port: http-monitoring
      interval: 15s
```

Alternatively, install Istio's own monitoring addons:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/kiali.yaml
```

## Upgrading Istio on OpenShift

Follow the same upgrade process as vanilla Kubernetes, but remember to check SCC compatibility after the upgrade:

```bash
istioctl upgrade -y
```

After upgrading, verify that the CNI plugin is still running and that sidecars are being injected correctly:

```bash
oc rollout restart deployment -n default
oc get pods -n default
```

## Troubleshooting OpenShift-Specific Issues

If sidecars fail to start with permission errors, the SCC isn't configured correctly. Check which SCC a pod is using:

```bash
oc get pod <pod-name> -o yaml | grep scc
```

If the CNI plugin isn't working, check its logs:

```bash
oc logs -n kube-system -l k8s-app=istio-cni-node
```

If OpenShift Routes aren't routing to the Istio gateway correctly, make sure the Route targets the right service and port:

```bash
oc describe route istio-ingressgateway -n istio-system
```

Running upstream Istio on OpenShift takes a bit more setup than on vanilla Kubernetes, but it's entirely doable. The main things to remember are the SCC configuration, the CNI plugin for cleaner security, and the interaction between OpenShift Routes and Istio's own ingress model.
