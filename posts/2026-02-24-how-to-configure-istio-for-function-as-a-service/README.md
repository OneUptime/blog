# How to Configure Istio for Function-as-a-Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Serverless, FaaS, Kubernetes, Knative, Service Mesh

Description: Learn how to configure Istio service mesh to work with Function-as-a-Service platforms like Knative on Kubernetes for better traffic management and observability.

---

Function-as-a-Service (FaaS) has changed how we think about deploying code. Instead of managing servers or even containers directly, you just write a function, deploy it, and the platform handles scaling, including scaling down to zero when nobody is calling your function. When you combine FaaS with Istio, you get the best of both worlds: the simplicity of serverless with the traffic management and observability that a service mesh provides.

In this guide, we will walk through setting up Istio to work with Knative, which is the most popular FaaS platform on Kubernetes.

## Prerequisites

Before we start, make sure you have:

- A Kubernetes cluster (1.25+)
- kubectl configured
- Helm 3 installed
- Istio 1.20+ installed on the cluster

If you do not have Istio installed yet, here is the quick way:

```bash
istioctl install --set profile=default -y
kubectl label namespace default istio-injection=enabled
```

## Installing Knative with Istio

Knative has two main components: Serving (for request-driven workloads) and Eventing (for event-driven workloads). We will focus on Serving here since that is the FaaS piece.

First, install the Knative Serving CRDs and core components:

```bash
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.13.0/serving-crds.yaml
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.13.0/serving-core.yaml
```

Next, install the Knative Istio controller, which tells Knative to use Istio for networking instead of its default:

```bash
kubectl apply -f https://github.com/knative/net-istio/releases/download/knative-v1.13.0/net-istio.yaml
```

Verify everything is running:

```bash
kubectl get pods -n knative-serving
```

You should see pods like `activator`, `autoscaler`, `controller`, `net-istio-controller`, and `webhook` all in Running state.

## Configuring the Istio Gateway for Knative

Knative creates its own Gateway resource in the `knative-serving` namespace. You can customize it by editing the Knative config:

```bash
kubectl edit configmap config-istio -n knative-serving
```

By default, Knative uses the `istio-ingressgateway` in the `istio-system` namespace. If you have a custom gateway, you can point to it:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-istio
  namespace: knative-serving
data:
  gateway.knative-serving.knative-ingress-gateway: "custom-gateway.istio-system.svc.cluster.local"
```

## Deploying Your First Serverless Function

Now let us deploy a simple function. With Knative, you create a `Service` resource (not to be confused with a Kubernetes Service):

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello-function
  namespace: default
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "10"
    spec:
      containers:
        - image: gcr.io/knative-samples/helloworld-go
          ports:
            - containerPort: 8080
          env:
            - name: TARGET
              value: "World"
```

Apply it:

```bash
kubectl apply -f hello-function.yaml
```

After a few seconds, check the status:

```bash
kubectl get ksvc hello-function
```

You will see a URL assigned to your function. That URL is routed through Istio's ingress gateway.

## Adding Istio Traffic Policies to Serverless Functions

One of the biggest benefits of running FaaS on Istio is that you can apply the same traffic policies you use for regular services. For example, you can add a retry policy:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: hello-function-vs
  namespace: default
spec:
  hosts:
    - hello-function.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: hello-function.default.svc.cluster.local
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx
```

You can also apply a DestinationRule for circuit breaking:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: hello-function-dr
  namespace: default
spec:
  host: hello-function.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

## Configuring Scale-to-Zero with Istio

Knative's scale-to-zero feature works by routing traffic through an activator component. When a function has zero replicas, the activator holds the request, triggers a scale-up, and forwards the request once a pod is ready.

Istio needs to be configured to allow enough time for this cold start. Edit the mesh config:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: hello-function-cold-start
  namespace: default
spec:
  hosts:
    - hello-function.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: hello-function.default.svc.cluster.local
      timeout: 30s
```

The 30-second timeout gives Knative enough room to spin up a pod from zero. Adjust this based on your function's cold start time.

You can also configure the Knative autoscaler settings:

```bash
kubectl edit configmap config-autoscaler -n knative-serving
```

Key settings to tune:

```yaml
data:
  scale-to-zero-grace-period: "30s"
  stable-window: "60s"
  scale-to-zero-pod-retention-period: "0s"
```

## Enabling mTLS for Serverless Functions

Since your functions run inside the mesh, you get mTLS for free. But you should verify it is actually working:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT
```

This ensures all traffic between your functions and other services in the namespace uses mutual TLS. You can verify with:

```bash
istioctl x describe pod <your-function-pod-name>
```

## Monitoring FaaS with Istio Telemetry

Istio automatically collects metrics for all traffic flowing through the mesh, including your serverless functions. If you have Prometheus and Grafana set up, you can query metrics like:

```text
istio_requests_total{destination_service="hello-function.default.svc.cluster.local"}
```

Or check latency percentiles:

```text
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="hello-function.default.svc.cluster.local"}[5m])) by (le))
```

These metrics are especially useful for FaaS because they help you understand cold start impact on your p99 latency.

## Troubleshooting Common Issues

A few things that commonly go wrong:

**Function times out on first request**: This is usually a cold start issue. Increase the timeout on your VirtualService and check the `scale-to-zero-grace-period` in Knative config.

**404 errors when calling the function**: Make sure the Host header matches what Knative expects. Knative routes based on the Host header, so if you are calling from outside the cluster, you need to set it correctly:

```bash
curl -H "Host: hello-function.default.example.com" http://<istio-ingress-ip>
```

**Sidecar injection not working**: Knative pods are created by the autoscaler dynamically. Make sure the namespace has the `istio-injection=enabled` label.

```bash
kubectl label namespace default istio-injection=enabled --overwrite
```

## Summary

Running FaaS on Istio gives you serverless simplicity with enterprise-grade traffic management. You get automatic retries, circuit breaking, mTLS, and full observability without writing any extra code. The key is making sure your timeouts account for cold starts and that your namespace has sidecar injection enabled. Once that is in place, your serverless functions behave just like any other service in the mesh.
