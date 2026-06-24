# How to Handle Dual-Stack Service Endpoints in Operators

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Operator, IPv6, Dual-Stack, Controller-runtime

Description: Manage Kubernetes services with both IPv4 and IPv6 endpoints in custom operators using controller-runtime and the Endpoints API.

## Overview

Manage Kubernetes services with both IPv4 and IPv6 endpoints in custom operators using controller-runtime, dual-stack Service fields, and EndpointSlices instead of the deprecated Endpoints API.

## Prerequisites

- Kubernetes cluster with dual-stack or IPv6 support
- Go development environment with controller-runtime
- Basic understanding of Kubernetes operators

## Working with IPv6 in Kubernetes Operators

### Checking for IPv6 Node Networking

```go
// Check whether any Node has an IPv6 Pod CIDR or node address.
func hasIPv6NodeNetworking(ctx context.Context, config *rest.Config) (bool, error) {
    kubeClient, err := kubernetes.NewForConfig(config)
    if err != nil {
        return false, err
    }

    nodes, err := kubeClient.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
    if err != nil {
        return false, err
    }

    for _, node := range nodes.Items {
        for _, cidr := range node.Spec.PodCIDRs {
            ip, _, err := net.ParseCIDR(cidr)
            if err == nil && ip.To4() == nil {
                return true, nil
            }
        }

        for _, addr := range node.Status.Addresses {
            ip := net.ParseIP(addr.Address)
            if ip != nil && ip.To4() == nil {
                return true, nil
            }
        }
    }

    return false, nil
}
```

### IPv6 Address Validation in Go

```go
package iputil

import "net"

// IsValidIPv6 returns true if the string is a valid native IPv6 address
func IsValidIPv6(addr string) bool {
    ip := net.ParseIP(addr)
    return ip != nil && ip.To4() == nil
}

// IsValidIPv6CIDR returns true if the string is a valid native IPv6 CIDR
func IsValidIPv6CIDR(cidr string) bool {
    ip, _, err := net.ParseCIDR(cidr)
    if err != nil {
        return false
    }
    return ip.To4() == nil
}

// GetIPVersion returns "ipv4", "ipv6", or "invalid"
func GetIPVersion(addr string) string {
    ip := net.ParseIP(addr)
    if ip == nil {
        return "invalid"
    }
    if ip.To4() != nil {
        return "ipv4"
    }
    return "ipv6"
}
```

### Reconciler Logic for IPv6 Resources

```go
func (r *Reconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    log := log.FromContext(ctx)

    // Fetch the custom resource
    var resource myv1.MyResource
    if err := r.Get(ctx, req.NamespacedName, &resource); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Check for IPv6 addresses in spec
    for _, addr := range resource.Spec.IPAddresses {
        if iputil.IsValidIPv6(addr) {
            log.Info("Processing IPv6 address", "address", addr)
            // Handle IPv6-specific logic here
        }
    }

    return ctrl.Result{}, nil
}
```

## Testing

```bash
# Create a KIND cluster with dual-stack support

cat > kind-dual-stack.yaml << EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  ipFamily: dual
EOF

kind create cluster --config kind-dual-stack.yaml

# Verify node Pod CIDRs include both IPv4 and IPv6 ranges
NODE_NAME=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
kubectl get node "$NODE_NAME" -o go-template='{{range .spec.podCIDRs}}{{printf "%s\n" .}}{{end}}'

# Verify a Service receives both IPv4 and IPv6 cluster IPs
cat > dual-stack-service.yaml << EOF
apiVersion: v1
kind: Service
metadata:
  name: dualstack-check
spec:
  ipFamilyPolicy: PreferDualStack
  selector:
    app: dualstack-check
  ports:
    - protocol: TCP
      port: 80
EOF

kubectl apply -f dual-stack-service.yaml
kubectl describe svc dualstack-check
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your operator's health and metrics endpoints over IPv6. Configure monitors that target the operator's IPv6 address or AAAA-backed hostname.

## Conclusion

How to Handle Dual-Stack Service Endpoints in Operators involves using Go's `net` package for IPv6 validation, handling dual-stack Service creation with `.spec.ipFamilyPolicy`, and testing against IPv6-enabled Kubernetes clusters. If your operator needs backend endpoint data on dual-stack clusters, use the EndpointSlice API rather than the deprecated Endpoints API. Always validate IPv6 addresses in CRD webhook validators to catch issues before reconciliation.
