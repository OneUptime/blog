# How to Enable Debug Logging for Istiod

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istiod, Logging, Debugging, Kubernetes

Description: Step-by-step instructions for enabling debug logging on the Istiod control plane to troubleshoot configuration distribution, certificate issues, and service discovery problems.

---

Istiod is the brain of your Istio service mesh. It handles service discovery, configuration distribution, certificate management, and a whole lot more. When things aren't working as expected, debug logging on Istiod is often the fastest way to figure out what's going on.

The good news is that Istiod has a really flexible logging system. You can change log levels on the fly, target specific subsystems, and get exactly the information you need without drowning in irrelevant output.

## How Istiod Logging Works

Istiod organizes its logs into "scopes." Each scope represents a different functional area within the control plane. Some of the key scopes include:

- `ads` - Aggregate Discovery Service, handles xDS configuration push to proxies
- `adsc` - ADS client, used for debugging xDS connections
- `authorization` - Authorization policy processing
- `default` - General logging that doesn't fall under a specific scope
- `grpcAdapter` - gRPC adapter logging
- `model` - Service model and configuration model
- `tpath` - Translation path for configuration
- `validation` - Configuration validation
- `wle` - WorkloadEntry auto-registration

Each scope can have its own log level, which means you can turn on debug logging for just the area you care about.

## Enabling Debug Logging at Runtime

The fastest way to turn on debug logging for Istiod is to use its admin API. Istiod exposes an HTTP endpoint on port 8080 that lets you change log levels without restarting anything:

```bash
# Enable debug for the ADS scope
kubectl exec -n istio-system deploy/istiod -- \
  curl -s -XPUT "localhost:8080/scopej/ads" -d '{"output_level":"debug"}'

# Enable debug for authorization
kubectl exec -n istio-system deploy/istiod -- \
  curl -s -XPUT "localhost:8080/scopej/authorization" -d '{"output_level":"debug"}'

# Enable debug for everything
kubectl exec -n istio-system deploy/istiod -- \
  curl -s -XPUT "localhost:8080/scopej/default" -d '{"output_level":"debug"}'
```

To verify the current level of a scope:

```bash
kubectl exec -n istio-system deploy/istiod -- \
  curl -s "localhost:8080/scopej/ads" | python3 -m json.tool
```

The response will look something like:

```json
{
    "name": "ads",
    "description": "ads debugging",
    "output_level": "debug",
    "stack_trace_level": "none",
    "log_callers": false
}
```

## Listing All Available Scopes

You might not know which scope to target. To see every scope that Istiod has:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s "localhost:8080/scopez"
```

This returns a JSON array of all scopes with their current settings. Pipe it through jq or python to make it readable:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s "localhost:8080/scopez" | python3 -m json.tool
```

## Enabling Debug Logging at Startup

If you want debug logging from the moment Istiod starts (useful for catching startup issues), you can configure it through the IstioOperator resource:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        env:
          - name: PILOT_LOG_LEVEL
            value: "default:debug"
```

Apply this with istioctl:

```bash
istioctl install -f istio-operator.yaml
```

You can also set multiple scopes at different levels:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        env:
          - name: PILOT_LOG_LEVEL
            value: "default:info,ads:debug,authorization:debug,model:warn"
```

## Using Command-Line Flags

If you're starting Istiod manually (which is rare but happens in development), you can pass log level flags directly:

```bash
# These are the flags that Istiod's pilot-discovery binary accepts
pilot-discovery discovery --log_output_level=default:debug,ads:debug
```

In practice, you'll usually set these through environment variables in the deployment rather than direct flags.

## Debugging Common Scenarios

Here's when to enable debug logging on specific scopes.

**Configuration not reaching proxies**: Turn on the `ads` scope. This will show you the xDS pushes happening from Istiod to each connected proxy. You'll see which configs are being sent and to which proxies:

```bash
kubectl exec -n istio-system deploy/istiod -- \
  curl -s -XPUT "localhost:8080/scopej/ads" -d '{"output_level":"debug"}'

# Then watch the logs
kubectl logs -n istio-system deploy/istiod -f | grep -i "ads"
```

**Authorization policy not working**: Enable the `authorization` scope to see how policies are being evaluated and distributed:

```bash
kubectl exec -n istio-system deploy/istiod -- \
  curl -s -XPUT "localhost:8080/scopej/authorization" -d '{"output_level":"debug"}'
```

**Certificate issues**: The default scope covers most certificate-related logging. You can also look at the `ca` scope:

```bash
kubectl exec -n istio-system deploy/istiod -- \
  curl -s -XPUT "localhost:8080/scopej/default" -d '{"output_level":"debug"}'
```

**Service discovery problems**: The `model` scope shows how Istiod builds its internal model of your services:

```bash
kubectl exec -n istio-system deploy/istiod -- \
  curl -s -XPUT "localhost:8080/scopej/model" -d '{"output_level":"debug"}'
```

## Reading the Debug Output

Istiod debug logs can be pretty verbose. Here are some patterns to look for:

```bash
# Watch for xDS push events
kubectl logs -n istio-system deploy/istiod -f | grep "Push"

# Look for errors even in debug mode
kubectl logs -n istio-system deploy/istiod -f | grep "error\|Error\|ERROR"

# Filter for a specific proxy connection
kubectl logs -n istio-system deploy/istiod -f | grep "my-pod-name"
```

## Stack Trace Logging

For really tricky bugs, you can also enable stack trace logging for a scope. This adds a Go stack trace to every log line at or above the specified level:

```bash
kubectl exec -n istio-system deploy/istiod -- \
  curl -s -XPUT "localhost:8080/scopej/ads" \
  -d '{"output_level":"debug","stack_trace_level":"error"}'
```

This adds a stack trace to every error-level log in the ADS scope, which can help you trace exactly where an error is originating.

## Turning It Off

This is important and easy to forget. Once you're done debugging, reset the log levels back to their defaults:

```bash
# Reset ADS to info
kubectl exec -n istio-system deploy/istiod -- \
  curl -s -XPUT "localhost:8080/scopej/ads" -d '{"output_level":"info"}'

# Or reset everything at once by restarting
kubectl rollout restart deployment/istiod -n istio-system
```

Debug logging produces a lot of output. In a busy cluster, Istiod with debug logging can generate gigabytes of logs per hour. That's not something you want running for days on end.

## Monitoring Log Volume

A quick way to check how much logging Istiod is producing:

```bash
# Check the log output rate
kubectl logs -n istio-system deploy/istiod --since=1m | wc -l
```

If you're seeing tens of thousands of lines per minute, you probably want to narrow down which scopes are at debug level or turn things back to info.

Debug logging for Istiod is one of the most powerful troubleshooting tools you have. The key is knowing which scope to target and remembering to turn it off when you're done. The runtime API makes this quick and painless, so there's no excuse for flying blind when something goes wrong with your control plane.
