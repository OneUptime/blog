# How to Debug Istio Control Plane Issues with Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Debugging, Control Plane, Istiod, Kubernetes

Description: A practical troubleshooting guide for using Istio control plane logs to diagnose configuration distribution failures, certificate issues, and service discovery problems.

---

When something goes wrong in your Istio mesh, the symptoms show up in the data plane, but the root cause is often in the control plane. Maybe configurations aren't being pushed to proxies, certificates aren't being issued, or services aren't being discovered. Istiod logs are your primary tool for diagnosing these problems, and knowing how to read them effectively can save you hours of guesswork.

## Getting Started: Check the Basics

Before diving into debug logs, check the basic health of the control plane:

```bash
# Is Istiod running?
kubectl get pods -n istio-system -l app=istiod

# Check Istiod's own logs for obvious errors
kubectl logs -n istio-system deploy/istiod --tail=100 | grep -i "error\|warn\|fatal"

# Check the sync status of all proxies
istioctl proxy-status
```

The `istioctl proxy-status` output is your first clue. If proxies show `STALE`, it means they haven't received the latest configuration from Istiod. If they show `NOT SENT`, Istiod may not even know about them.

```
NAME                                  CLUSTER        CDS        LDS        EDS        RDS        ECDS        ISTIOD
my-pod.my-namespace                   Kubernetes     SYNCED     SYNCED     SYNCED     SYNCED                  istiod-abc123
```

## Debugging Configuration Distribution

The most common control plane issue is configuration not reaching proxies. Enable the `ads` scope on Istiod:

```bash
kubectl exec -n istio-system deploy/istiod -- \
  curl -s -XPUT "localhost:8080/scopej/ads" -d '{"output_level":"debug"}'
```

Then watch the logs:

```bash
kubectl logs -n istio-system deploy/istiod -f | grep -i "push\|xds\|ads"
```

You'll see messages about configuration pushes. Look for:

```
# Healthy push
info	ads	Push debounce stable 5 for: config ServiceEntry/default/my-service, 100ms since last change

# Push to specific proxy
debug	ads	CDS: PUSH for node:my-pod.my-namespace resources:25

# Push error
error	ads	XDS:my-pod.my-namespace~10.0.1.5 Error sending config: connection reset
```

If pushes are happening but the proxy reports STALE, the issue might be network connectivity between Istiod and the proxy. Check:

```bash
# Verify the proxy can reach Istiod
kubectl exec my-pod -n my-namespace -c istio-proxy -- \
  curl -s "http://istiod.istio-system.svc:15014/debug/connections"
```

## Debugging Certificate Issues

Certificate problems manifest as mTLS failures between services. Enable debug logging for certificate-related scopes:

```bash
kubectl exec -n istio-system deploy/istiod -- \
  curl -s -XPUT "localhost:8080/scopej/ca" -d '{"output_level":"debug"}'
```

Common certificate issues and what they look like in the logs:

**CA not signing certificates:**
```bash
kubectl logs -n istio-system deploy/istiod | grep -i "ca\|cert\|sign"
```

Look for errors like:
```
error	Failed to sign certificate: ca certificate has expired
error	SDS: failed to generate secret for proxy: authentication failure
```

**Certificate rotation failures:**
```bash
kubectl logs -n istio-system deploy/istiod -f | grep -i "rotation\|renew\|expire"
```

**Checking the CA certificate itself:**
```bash
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | base64 -d | openssl x509 -text -noout
```

## Debugging Service Discovery

When services aren't being discovered or endpoints are wrong, the `model` scope is what you need:

```bash
kubectl exec -n istio-system deploy/istiod -- \
  curl -s -XPUT "localhost:8080/scopej/model" -d '{"output_level":"debug"}'
```

Check what services Istiod knows about:

```bash
# List all services in Istiod's registry
kubectl exec -n istio-system deploy/istiod -- \
  curl -s "localhost:15014/debug/registryz" | python3 -m json.tool | head -100

# Check endpoints for a specific service
kubectl exec -n istio-system deploy/istiod -- \
  curl -s "localhost:15014/debug/endpointz?servicePort=8080" | python3 -m json.tool
```

If a service is missing from the registry, check that the Kubernetes service and endpoints exist:

```bash
kubectl get svc my-service -n my-namespace
kubectl get endpoints my-service -n my-namespace
```

## Debugging Webhook Issues

Istiod runs validation and mutation webhooks. When these fail, you'll see errors during resource creation. Check the webhook logs:

```bash
kubectl logs -n istio-system deploy/istiod | grep -i "webhook\|validation\|inject"
```

Common webhook issues:

```
# Injection webhook failing
error	Failed to inject sidecar: template error: ...

# Validation webhook rejecting config
warn	validation failed: VirtualService my-vs: spec.hosts is required
```

To check webhook configuration:

```bash
kubectl get mutatingwebhookconfigurations -l app=sidecar-injector
kubectl get validatingwebhookconfigurations -l app=istiod
```

## Debugging Memory and Performance Issues

Istiod can become overwhelmed in large clusters. Check resource usage:

```bash
kubectl top pods -n istio-system

# Check Istiod's internal metrics
kubectl exec -n istio-system deploy/istiod -- \
  curl -s "localhost:15014/metrics" | grep pilot_xds
```

Key metrics to watch:

```bash
# Number of connected proxies
kubectl exec -n istio-system deploy/istiod -- \
  curl -s "localhost:15014/metrics" | grep "pilot_xds_pushes"

# Push time
kubectl exec -n istio-system deploy/istiod -- \
  curl -s "localhost:15014/metrics" | grep "pilot_proxy_convergence_time"

# Configuration errors
kubectl exec -n istio-system deploy/istiod -- \
  curl -s "localhost:15014/metrics" | grep "pilot_total_xds_rejects"
```

If push times are high or you're seeing rejects, Istiod might be under too much load. In the logs, you'll see:

```
warn	ads	Push debounce stable, delay exceeded max: 5s
```

## Using Istiod Debug Endpoints

Istiod exposes several debug endpoints that complement the logs:

```bash
# View the configuration for a specific proxy
kubectl exec -n istio-system deploy/istiod -- \
  curl -s "localhost:15014/debug/config_dump?proxyID=my-pod.my-namespace"

# View all xDS connections
kubectl exec -n istio-system deploy/istiod -- \
  curl -s "localhost:15014/debug/adsz" | python3 -m json.tool

# View the internal service registry
kubectl exec -n istio-system deploy/istiod -- \
  curl -s "localhost:15014/debug/registryz" | python3 -m json.tool

# View the internal EDS registry
kubectl exec -n istio-system deploy/istiod -- \
  curl -s "localhost:15014/debug/edsz" | python3 -m json.tool
```

## A Systematic Debugging Approach

When you hit a control plane issue, here's the process I follow:

1. Check `istioctl proxy-status` for overall sync state
2. Look at recent Istiod logs for obvious errors
3. Enable debug logging on the relevant scope
4. Check Istiod's debug endpoints for internal state
5. Compare what Istiod thinks it should push vs. what the proxy received
6. Check network connectivity between Istiod and the affected proxy

For step 5, comparing configurations:

```bash
# What Istiod is sending
istioctl proxy-config all my-pod -n my-namespace -o json > istiod-view.json

# What the proxy actually has
kubectl exec my-pod -n my-namespace -c istio-proxy -- \
  curl -s "localhost:15000/config_dump" > proxy-view.json

# Compare
diff <(python3 -m json.tool istiod-view.json) <(python3 -m json.tool proxy-view.json)
```

## Cleaning Up

Always remember to reset debug logging when you're done:

```bash
kubectl exec -n istio-system deploy/istiod -- \
  curl -s -XPUT "localhost:8080/scopej/ads" -d '{"output_level":"info"}'

kubectl exec -n istio-system deploy/istiod -- \
  curl -s -XPUT "localhost:8080/scopej/model" -d '{"output_level":"info"}'

kubectl exec -n istio-system deploy/istiod -- \
  curl -s -XPUT "localhost:8080/scopej/ca" -d '{"output_level":"info"}'
```

Control plane debugging with logs is an essential skill for anyone running Istio. The combination of scoped debug logging and the debug endpoints gives you deep visibility into what the control plane is doing. The key is knowing which scope to enable for which type of problem, and that comes with practice.
