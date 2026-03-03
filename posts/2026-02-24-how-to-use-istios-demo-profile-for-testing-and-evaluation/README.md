# How to Use Istio's Demo Profile for Testing and Evaluation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Demo Profile, Kubernetes, Testing, Service Mesh

Description: How to use Istio's demo installation profile for testing and evaluation, including all installed components and practical exercises.

---

The demo profile is Istio's "batteries included" installation option. It installs every major component with relaxed resource requirements, making it perfect for testing features, running through tutorials, or evaluating whether Istio is right for your project. It's not meant for production, but for learning and experimenting, nothing beats it.

## What the Demo Profile Installs

The demo profile gives you:

- **istiod** - The control plane with relaxed resource limits
- **Ingress gateway** - For external traffic coming in
- **Egress gateway** - For controlling outbound traffic
- **Higher trace sampling** - 100% of traces are captured by default
- **Access logging** - Enabled with detailed output

Compare this to the default profile, which skips the egress gateway and uses lower trace sampling.

Dump the full demo profile to see every setting:

```bash
istioctl profile dump demo
```

## Installing the Demo Profile

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.24.0
export PATH=$PWD/bin:$PATH
```

```bash
istioctl install --set profile=demo -y
```

Wait for everything to start:

```bash
kubectl get pods -n istio-system -w
```

You should see three deployments:

```text
NAME                                    READY   STATUS    RESTARTS   AGE
istio-egressgateway-7f4bc6d8b-xxxxx    1/1     Running   0          60s
istio-ingressgateway-5d6b8c5f5-xxxxx   1/1     Running   0          60s
istiod-7f4c8d6b9-xxxxx                 1/1     Running   0          75s
```

## Install the Observability Addons

The demo profile works best with the full observability stack. Install all the addons:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
kubectl apply -f samples/addons/kiali.yaml
kubectl apply -f samples/addons/jaeger.yaml
```

Wait for them:

```bash
kubectl rollout status deployment/prometheus -n istio-system
kubectl rollout status deployment/grafana -n istio-system
kubectl rollout status deployment/kiali -n istio-system
kubectl rollout status deployment/jaeger -n istio-system
```

## Deploy the Bookinfo Sample Application

Enable sidecar injection and deploy Bookinfo:

```bash
kubectl label namespace default istio-injection=enabled
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
```

Wait for all pods to show 2/2:

```bash
kubectl get pods -w
```

Apply the networking resources:

```bash
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
kubectl apply -f samples/bookinfo/networking/destination-rule-all.yaml
```

## Exercise 1: Traffic Routing

One of the most powerful Istio features is traffic routing. Route all traffic for the reviews service to v1:

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
```

```bash
kubectl apply -f samples/bookinfo/networking/virtual-service-all-v1.yaml
```

Now every request to the reviews service goes to v1 (no star ratings). Test by hitting the product page multiple times - you should always see the same version.

Switch to sending traffic to v2 for a specific user:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews
spec:
  hosts:
    - reviews
  http:
    - match:
        - headers:
            end-user:
              exact: jason
      route:
        - destination:
            host: reviews
            subset: v2
    - route:
        - destination:
            host: reviews
            subset: v1
```

```bash
kubectl apply -f samples/bookinfo/networking/virtual-service-reviews-test-v2.yaml
```

Log in as "jason" on the Bookinfo product page, and you'll see v2 (black star ratings). Everyone else sees v1.

## Exercise 2: Fault Injection

Test your application's resilience by injecting a delay:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ratings
spec:
  hosts:
    - ratings
  http:
    - match:
        - headers:
            end-user:
              exact: jason
      fault:
        delay:
          percentage:
            value: 100.0
          fixedDelay: 7s
      route:
        - destination:
            host: ratings
            subset: v1
    - route:
        - destination:
            host: ratings
            subset: v1
```

```bash
kubectl apply -f samples/bookinfo/networking/virtual-service-ratings-test-delay.yaml
```

When logged in as jason, the reviews service times out waiting for the ratings service. This exposes a hardcoded timeout in the application code - exactly the kind of thing you'd want to find before production.

## Exercise 3: Circuit Breaking

Create a DestinationRule with circuit breaker settings:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin-circuit-breaker
spec:
  host: httpbin
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 1
        http2MaxRequests: 1
    outlierDetection:
      consecutive5xxErrors: 1
      interval: 1s
      baseEjectionTime: 3m
      maxEjectionPercent: 100
```

Deploy httpbin to test:

```bash
kubectl apply -f samples/httpbin/httpbin.yaml
kubectl apply -f samples/sleep/sleep.yaml
```

Then use fortio to generate load and trip the circuit breaker:

```bash
kubectl exec deploy/sleep -- fortio load -c 3 -qps 0 -n 30 http://httpbin:8000/get
```

You'll see some requests succeed and others fail with 503 - that's the circuit breaker doing its job.

## Exercise 4: Observe the Mesh

With the demo profile's high trace sampling, every request is captured. Generate some traffic:

```bash
for i in $(seq 1 200); do
  curl -s -o /dev/null "http://$INGRESS_HOST/productpage"
done
```

Then open the dashboards:

```bash
# Service mesh topology
istioctl dashboard kiali

# Metrics and dashboards
istioctl dashboard grafana

# Distributed traces
istioctl dashboard jaeger
```

Kiali shows you a live graph of your services and the traffic flowing between them. Grafana has pre-built dashboards for mesh-wide metrics, service-level metrics, and workload-level metrics. Jaeger shows individual request traces through the mesh.

## Exercise 5: Egress Traffic Control

The demo profile includes an egress gateway, so you can test outbound traffic control:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - httpbin.org
  ports:
    - number: 443
      name: tls
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: external-api
spec:
  hosts:
    - httpbin.org
  tls:
    - match:
        - port: 443
          sniHosts:
            - httpbin.org
      route:
        - destination:
            host: httpbin.org
            port:
              number: 443
```

This routes external HTTPS traffic through the mesh, giving you visibility and control over outbound calls.

## Resource Usage of the Demo Profile

The demo profile uses minimal resources to fit on small clusters:

```bash
kubectl top pods -n istio-system
```

Typical resource usage:

| Component | CPU | Memory |
|-----------|-----|--------|
| istiod | 10-50m | 100-200 MB |
| Ingress GW | 10-30m | 50-100 MB |
| Egress GW | 5-10m | 40-80 MB |
| Each Sidecar | 5-20m | 40-60 MB |

Total overhead for the control plane is usually under 500 MB of RAM. Each sidecar adds about 50 MB per pod.

## Why Not Production

The demo profile is explicitly not for production because:

- Resource limits are too low for real traffic
- Trace sampling at 100% generates massive amounts of data
- The egress gateway adds complexity that most production setups handle differently
- Default settings prioritize visibility over performance

For production, switch to the default profile:

```bash
istioctl install --set profile=default -y
```

## Cleaning Up

Remove the sample apps:

```bash
kubectl delete -f samples/bookinfo/platform/kube/bookinfo.yaml
kubectl delete -f samples/bookinfo/networking/bookinfo-gateway.yaml
kubectl delete -f samples/bookinfo/networking/destination-rule-all.yaml
```

Remove the addons:

```bash
kubectl delete -f samples/addons/
```

Remove Istio:

```bash
istioctl uninstall --purge -y
kubectl delete namespace istio-system
kubectl label namespace default istio-injection-
```

The demo profile is the best way to get hands-on with Istio quickly. It gives you all the tools and features without requiring you to configure anything upfront. Spend some time with the exercises above, and you'll have a solid understanding of what Istio can do for your services.
