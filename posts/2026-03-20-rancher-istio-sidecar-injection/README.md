# How to Configure Istio Sidecar Injection in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Istio, Service Mesh, Sidecar

Description: Learn how to configure automatic and manual Istio sidecar injection for your workloads running in Rancher-managed Kubernetes clusters.

Istio's sidecar injection is the mechanism by which Envoy proxy containers are added to your application pods. These sidecar proxies intercept traffic to and from your services, enabling traffic management, observability, and security features. This guide explains how to configure sidecar injection in a Rancher-managed environment.

## Prerequisites

- Istio installed on your Rancher-managed cluster (see the Istio installation guide)
- `kubectl` access to your cluster
- Basic understanding of Kubernetes namespaces and pod specifications

## Understanding Sidecar Injection

Istio supports two modes of sidecar injection:

1. **Automatic injection**: The Istio mutating webhook automatically injects the Envoy sidecar into new pods created in labeled namespaces
2. **Manual injection**: You explicitly generate an injected manifest with `istioctl kube-inject` and apply it to the cluster

## Step 1: Enable Automatic Sidecar Injection at the Namespace Level

The most common approach is to enable automatic injection at the namespace level:

```bash
# Enable automatic sidecar injection for a specific namespace

kubectl label namespace my-app istio-injection=enabled

# Verify the label
kubectl get namespace my-app --show-labels
# Output should show: istio-injection=enabled

# To disable injection for a namespace
kubectl label namespace my-app istio-injection=disabled --overwrite
```

## Step 2: Control Injection at the Pod Level

You can control injection at the individual pod level using pod template labels. A pod-level `sidecar.istio.io/inject: "true"` label can opt a workload in when the namespace is otherwise unlabeled, but it does not override a namespace explicitly labeled `istio-injection=disabled`:

```yaml
# deployment.yaml - Request sidecar injection for this pod
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-namespace
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
        # Request injection for this specific pod
        sidecar.istio.io/inject: "true"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        ports:
        - containerPort: 8080
```

```yaml
# deployment-no-inject.yaml - Disable injection for a specific pod
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-utility
  namespace: my-namespace
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-utility
  template:
    metadata:
      labels:
        app: my-utility
        # Disable injection for this pod even if namespace has injection enabled
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: my-utility
        image: my-utility:latest
```

## Step 3: Manual Sidecar Injection

For cases where you need more control, use manual injection with `istioctl`:

```bash
# Inject sidecar into a deployment manifest and apply it
istioctl kube-inject -f deployment.yaml | kubectl apply -f -

# Or save the injected manifest for review
istioctl kube-inject -f deployment.yaml -o deployment-injected.yaml

# Verify the injected manifest has the sidecar container
grep -A5 "istio-proxy" deployment-injected.yaml
```

## Step 4: Customize Sidecar Configuration

You can customize the sidecar proxy behavior using the `Sidecar` custom resource. A common use is to scope which services are imported into the proxy configuration for workloads in a namespace. This scopes configuration pushed to the proxy; it is not an outbound firewall:

```yaml
# sidecar-config.yaml - Limit the sidecar's imported hosts
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: my-app
spec:
  egress:
  # Import services from the same namespace
  - hosts:
    - "./*"
    # Also import services from the istio-system namespace
    - "istio-system/*"
```

```bash
# Apply the sidecar configuration
kubectl apply -f sidecar-config.yaml
```

## Step 5: Verify Sidecar Injection

After enabling injection and restarting pods, verify the sidecar is running:

```bash
# For a single-container application pod, READY should show 2/2 (app + istio-proxy)
kubectl get pods -n my-app

# Expected output shows READY 2/2 for injected pods:
# NAME                      READY   STATUS    RESTARTS   AGE
# my-app-xxxxxxxxx-xxxxx    2/2     Running   0          1m

# Describe a pod to see the sidecar container details
kubectl describe pod my-app-xxxxxxxxx-xxxxx -n my-app | grep -A5 "istio-proxy"

# Check the sidecar proxy logs
kubectl logs my-app-xxxxxxxxx-xxxxx -n my-app -c istio-proxy
```

## Step 6: Restart Existing Pods to Apply Injection

Existing pods must be restarted to get the sidecar injected:

```bash
# Rolling restart of a deployment to trigger sidecar injection
kubectl rollout restart deployment/my-app -n my-app

# Monitor the rollout
kubectl rollout status deployment/my-app -n my-app

# For a DaemonSet
kubectl rollout restart daemonset/my-daemonset -n my-app
```

## Configuring Injection in Rancher UI

Rancher's UI also lets you enable Istio auto-injection for a namespace:

1. Click **☰ > Cluster Management**
2. Open your cluster and click **Explore**
3. Go to **Cluster > Projects/Namespaces**
4. Find the namespace and select **⋮ > Enable Istio Auto Injection**

## Troubleshooting Injection Issues

```bash
# Check whether Istio would inject a sidecar for a workload
istioctl experimental check-inject -n my-app deploy/my-app

# List mutating webhook configurations and identify the Istio injector for your installation
kubectl get mutatingwebhookconfigurations

# Inspect the injector webhook configuration (for example, istio-sidecar-injector
# or a revision/tag-specific webhook)
kubectl get mutatingwebhookconfiguration <your-istio-webhook-name> -o yaml

# Verify the webhook is targeting the correct namespaces
kubectl get mutatingwebhookconfiguration <your-istio-webhook-name> \
  -o jsonpath='{.webhooks[0].namespaceSelector}'

# Check Istiod logs for injection errors
kubectl logs -n istio-system -l app=istiod --tail=50
```

## Conclusion

Configuring Istio sidecar injection properly is fundamental to getting value from the service mesh. By using namespace-level labels for broad application and pod-level labels for exceptions, you have precise control over which workloads participate in the mesh. Always restart pods after enabling injection to ensure all running workloads have the sidecar proxy deployed.
