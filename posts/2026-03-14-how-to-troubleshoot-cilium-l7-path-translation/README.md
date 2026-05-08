# Troubleshooting Cilium L7 Path Translation Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, L7, Troubleshooting, Envoy

Description: How to diagnose and fix Cilium L7 path translation problems including misconfigured routes, Envoy errors, and unexpected rewrite behavior.

---

## Introduction

L7 path translation issues in Cilium manifest as requests hitting the wrong backend endpoint, 404 errors after path rewriting, or path translation not happening at all. Because path translation runs inside the Envoy proxy, debugging requires checking both the CiliumEnvoyConfig and the Envoy runtime state.

## Prerequisites

- Kubernetes cluster with Cilium and L7 proxy enabled
- kubectl and Cilium CLI configured
- CiliumEnvoyConfig applied for path translation

## Diagnosing Path Translation Failures

```bash
# Check CiliumEnvoyConfig status

kubectl get ciliumenvoyconfigs -n default

# Verify Envoy picked up the configuration
kubectl exec -n kube-system <cilium-pod> -c cilium-agent -- \
  cilium-dbg envoy admin config routes

# Check Envoy logs for route errors
kubectl logs -n kube-system <cilium-pod> -c cilium-agent | grep -Ei "envoy|route" | tail -20

# Monitor actual HTTP requests through Hubble
hubble observe --protocol http -n default --last 20 -o json | \
  jq '.flow.l7.http | {url: .url, code: .code}'
```

```mermaid
graph TD
    A[Path Translation Issue] --> B{CiliumEnvoyConfig Applied?}
    B -->|No| C[Apply Configuration]
    B -->|Yes| D{Envoy Route Active?}
    D -->|No| E[Check Config Dump]
    D -->|Yes| F{Path Rewritten?}
    F -->|No| G[Check Match Rules]
    F -->|Yes| H{Backend Receives Correct Path?}
    H -->|No| I[Check Rewrite Rules]
```

## Fixing Configuration Issues

```bash
# Validate CiliumEnvoyConfig YAML
kubectl apply --dry-run=client -f path-translation.yaml

# Check agent logs for rejected Envoy resources
kubectl logs -n kube-system <cilium-pod> -c cilium-agent | grep -Ei "CiliumEnvoyConfig|envoy|rejected" | tail -50

# Test with a simple configuration first
cat <<EOF | kubectl apply -f -
apiVersion: cilium.io/v2
kind: CiliumEnvoyConfig
metadata:
  name: simple-rewrite-test
  namespace: default
  annotations:
    cec.cilium.io/use-original-source-address: "false"
spec:
  services:
    - name: backend-service
      namespace: default
  resources:
    - "@type": type.googleapis.com/envoy.config.listener.v3.Listener
      name: simple-rewrite-listener
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: simple-rewrite-listener
                rds:
                  route_config_name: simple_rewrite_route
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
    - "@type": type.googleapis.com/envoy.config.route.v3.RouteConfiguration
      name: simple_rewrite_route
      virtual_hosts:
        - name: backend
          domains: ["*"]
          routes:
            - match:
                prefix: "/test-old/"
              route:
                cluster: default/backend-service
                prefix_rewrite: "/test-new/"
            - match:
                prefix: "/"
              route:
                cluster: default/backend-service
    - "@type": type.googleapis.com/envoy.config.cluster.v3.Cluster
      name: default/backend-service
      connect_timeout: 5s
      lb_policy: ROUND_ROBIN
      type: EDS
EOF
```

## Verification

```bash
kubectl get ciliumenvoyconfigs -n default
kubectl exec deploy/client -- curl -s http://backend-service:8080/test-old/path
hubble observe --protocol http -n default --last 5
```

## Troubleshooting

- **Config not applied**: Check CiliumEnvoyConfig syntax. Ensure service name matches exactly.
- **Route order matters**: Envoy evaluates routes in order. Put specific matches before catch-all.
- **Regex errors**: Envoy uses RE2, not PCRE. Some patterns may not be supported.
- **502/503 after rewrite**: The rewritten path may not exist on the backend. Verify backend routes.

## Conclusion

Troubleshoot path translation by checking the CiliumEnvoyConfig is applied, verifying Envoy route configuration, and testing with simple cases first. Use Hubble to observe actual HTTP request paths.
