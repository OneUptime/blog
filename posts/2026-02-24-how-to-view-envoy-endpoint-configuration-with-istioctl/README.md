# How to View Envoy Endpoint Configuration with istioctl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Endpoint, Istioctl, Kubernetes, Load Balancing

Description: Learn how to inspect Envoy endpoint configuration in Istio to debug service discovery, health checking, and load balancing across pod instances.

---

Endpoints are the final piece of the Envoy routing puzzle. After a request matches a listener, gets routed through a virtual host, and selects a cluster, Envoy needs to pick an actual backend IP and port to send the request to. Those IPs and ports are the endpoints. If a service has three ready pods for a port, the cluster for that service will usually have three endpoints.

When requests fail with 503 errors or traffic isn't distributed as expected, checking endpoints tells you which backends Envoy sees and whether they're healthy.

## Viewing Endpoints

```bash
istioctl proxy-config endpoints productpage-v1-abc123.default
```

The output shows every endpoint for every cluster. On a busy mesh, this can be thousands of lines. Filter by cluster:

```bash
istioctl pc endpoints productpage-v1-abc123.default \
  --cluster "outbound|9080||reviews.default.svc.cluster.local"
```

```text
ENDPOINT             STATUS      OUTLIER CHECK   CLUSTER
10.244.0.15:9080     HEALTHY     OK              outbound|9080||reviews.default.svc.cluster.local
10.244.0.16:9080     HEALTHY     OK              outbound|9080||reviews.default.svc.cluster.local
10.244.0.17:9080     HEALTHY     OK              outbound|9080||reviews.default.svc.cluster.local
```

For subset-specific endpoints:

```bash
istioctl pc endpoints productpage-v1-abc123.default \
  --cluster "outbound|9080|v1|reviews.default.svc.cluster.local"
```

```text
ENDPOINT             STATUS      OUTLIER CHECK   CLUSTER
10.244.0.15:9080     HEALTHY     OK              outbound|9080|v1|reviews.default.svc.cluster.local
```

## Understanding the Output Columns

### ENDPOINT

The IP address and port of the backend pod. These should match the pod IPs you see in Kubernetes:

```bash
kubectl get pods -n default -l app=reviews -o wide
```

If the endpoint IPs don't match the pod IPs, there might be a service discovery issue. This can happen if the Kubernetes EndpointSlice data is stale or if there's a network overlay problem.

### STATUS

Possible values:

- **HEALTHY** - The endpoint is ready to receive traffic. This is the normal state.
- **UNHEALTHY** - The endpoint is marked unhealthy, either by health checking or by health information delivered through EDS. Envoy won't send traffic to it.
- **DRAINING** - The endpoint is being gracefully removed. Envoy will finish existing requests but won't send new ones.
- **TIMEOUT** - Health check timed out. Similar to UNHEALTHY.
- **DEGRADED** - The endpoint is degraded. Envoy can use degraded hosts when there are not enough healthy hosts, depending on the load balancing configuration.

### OUTLIER CHECK

This reflects the outlier detection status:

- **OK** - No issues detected.
- **FAILED** - The endpoint has been ejected by the outlier detector. This can happen when the endpoint returns too many errors within the configured interval.

An endpoint can be HEALTHY but have a FAILED outlier check. In that case, Envoy temporarily removes it from the load balancing pool. After the ejection time passes, Envoy tries the endpoint again.

## JSON Output for More Details

```bash
istioctl pc endpoints productpage-v1-abc123.default \
  --cluster "outbound|9080||reviews.default.svc.cluster.local" -o json
```

```json
[
  {
    "name": "outbound|9080||reviews.default.svc.cluster.local",
    "addedViaApi": true,
    "hostStatuses": [
      {
        "address": {
          "socketAddress": {
            "address": "10.244.0.15",
            "portValue": 9080
          }
        },
        "stats": [
          { "name": "cx_connect_fail", "value": "0" },
          { "name": "cx_total", "value": "142" },
          { "name": "rq_error", "value": "0" },
          { "name": "rq_success", "value": "285" },
          { "name": "rq_timeout", "value": "0" },
          { "name": "rq_total", "value": "285" }
        ],
        "healthStatus": {
          "edsHealthStatus": "HEALTHY"
        },
        "weight": 1,
        "locality": {
          "region": "us-east-1",
          "zone": "us-east-1a"
        }
      }
    ]
  }
]
```

The JSON output includes per-endpoint stats (connection counts, request counts, errors), locality information (for geo-aware load balancing), and weights.

## Debugging 503 Errors: No Healthy Endpoints

A common cause of 503 errors in Istio is having no healthy endpoints for a cluster. Check:

```bash
istioctl pc endpoints my-pod.default \
  --cluster "outbound|8080||target-service.default.svc.cluster.local"
```

If the output is empty, there are no endpoints at all. This means either:

1. No pods match the service selector
2. The pods aren't ready (readiness probe failing)
3. The endpoint discovery hasn't propagated yet

Check the Kubernetes EndpointSlices:

```bash
kubectl get endpointslice -n default \
  -l kubernetes.io/service-name=target-service
```

If Kubernetes has ready endpoints but Envoy doesn't, there's a sync issue with Istiod. Check `istioctl proxy-status` for STALE indicators.

If endpoints are being ejected by outlier detection:

```bash
ENDPOINT             STATUS       OUTLIER CHECK   CLUSTER
10.244.0.15:8080     HEALTHY      FAILED          outbound|8080||target.default.svc.cluster.local
10.244.0.16:8080     HEALTHY      FAILED          outbound|8080||target.default.svc.cluster.local
```

The backend pods may be returning too many errors, or the outlier detection policy may be too aggressive. Check the pods:

```bash
kubectl get pods -n default -l app=target-service
kubectl logs target-service-abc123 -n default --tail=20
```

If the pods are running fine but outlier detection is ejecting them, adjust the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: target-dr
spec:
  host: target-service.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 10      # More tolerant (default is 5)
      interval: 30s
      baseEjectionTime: 15s         # Shorter ejection (default is 30s)
      maxEjectionPercent: 30        # Never eject more than 30%
```

## Debugging Subset Endpoints

If you're using DestinationRule subsets and a subset has no endpoints:

```bash
istioctl pc endpoints my-pod.default \
  --cluster "outbound|9080|v2|reviews.default.svc.cluster.local"
```

Empty results mean no pods match the subset's label selector. Check that pods with the right labels exist:

```bash
kubectl get pods -n default -l app=reviews,version=v2
```

If there are no pods with `version=v2`, the subset is valid but has no backing instances. Deploy pods with the matching label or fix the subset selector in the DestinationRule.

## Locality-Aware Load Balancing

The JSON output shows locality information for each endpoint:

```json
"locality": {
  "region": "us-east-1",
  "zone": "us-east-1a"
}
```

Istio uses this for locality-aware load balancing. If configured, Envoy prefers endpoints in the same zone/region as the calling pod. Check endpoints across zones:

```bash
istioctl pc endpoints my-pod.default \
  --cluster "outbound|9080||reviews.default.svc.cluster.local" -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for cluster in data:
    for host in cluster.get('hostStatuses', []):
        addr = host['address']['socketAddress']
        loc = host.get('locality', {})
        status = host.get('healthStatus', {}).get('edsHealthStatus', 'unknown')
        print(f\"{addr['address']}:{addr['portValue']} - {loc.get('region','')}/{loc.get('zone','')} - {status}\")
"
```

## Endpoint Weights

By default, all endpoints have equal weight. Envoy EDS can assign different per-endpoint weights, although Istio subset traffic weights are usually configured in a VirtualService and applied at the route level. Check the weight field in the JSON:

```json
"weight": 1
```

If you're using weighted subsets, the weight distribution happens at the route level (via weighted clusters), not at the endpoint level. Endpoint weights are for cases where individual pods should get different traffic shares, which is less common.

## Comparing Endpoints with Kubernetes

A useful sanity check is comparing what Envoy sees with what Kubernetes has:

```bash
# What Kubernetes knows

kubectl get endpointslice -n default -l kubernetes.io/service-name=reviews -o json | \
  python3 -c "import sys,json; d=json.load(sys.stdin); [print(f\"{addr}:{p['port']}\") for item in d.get('items',[]) for e in item.get('endpoints',[]) if e.get('conditions',{}).get('ready', True) for addr in e.get('addresses',[]) for p in item.get('ports',[])]"

# What Envoy knows
istioctl pc endpoints my-pod.default \
  --cluster "outbound|9080||reviews.default.svc.cluster.local" -o json | \
  python3 -c "import sys,json; d=json.load(sys.stdin); [print(f\"{h['address']['socketAddress']['address']}:{h['address']['socketAddress']['portValue']}\") for c in d for h in c.get('hostStatuses',[])]"
```

If these don't match, there's a propagation delay or sync issue.

## Stale Endpoints

After scaling down a deployment, endpoints should be removed. If stale endpoints persist:

```bash
istioctl pc endpoints my-pod.default \
  --cluster "outbound|9080||reviews.default.svc.cluster.local"
```

If you see IPs of pods that no longer exist, check if the Kubernetes EndpointSlices updated:

```bash
kubectl get endpointslice -n default \
  -l kubernetes.io/service-name=reviews
```

If Kubernetes EndpointSlices are correct but Envoy still has stale entries, it's an Istiod sync issue. Check proxy-status and Istiod logs.

## Summary

Endpoints are where the rubber meets the road in Envoy's traffic handling. They tell you exactly which backends are available, whether they're healthy, and how many requests each one has handled. When services return 503 errors, endpoints are almost always the first thing to check. Combine endpoint inspection with cluster and route debugging for a complete picture of your traffic flow.
