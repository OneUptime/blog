# How to Configure Load Balancing Policies in DestinationRule

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DestinationRule, Load Balancing, Kubernetes, Traffic Management

Description: A practical guide to configuring different load balancing policies in Istio DestinationRule for optimal traffic distribution.

---

Istio gives you control over how traffic is distributed across your service instances, and the DestinationRule is where you configure that. By default, Istio uses least request load balancing, but depending on your use case, you might want something different - round robin, random distribution, or hash-based sticky routing.

The `trafficPolicy.loadBalancer` field in a DestinationRule is where all load balancing configuration lives. There are two main categories: simple algorithms and consistent hash-based algorithms.

## The Simple Load Balancing Algorithms

Istio provides four simple load balancing options through the `simple` field:

| Algorithm | Value | Description |
|-----------|-------|-------------|
| Round Robin | `ROUND_ROBIN` | Distributes requests to each instance in order |
| Random | `RANDOM` | Picks a random instance for each request |
| Least Request | `LEAST_REQUEST` | Sends to the instance with fewest active requests |
| Passthrough | `PASSTHROUGH` | Connects directly to the original destination (no load balancing) |

Here is how you set each one:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-lb
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
```

Just swap `ROUND_ROBIN` with any of the other values. No other configuration needed for simple algorithms.

## When to Use Which Algorithm

**ROUND_ROBIN** works best when your pods are roughly equal in capacity and your requests are roughly equal in cost. Istio generally recommends least request as the safer default, but round robin can still be useful when you explicitly want sequential distribution.

**RANDOM** is similar to round robin in practice, but it picks a random healthy host for each request. Istio notes that random can perform better than round robin when no health checking policy is configured.

**LEAST_REQUEST** is great when requests have unequal processing times. If some requests take 10ms and others take 500ms, round robin could pile up slow requests on one pod while another sits idle. Least request adapts to actual load.

**PASSTHROUGH** is a special case. It disables load balancing entirely and connects to the address the client originally specified. You would use this for things like external services where you do not want Envoy to load balance.

## Consistent Hash Load Balancing

The other option is consistent hash-based load balancing, which gives soft session affinity by sending requests with the same hash key to the same backend while the endpoint set stays stable. Affinity can change when backends are added or removed.

You can hash on several things:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-hash
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
```

The available hash keys are:

- `httpHeaderName` - Hash based on a specific HTTP header
- `httpCookie` - Hash based on an HTTP cookie (Istio can set the cookie for you)
- `useSourceIp` - Hash based on the client's source IP
- `httpQueryParameterName` - Hash based on a query parameter

Here is the cookie-based example, which is particularly useful because Istio can create the cookie automatically:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-cookie
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpCookie:
          name: my-session
          ttl: 3600s
```

If the client does not send a cookie named `my-session`, Envoy will generate one in the response with a 1-hour TTL.

## Applying Load Balancing Per Subset

You might want different load balancing for different subsets of a service. For example, your stable version uses round robin, but your canary version uses least request:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-subsets
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
  subsets:
  - name: stable
    labels:
      version: v1
  - name: canary
    labels:
      version: v2
    trafficPolicy:
      loadBalancer:
        simple: LEAST_REQUEST
```

The canary subset overrides the top-level policy. The stable subset inherits round robin from the top level.

## Verifying the Load Balancing Policy

You can confirm that Envoy picked up your load balancing configuration:

```bash
istioctl proxy-config cluster <pod-name> --fqdn my-service.default.svc.cluster.local -o json
```

In the output, look for the `lbPolicy` field. It should reflect what you configured. For round robin you will see `ROUND_ROBIN`, for random it will show `RANDOM`, and so on.

For consistent hash, the output is a bit more complex. You will see `RING_HASH` by default, or `MAGLEV` if you configured Maglev, plus additional hash configuration.

## Testing Load Balancing Behavior

A simple way to test is to deploy a client pod and send a bunch of requests:

```bash
kubectl run curl-test --image=curlimages/curl --rm -it -- sh
```

Then inside the pod:

```bash
for i in $(seq 1 100); do
  curl -s http://my-service/headers | grep -i hostname
done
```

With round robin, you should see roughly equal distribution. With random, it will be close but not exactly equal. With least request, the distribution depends on response times.

## Performance Considerations

Most load balancing algorithms have negligible overhead. Round robin, random, and passthrough are all O(1) per request. Least request requires tracking active request counts per endpoint, which adds a small amount of state.

Consistent hash algorithms (ring hash and maglev) have higher memory overhead because they maintain extra lookup structures. If you have thousands of endpoints, the ring hash table can get large. You can control the ring size with `ringHash.minimumRingSize`:

```yaml
trafficPolicy:
  loadBalancer:
    consistentHash:
      httpHeaderName: x-user-id
      ringHash:
        minimumRingSize: 1024
```

The default minimum ring size is 1024. Larger values give better distribution but use more memory.

## A Word About PASSTHROUGH

The `PASSTHROUGH` algorithm is different from the others. It does not load balance at all - it sends the request to the IP address that the application originally resolved. This is useful when you are sending traffic to an external service registered in Istio, such as with a ServiceEntry, and you want DNS resolution to handle the load balancing, or when you are using headless services and want the client to pick a specific pod.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-service
spec:
  host: external-api.example.com
  trafficPolicy:
    loadBalancer:
      simple: PASSTHROUGH
```

## Summary

Load balancing in Istio is configured through the DestinationRule's trafficPolicy. For most services, the default least request policy works fine. Switch to round robin when you explicitly want sequential distribution, use random when a random healthy-host choice fits your workload, and use consistent hash when you need soft session stickiness. You can also apply different policies per subset to fine-tune behavior for different versions of your services.
