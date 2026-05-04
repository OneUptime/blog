# How to Configure OpenFaaS with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, OpenFaaS, Serverless, Kubernetes, Function

Description: Configure OpenFaaS on an IPv6-enabled Kubernetes cluster, deploy functions with IPv6 access, and handle IPv6 client addresses in function handlers.

## Introduction

OpenFaaS (Functions as a Service) runs on Kubernetes and inherits IPv6 capabilities from the cluster's CNI. With a dual-stack Kubernetes cluster, OpenFaaS gateways and functions can serve IPv6 clients. This guide covers deploying OpenFaaS with IPv6 and writing IPv6-aware functions.

## Deploying OpenFaaS on IPv6 Kubernetes

```bash
# Prerequisites: dual-stack Kubernetes cluster

# kubectl get nodes -o wide shows both IPv4 and IPv6 node addresses

# Install OpenFaaS via arkade or Helm
arkade install openfaas

# Or via Helm with explicit IPv6 gateway service
helm repo add openfaas https://openfaas.github.io/faas-netes/
helm install openfaas openfaas/openfaas \
  --namespace openfaas \
  --create-namespace \
  --set gateway.replicas=2 \
  --set serviceType=LoadBalancer

# Verify deployment
kubectl get pods -n openfaas
kubectl get svc -n openfaas gateway-external
```

## Exposing Gateway via IPv6 LoadBalancer

```yaml
# Patch the gateway service for IPv6
apiVersion: v1
kind: Service
metadata:
  name: gateway-external
  namespace: openfaas
spec:
  type: LoadBalancer
  ipFamilyPolicy: RequireDualStack
  ipFamilies:
    - IPv6
    - IPv4
  selector:
    app: gateway
  ports:
    - name: http
      port: 8080
      targetPort: 8080
```

```bash
kubectl apply -f gateway-ipv6-svc.yaml

# Get the IPv6 LoadBalancer address
kubectl get svc -n openfaas gateway-external \
  -o jsonpath='{.status.loadBalancer.ingress[*].ip}'
```

## IPv6-Aware Function Handler

```python
# handler.py - Python function that handles IPv6 clients

def handle(event, context):
    """
    OpenFaaS Python function with IPv6 client detection.
    """
    import json

    # Extract client IP from headers
    headers = event.headers if hasattr(event, "headers") else {}
    client_ip = (
        headers.get("x-forwarded-for", "").split(",")[0].strip()
        or headers.get("x-real-ip", "")
        or "unknown"
    )

    is_ipv6 = ":" in client_ip

    response_body = {
        "message": "Hello from OpenFaaS!",
        "client_ip": client_ip,
        "protocol": "IPv6" if is_ipv6 else "IPv4",
        "hostname": context.hostname if context else "unknown",
    }

    return {
        "statusCode": 200,
        "body": json.dumps(response_body),
        "headers": {"Content-Type": "application/json"},
    }
```

## Function Deployment Stack YAML

```yaml
# stack.yml
version: 1.0
provider:
  name: openfaas
  gateway: http://[fd00:10:96::1]:8080  # IPv6 gateway

functions:
  ipv6-info:
    lang: python3-http
    handler: ./ipv6-info
    image: registry.example.com/ipv6-info:latest
    environment:
      - LOG_IPV6=true
    annotations:
      prometheus.io/scrape: "true"
    limits:
      memory: 128m
      cpu: 100m
```

```bash
# Deploy function
faas-cli up -f stack.yml

# Test via IPv6 gateway
curl -6 http://[<gateway-ipv6>]:8080/function/ipv6-info

# Or port-forward and test locally
kubectl port-forward -n openfaas svc/gateway 8080:8080
curl http://localhost:8080/function/ipv6-info
```

## Monitoring OpenFaaS Functions

```bash
# Check function metrics via Prometheus (included with OpenFaaS)
kubectl port-forward -n openfaas deploy/prometheus 9090:9090

# Key metrics for IPv6 functions:
# gateway_functions_seconds_bucket - function invocation latency
# gateway_function_invocation_total - total invocations
# gateway_function_invocation_started - in-flight invocations

# Monitor with Grafana
# Import OpenFaaS dashboard: https://grafana.com/dashboards/3434
```

## Conclusion

OpenFaaS on a dual-stack Kubernetes cluster serves IPv6 clients when the gateway service is configured with dual-stack or IPv6-only LoadBalancer. Functions access client IPs via the `x-forwarded-for` header set by the gateway. Deploy functions with `faas-cli up` and point it at the IPv6 gateway address. Monitor function invocation latency and error rates with OneUptime.
