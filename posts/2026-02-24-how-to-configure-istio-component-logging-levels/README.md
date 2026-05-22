# How to Configure Istio Component Logging Levels

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Logging, Kubernetes, Service Mesh, Observability

Description: A practical guide to configuring logging levels for various Istio components including Istiod, Envoy proxies, and pilot-agent for better debugging and monitoring.

---

When you're running Istio in production, getting the logging levels right is one of those things that really matters. Too verbose, and you're drowning in noise (and burning through storage). Too quiet, and you're flying blind when something goes wrong. Finding the right balance takes some understanding of how Istio's logging system actually works.

Istio has several components that each produce their own logs, and each one has its own knobs you can turn. The main components you'll be dealing with are Istiod (the control plane), the Envoy sidecar proxies (the data plane), and the pilot-agent process that bootstraps and manages the Envoy process inside each sidecar.

## Understanding Istio Log Levels

Istio control plane components use a standard set of log levels that you'll recognize if you've worked with most logging frameworks:

- `none` - No logging at all
- `error` - Only errors
- `warn` - Warnings and errors
- `info` - General informational messages (the default)
- `debug` - Detailed debugging information

Envoy proxy loggers use a slightly different set of levels, including `trace`, `debug`, `info`, `warning`, `error`, `critical`, and `off`.

For Istiod specifically, you can control logging at a per-scope level. Scopes are logical groupings of log messages within Istiod. Some common scopes include `ads`, `model`, `default`, and `authorization`.

## Configuring Istiod Log Levels

You can set the log level for Istiod at install time through the IstioOperator resource or by passing values to istioctl:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      logging:
        level: "default:info,ads:debug"
```

If Istio is already running, you can change the log level dynamically without restarting Istiod. This is super handy when you're troubleshooting a live issue:

```bash
istioctl admin log --level ads:debug
```

To check what the current log levels are set to:

```bash
istioctl admin log
```

You can also list all available scopes:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s "localhost:9876/scopez"
```

## Configuring Envoy Proxy Log Levels

Envoy proxies have their own logging system. You can set the default log level for all Envoy sidecars through IstioOperator values:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        logLevel: warning
        componentLogLevel: "misc:error"
```

To change the log level for a specific pod's Envoy proxy at runtime:

```bash
istioctl proxy-config log <pod-name> --level debug
```

You can also target specific Envoy loggers. Envoy has many internal loggers for different subsystems:

```bash
istioctl proxy-config log <pod-name> --level connection:debug,http:debug,router:debug
```

To see all available Envoy loggers and their current levels:

```bash
istioctl proxy-config log <pod-name>
```

## Per-Pod Log Level Annotations

If you want to set the proxy log level for specific workloads at deployment time, you can use pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/logLevel: debug
        sidecar.istio.io/componentLogLevel: "misc:error,upstream:debug"
    spec:
      containers:
        - name: my-service
          image: my-service:latest
```

The `sidecar.istio.io/logLevel` annotation sets the overall Envoy log level, while `sidecar.istio.io/componentLogLevel` lets you fine-tune individual Envoy component loggers.

## Configuring Pilot-Agent Log Levels

The pilot-agent process runs alongside Envoy in each sidecar container. It handles things like certificate rotation and Envoy bootstrap configuration. You can control its log level for a workload with the `sidecar.istio.io/agentLogLevel` annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/agentLogLevel: "default:debug"
    spec:
      containers:
        - name: my-service
          image: my-service:latest
```

Or you can set it globally through IstioOperator values:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      logging:
        level: "default:debug"
```

## Setting Log Levels Through istioctl

The `istioctl` command gives you a convenient way to manage proxy log levels across your mesh. Here are some common patterns:

```bash
# Set all proxies in a namespace to debug

for pod in $(kubectl get pods -n my-namespace -o jsonpath='{.items[*].metadata.name}'); do
  istioctl proxy-config log "$pod" -n my-namespace --level debug
done

# Reset a pod's proxy back to the default warning level
istioctl proxy-config log my-pod -n my-namespace --level warning
```

## Global Log Level Configuration with IstioOperator Values

For cluster-wide startup settings, the IstioOperator values are where you want to make changes:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      logging:
        level: "default:info"
      proxy:
        logLevel: warning
        componentLogLevel: "misc:error"
```

After updating the installation configuration, existing proxies won't pick up the startup log level changes automatically. New pods will get the updated config, but for existing ones you'd need to restart them:

```bash
kubectl rollout restart deployment -n my-namespace
```

## Practical Tips

A few things I've learned from running Istio in production that are worth keeping in mind:

First, never leave debug logging on in production longer than you need to. Debug-level Envoy logs can produce an enormous amount of data. I've seen clusters where someone turned on debug logging and forgot about it, and the log volume caused disk pressure on the nodes.

Second, use `istioctl admin log` or the ControlZ API for Istiod. They let you investigate issues without any restarts, which is exactly what you want during an incident.

Third, if you're trying to debug connectivity issues, the most useful Envoy loggers to turn up are `connection`, `http`, `router`, and `upstream`. These will show you the request flow through the proxy.

Fourth, keep in mind that log level changes made through `istioctl proxy-config log`, `istioctl admin log`, or the ControlZ API are not persistent. If the pod restarts, it goes back to whatever level was configured at startup. If you need a persistent change, use the annotations or installation configuration approach.

## Verifying Your Configuration

After making changes, always verify that the log levels are what you expect:

```bash
# Check Istiod log scopes
istioctl admin log

# Check a specific proxy's log levels
istioctl proxy-config log my-pod -n my-namespace

# Watch the actual log output to confirm
kubectl logs -n my-namespace my-pod -c istio-proxy --tail=50
```

Getting logging levels right is a foundational part of running Istio well. Start with the Istio defaults, and then adjust specific components when you need to dig into issues. The ability to change levels at runtime without restarts is one of Istio's really nice operational features, so make sure your team knows how to use it.
