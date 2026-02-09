# How to Troubleshoot Ingress Controller Not Forwarding Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ingress, Networking

Description: Debug and fix Ingress controller issues that prevent HTTP requests from reaching backend services in Kubernetes clusters.

---

When an Ingress controller fails to forward requests to backend services, applications become unreachable despite appearing healthy. Users receive 404 errors, 502 bad gateway responses, or connection timeouts. The frustrating part is that the pods work perfectly when accessed directly, but fail through the Ingress.

Troubleshooting Ingress issues requires checking multiple layers: the Ingress resource configuration, the controller implementation, service endpoints, and network connectivity. This guide provides a systematic approach to diagnose and fix Ingress forwarding problems.

## Understanding the Ingress Path

When a request arrives at an Ingress controller, it follows this path: external client sends request to the Ingress controller service (typically a LoadBalancer or NodePort), the Ingress controller receives it and matches against Ingress rules, finds the backend service specified in the rule, looks up service endpoints (pod IPs), and forwards the request to a backend pod.

Failures can occur at any step. Systematic troubleshooting identifies where the chain breaks.

## Checking Ingress Resource Configuration

Start by verifying your Ingress resource is correctly defined:

```bash
# View your Ingress configuration
kubectl get ingress my-ingress -n my-namespace -o yaml

# Check for issues in the status field
kubectl describe ingress my-ingress -n my-namespace
```

The `describe` output shows important information including the backend services, any configuration errors, and the IP address assigned to the Ingress.

Common configuration mistakes include typos in service names, incorrect service ports, missing hosts or paths, and wrong namespaces (the Ingress must be in the same namespace as the backend service).

Verify your basic Ingress configuration:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  namespace: my-namespace
spec:
  ingressClassName: nginx  # Must match your controller
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-service  # Must exist in same namespace
            port:
              number: 80      # Must match service port
```

## Verifying Ingress Class

Kubernetes supports multiple Ingress controllers. Ensure your Ingress uses the correct class:

```bash
# List available Ingress classes
kubectl get ingressclass

# Check which class your Ingress uses
kubectl get ingress my-ingress -n my-namespace -o yaml | grep ingressClassName

# Verify the Ingress controller watches this class
kubectl get ingressclass nginx -o yaml
```

If your Ingress specifies a class that no controller handles, it will be ignored.

## Checking the Ingress Controller Status

Verify the Ingress controller is running:

```bash
# Find Ingress controller pods (example for nginx)
kubectl get pods -n ingress-nginx

# Check controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=50

# Look for errors about your Ingress resource
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller | grep my-ingress
```

Controller logs show whether it detected your Ingress resource and any errors during configuration.

## Testing Backend Service Directly

Verify the backend service works independently of the Ingress:

```bash
# Get service details
kubectl get svc my-service -n my-namespace

# Check service endpoints
kubectl get endpoints my-service -n my-namespace

# The endpoints list should show pod IPs
# If empty, your service selector doesn't match any pods

# Test service from within the cluster
kubectl run curl-test --rm -it --image=curlimages/curl -- \
  curl -v http://my-service.my-namespace.svc.cluster.local
```

If the service works when accessed directly but fails through Ingress, the problem is in the Ingress layer.

## Verifying Service Endpoints

An Ingress cannot forward to services without endpoints:

```bash
# Check if service has endpoints
kubectl get endpoints my-service -n my-namespace -o yaml

# Example healthy output:
# subsets:
# - addresses:
#   - ip: 10.244.1.5
#     targetRef:
#       name: my-pod
#   ports:
#   - port: 8080
#     protocol: TCP

# If subsets is empty or missing, fix the service selector
kubectl get svc my-service -n my-namespace -o yaml | grep -A5 selector
kubectl get pods -n my-namespace --show-labels
```

The service selector must match pod labels exactly for endpoints to be created.

## Testing Ingress Controller Connectivity

Test if the Ingress controller can reach the backend pods:

```bash
# Get a backend pod IP
kubectl get pods -n my-namespace -o wide | grep my-app

# Access the Ingress controller pod
kubectl exec -it -n ingress-nginx ingress-nginx-controller-xxx -- bash

# Inside controller pod, test connectivity to backend pod
curl -v http://10.244.1.5:8080

# If this fails, network policy or CNI issues may block traffic
```

The Ingress controller must have network access to backend pods. NetworkPolicies might block this traffic.

## Checking Path Matching

Path configuration determines which requests get forwarded:

```bash
# Test with exact path
curl -v http://myapp.example.com/api/users

# Check Ingress path configuration
kubectl get ingress my-ingress -n my-namespace -o yaml | grep -A5 paths
```

Path types affect matching behavior:

- `Prefix` matches the path prefix (e.g., `/api` matches `/api/users`)
- `Exact` requires an exact match (e.g., `/api` does NOT match `/api/users`)
- `ImplementationSpecific` depends on the Ingress controller

Incorrect path types cause unexpected 404 errors.

## Debugging with Curl and Headers

Test the Ingress with detailed curl commands:

```bash
# Test with proper Host header
curl -v -H "Host: myapp.example.com" http://ingress-controller-ip/

# Test specific paths
curl -v -H "Host: myapp.example.com" http://ingress-controller-ip/api/users

# Follow redirects
curl -vL -H "Host: myapp.example.com" http://ingress-controller-ip/

# Check response headers for debugging info
curl -I -H "Host: myapp.example.com" http://ingress-controller-ip/
```

The Host header must match the host in your Ingress rules. Many controllers use it for routing decisions.

## Analyzing Ingress Annotations

Annotations configure controller-specific behavior. Missing or incorrect annotations cause forwarding failures:

```bash
# View annotations
kubectl get ingress my-ingress -n my-namespace -o yaml | grep -A10 annotations

# Common nginx annotations:
# nginx.ingress.kubernetes.io/rewrite-target: /
# nginx.ingress.kubernetes.io/ssl-redirect: "false"
# nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
```

For example, if your backend expects requests at `/app` but clients request `/`, use rewrite-target:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /app/$1
spec:
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /(.*)
        pathType: Prefix
        backend:
          service:
            name: my-service
            port:
              number: 80
```

## Checking TLS Configuration

TLS misconfigurations prevent HTTPS traffic from reaching backends:

```bash
# Check TLS configuration
kubectl get ingress my-ingress -n my-namespace -o yaml | grep -A10 tls

# Verify the secret exists
kubectl get secret my-tls-secret -n my-namespace

# Check certificate validity
kubectl get secret my-tls-secret -n my-namespace -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -text -noout | grep -A2 Validity
```

If the TLS secret is missing or the certificate is invalid, HTTPS requests fail.

## Examining Controller Configuration

The Ingress controller itself might have configuration issues:

```bash
# For nginx Ingress, check ConfigMap
kubectl get configmap -n ingress-nginx ingress-nginx-controller -o yaml

# Check for settings that affect forwarding:
# - proxy-connect-timeout
# - proxy-read-timeout
# - proxy-body-size
# - ssl-protocols

# View generated nginx config
kubectl exec -it -n ingress-nginx ingress-nginx-controller-xxx -- cat /etc/nginx/nginx.conf

# Look for your Ingress rules in the configuration
kubectl exec -it -n ingress-nginx ingress-nginx-controller-xxx -- \
  cat /etc/nginx/nginx.conf | grep -A20 myapp.example.com
```

The generated configuration shows exactly how the controller interprets your Ingress resource.

## Testing Default Backend

Most Ingress controllers have a default backend for unmatched requests:

```bash
# Test without Host header (should hit default backend)
curl -v http://ingress-controller-ip/

# If you get 404 or 502 instead of default backend response,
# the controller might not be configured properly

# Check default backend configuration
kubectl get deployment -n ingress-nginx ingress-nginx-defaultbackend
```

If even the default backend fails, the Ingress controller has fundamental problems.

## Analyzing Network Policies

NetworkPolicies might block traffic between the Ingress controller and backend pods:

```bash
# Check NetworkPolicies in the backend namespace
kubectl get networkpolicy -n my-namespace

# Check policies in the Ingress controller namespace
kubectl get networkpolicy -n ingress-nginx

# Describe policies to see rules
kubectl describe networkpolicy -n my-namespace
```

Ensure NetworkPolicies allow:
- Ingress controller to backend pods
- Backend pods to respond to Ingress controller

## Checking Load Balancer Service

If using a LoadBalancer service for the Ingress controller:

```bash
# Check LoadBalancer service status
kubectl get svc -n ingress-nginx ingress-nginx-controller

# Verify external IP is assigned
# EXTERNAL-IP should not be <pending>

# Test LoadBalancer directly
curl -v http://EXTERNAL-IP/
```

A pending external IP means your cloud provider's load balancer is not provisioned. Check cloud provider quotas, permissions, or configuration.

## Enabling Debug Logging

Increase Ingress controller logging for detailed troubleshooting:

```bash
# For nginx Ingress, edit deployment
kubectl edit deployment -n ingress-nginx ingress-nginx-controller

# Add argument for verbose logging:
# args:
#   - /nginx-ingress-controller
#   - --v=3  # Add this line (higher number = more verbose)

# Watch detailed logs
kubectl logs -f -n ingress-nginx deployment/ingress-nginx-controller
```

Debug logs show each request processing step, revealing where forwarding fails.

## Testing from Inside the Cluster

Sometimes external access fails while internal access works:

```bash
# Create test pod
kubectl run test-pod --rm -it --image=curlimages/curl -- sh

# Test Ingress controller service from inside cluster
curl -v -H "Host: myapp.example.com" http://ingress-nginx-controller.ingress-nginx.svc.cluster.local

# If this works but external access fails, check:
# - LoadBalancer configuration
# - Firewall rules
# - DNS resolution
```

This narrows the problem to external access configuration.

## Validating DNS Resolution

DNS problems can appear as Ingress failures:

```bash
# Test DNS resolution
nslookup myapp.example.com

# Should resolve to Ingress external IP
# If it doesn't, fix DNS records

# Test with IP directly
curl -v -H "Host: myapp.example.com" http://INGRESS-IP/
```

If requests work with the IP but fail with the hostname, DNS is the problem, not the Ingress.

## Conclusion

Ingress controller troubleshooting requires methodical checking of each component in the request path. Start with the Ingress resource configuration, verify the backend service and endpoints work, check Ingress controller logs and status, test connectivity between components, and examine annotations and advanced configuration.

Most Ingress issues stem from simple configuration mistakes like typos in service names, incorrect port numbers, or missing ingress classes. Systematic troubleshooting quickly identifies these problems. For complex issues involving TLS, path rewriting, or NetworkPolicies, detailed examination of controller logs and generated configuration reveals the root cause. Master these troubleshooting techniques, and you will keep your applications accessible through Ingress controllers.
