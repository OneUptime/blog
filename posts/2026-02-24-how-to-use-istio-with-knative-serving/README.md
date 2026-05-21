# How to Use Istio with Knative Serving

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Knative, Serverless, Kubernetes, Service Mesh

Description: How to set up and configure Istio as the networking layer for Knative Serving to get serverless workloads with full service mesh capabilities.

---

Knative Serving provides serverless capabilities on Kubernetes, allowing your applications to scale to zero and scale up on demand. Istio can serve as the networking layer for Knative, giving you traffic management, observability, and security for your serverless workloads. Getting the two to work together takes some configuration, but the result is a powerful combination.

## Prerequisites

Before setting up the integration, you need:

- A Kubernetes cluster supported by your Knative and Istio releases
- Istio installed with `istioctl`
- Sufficient cluster resources for both Istio and Knative components

Make sure Istio is installed and running:

```bash
istioctl version
kubectl get pods -n istio-system
```

## Installing Knative Serving with Istio

Install the Knative Serving core components:

```bash
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.22.0/serving-crds.yaml
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.22.0/serving-core.yaml
```

Then install the Istio networking layer for Knative:

```bash
kubectl apply -f https://github.com/knative-extensions/net-istio/releases/download/knative-v1.22.0/net-istio.yaml
kubectl patch configmap/config-network \
  --namespace knative-serving \
  --type merge \
  --patch '{"data":{"ingress-class":"istio.ingress.networking.knative.dev"}}'
```

Verify everything is running:

```bash
kubectl get pods -n knative-serving
```

You should see pods for the controller, activator, autoscaler, and the net-istio controller:

```text
NAME                                     READY   STATUS    RESTARTS   AGE
activator-abc123-xyz                     1/1     Running   0          1m
autoscaler-def456-xyz                    1/1     Running   0          1m
controller-ghi789-xyz                    1/1     Running   0          1m
net-istio-controller-jkl012-xyz          1/1     Running   0          1m
net-istio-webhook-mno345-xyz             1/1     Running   0          1m
```

## Configuring the Knative Gateway

Knative uses Istio Gateways for external access. By default, it creates a gateway in the `knative-serving` namespace. You can configure which Istio gateway to use:

```bash
kubectl get gateway -n knative-serving
```

To customize the gateway configuration, edit the `config-istio` ConfigMap:

```bash
kubectl edit configmap config-istio -n knative-serving
```

Or apply it declaratively:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-istio
  namespace: knative-serving
data:
  external-gateways: |
    - name: knative-ingress-gateway
      namespace: knative-serving
      service: istio-ingressgateway.istio-system.svc.cluster.local
  local-gateways: |
    - name: knative-local-gateway
      namespace: knative-serving
      service: knative-local-gateway.istio-system.svc.cluster.local
```

The `external-gateways` setting controls external traffic, and `local-gateways` controls cluster-internal traffic.

## Creating a Local Gateway

For mesh-internal (cluster-local) traffic, you may need a local gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: knative-local-gateway
  namespace: knative-serving
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 8081
      name: http
      protocol: HTTP
    hosts:
    - "*"
---
apiVersion: v1
kind: Service
metadata:
  name: knative-local-gateway
  namespace: istio-system
  labels:
    networking.knative.dev/ingress-provider: istio
spec:
  type: ClusterIP
  selector:
    istio: ingressgateway
  ports:
  - name: http2
    port: 80
    targetPort: 8081
  - name: https
    port: 443
    targetPort: 8444
```

This setup reuses the existing Istio ingress gateway pods for local traffic. Alternatively, you can create a separate gateway deployment and configure the ConfigMap appropriately.

## Deploying a Knative Service

Create a simple Knative service:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello
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
kubectl apply -f hello-service.yaml
```

Check the service:

```bash
kubectl get ksvc hello
```

```text
NAME    URL                                     LATESTCREATED   LATESTREADY     READY   REASON
hello   http://hello.default.example.com        hello-00001     hello-00001     True
```

## Configuring DNS

For external access, you need DNS configured. The simplest approach for testing is to use the magic DNS domain:

```bash
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.22.0/serving-default-domain.yaml
```

This sets up `sslip.io` as the default domain. For production, configure a real domain in the `config-domain` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-domain
  namespace: knative-serving
data:
  myapp.example.com: ""
```

## Traffic Splitting with Knative and Istio

Knative has its own traffic splitting that works on top of Istio. When you deploy a new revision, you can split traffic between revisions:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: hello
  namespace: default
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"
    spec:
      containers:
      - image: gcr.io/knative-samples/helloworld-go
        env:
        - name: TARGET
          value: "Knative v2"
  traffic:
  - revisionName: hello-00001
    percent: 80
  - latestRevision: true
    percent: 20
```

Knative translates this into Istio VirtualService rules automatically. You can see the generated VirtualService:

```bash
kubectl get vs -n default -l serving.knative.dev/service=hello -o yaml
```

The VirtualService will have weighted routing rules matching the traffic split you defined.

## Enabling mTLS for Knative Services

Since Istio is the networking layer, you can enable mutual TLS for Knative services. Make sure the Knative system pods get sidecars, then apply a PeerAuthentication policy for the Knative system namespace:

```bash
kubectl label namespace knative-serving istio-injection=enabled
```

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: knative-serving
spec:
  mtls:
    mode: PERMISSIVE
```

Using PERMISSIVE mode is important if the Knative activator is not injected with an Istio sidecar. If you set STRICT mode while the activator can still be in the request path without a sidecar, requests forwarded through the activator will be rejected.

## Authorization Policies for Knative

You can apply Istio AuthorizationPolicies to Knative services:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: hello-policy
  namespace: default
spec:
  selector:
    matchLabels:
      serving.knative.dev/service: hello
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["frontend", "knative-serving"]
    to:
    - operation:
        methods: ["GET"]
```

This restricts access to the `hello` Knative service to GET requests from the `frontend` namespace while still allowing requests forwarded through Knative system pods in the `knative-serving` namespace.

## Observability

With Istio handling the networking, you get full observability for Knative services:

```bash
# Check metrics

istioctl dashboard prometheus

# Check traces
istioctl dashboard jaeger

# Check service graph
istioctl dashboard kiali
```

Knative services show up in the Istio service graph just like regular services. You can see request rates, error rates, and latencies for each revision.

## Troubleshooting

If Knative services aren't accessible, check the Istio ingress gateway:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

Make sure it has an external IP. Then check the Knative-generated gateway and VirtualService:

```bash
kubectl get gateway -n knative-serving
kubectl get vs -A -l networking.internal.knative.dev/ingress!=
```

If services aren't scaling correctly, check the activator logs:

```bash
kubectl logs -n knative-serving -l app=activator --tail=50
```

And the autoscaler:

```bash
kubectl logs -n knative-serving -l app=autoscaler --tail=50
```

The combination of Istio and Knative gives you serverless scaling with enterprise-grade traffic management and security. The key is getting the gateway configuration right and understanding how Knative maps its routing concepts onto Istio resources.
