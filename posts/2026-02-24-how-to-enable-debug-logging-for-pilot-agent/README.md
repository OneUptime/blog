# How to Enable Debug Logging for Pilot-Agent

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Pilot-Agent, Logging, Debugging, Kubernetes

Description: A hands-on guide to enabling debug logging for the pilot-agent process in Istio sidecars to troubleshoot proxy bootstrap, certificate rotation, and health check issues.

---

Pilot-agent is one of those Istio components that doesn't get a lot of attention until something goes wrong with it. It runs inside every sidecar container alongside Envoy, and it handles a bunch of critical tasks: bootstrapping Envoy's configuration, managing certificate rotation, running health checks, and handling DNS proxying. When any of these things break, pilot-agent's logs are where you need to look.

## What Does Pilot-Agent Actually Do?

Before we get into the logging configuration, it helps to understand what pilot-agent is responsible for:

1. **Envoy Bootstrap**: It generates the initial Envoy bootstrap configuration and starts the Envoy process
2. **Certificate Management**: It handles requesting and rotating mTLS certificates from Istiod
3. **Health Probes**: It translates Kubernetes HTTP/TCP health probes into something that works with the Istio sidecar
4. **SDS (Secret Discovery Service)**: It serves certificates to Envoy through the SDS API
5. **DNS Proxying**: When enabled, it handles DNS resolution for the pod
6. **Readiness Probes**: It manages the sidecar's readiness state

## Checking Current Pilot-Agent Logs

First, let's see what pilot-agent is currently logging. Pilot-agent logs go to the same container as Envoy (the `istio-proxy` container), but you can distinguish them because they have a different format:

```bash
kubectl logs my-pod -n my-namespace -c istio-proxy | head -50
```

Pilot-agent log lines typically include timestamps and scope information, while Envoy logs have their own format with connection IDs and logger names.

## Enabling Debug Logging via Annotations

The most straightforward way to get debug logging from pilot-agent is through pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyMetadata:
            OUTPUT_LOG_LEVEL: "default:debug"
    spec:
      containers:
        - name: my-service
          image: my-service:v1
```

After applying this, restart the pods:

```bash
kubectl rollout restart deployment/my-service -n my-namespace
```

## Enabling Debug Logging via ProxyConfig

You can also use the ProxyConfig resource, which is a cleaner approach when you want to target specific workloads:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ProxyConfig
metadata:
  name: debug-logging
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-service
  environmentVariables:
    ISTIO_LOG_LEVEL: "default:debug"
```

Apply it:

```bash
kubectl apply -f proxyconfig.yaml
```

Then restart the affected pods to pick up the change.

## Global Debug Logging for Pilot-Agent

If you want every pilot-agent instance across the mesh to run at debug level, you can configure it through the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_LOG_LEVEL: "default:debug"
```

Or through Helm values:

```yaml
meshConfig:
  defaultConfig:
    proxyMetadata:
      ISTIO_LOG_LEVEL: "default:debug"
```

## Runtime Log Level Changes

Similar to Istiod, pilot-agent exposes a logging endpoint. You can change log levels at runtime without restarting the pod:

```bash
kubectl exec my-pod -n my-namespace -c istio-proxy -- \
  curl -s -XPUT "localhost:15004/logging?level=debug"
```

To check the current level:

```bash
kubectl exec my-pod -n my-namespace -c istio-proxy -- \
  curl -s "localhost:15004/logging"
```

Note that port 15004 is the pilot-agent debug port. It's different from port 15000 which is the Envoy admin port.

## Pilot-Agent Scopes

Just like Istiod, pilot-agent has logging scopes. The key ones are:

- `default` - General pilot-agent logging
- `ca` - Certificate authority and cert management
- `cache` - Secret caching
- `sds` - Secret Discovery Service
- `dns` - DNS proxy functionality

You can target specific scopes:

```bash
kubectl exec my-pod -n my-namespace -c istio-proxy -- \
  curl -s -XPUT "localhost:15004/logging?ca=debug"
```

## Debugging Common Pilot-Agent Issues

Here are specific scenarios where pilot-agent debug logging helps.

**Sidecar not becoming ready**: When a sidecar container stays in a not-ready state, it's usually a pilot-agent issue. Enable debug logging and look for:

```bash
kubectl logs my-pod -n my-namespace -c istio-proxy | grep -i "ready\|health\|probe"
```

Common causes include the pilot-agent not being able to reach Istiod, certificate provisioning failures, or Envoy not starting properly.

**Certificate rotation failures**: If mTLS is breaking periodically, it might be certificate rotation going wrong. Enable the `ca` and `sds` scopes:

```bash
kubectl exec my-pod -n my-namespace -c istio-proxy -- \
  curl -s -XPUT "localhost:15004/logging?ca=debug&sds=debug"
```

Then watch for certificate-related log messages:

```bash
kubectl logs my-pod -n my-namespace -c istio-proxy -f | grep -i "cert\|secret\|sds\|rotation"
```

**Envoy failing to start**: If Envoy keeps crashing or not starting, the pilot-agent logs will show the bootstrap process:

```bash
kubectl logs my-pod -n my-namespace -c istio-proxy --previous
```

The `--previous` flag is important here because if the container is crash-looping, you need to see the logs from the previous attempt.

**DNS resolution issues**: When using Istio DNS proxying and name resolution isn't working:

```bash
kubectl exec my-pod -n my-namespace -c istio-proxy -- \
  curl -s -XPUT "localhost:15004/logging?dns=debug"
```

## Separating Pilot-Agent and Envoy Logs

Since both pilot-agent and Envoy write to the same container's stdout, it can be hard to separate them. Here are some tricks:

```bash
# Pilot-agent logs typically contain these patterns
kubectl logs my-pod -n my-namespace -c istio-proxy | grep -v "^\[20" | head -50

# Envoy logs start with timestamps in a specific format
kubectl logs my-pod -n my-namespace -c istio-proxy | grep "^\[20" | head -50
```

You can also look for specific pilot-agent scopes in the output:

```bash
kubectl logs my-pod -n my-namespace -c istio-proxy | grep "pilot-agent\|sds\|ca\|dns"
```

## Checking the Bootstrap Configuration

Sometimes the issue is in the bootstrap config that pilot-agent generates for Envoy. You can inspect it:

```bash
kubectl exec my-pod -n my-namespace -c istio-proxy -- \
  cat /etc/istio/proxy/envoy-rev.json | python3 -m json.tool
```

This shows you the exact Envoy configuration that pilot-agent created at startup.

## Resetting Log Levels

Once you're done debugging, bring the log levels back to normal:

```bash
kubectl exec my-pod -n my-namespace -c istio-proxy -- \
  curl -s -XPUT "localhost:15004/logging?level=warning"
```

Or if you used annotations or ProxyConfig, remove those and restart the pods:

```bash
kubectl rollout restart deployment/my-service -n my-namespace
```

## Practical Considerations

Pilot-agent debug logging is less verbose than Envoy debug logging since pilot-agent isn't handling per-request processing. It's mainly doing periodic tasks like certificate checks and health probes. That said, in large clusters with lots of certificate rotations happening, the CA and SDS logs can still get pretty chatty.

The most common reason to enable pilot-agent debug logging is sidecar startup issues. When a pod gets stuck with the sidecar not ready, or when you see init container issues, that's your signal to look at pilot-agent logs. The debug output during the startup sequence will usually tell you exactly what's failing and why.
