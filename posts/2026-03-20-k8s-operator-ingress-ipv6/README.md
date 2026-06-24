# How to Handle IPv6 in Operator-Managed Ingress Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Operator, IPv6, Ingress, Nginx

Description: Create and manage Kubernetes Ingress resources with IPv6 annotations and LoadBalancer IPs in custom Kubernetes operators.

## Overview

Create and manage Kubernetes Ingress resources and their backing LoadBalancer Services with IPv6-aware configuration in custom Kubernetes operators.

## Prerequisites

- Kubernetes cluster with dual-stack or IPv6 support
- Go development environment with controller-runtime
- Basic understanding of Kubernetes operators

## Working with IPv6 in Kubernetes Operators

### Checking for IPv6 Node Addresses in the Cluster

```go
// hasIPv6NodeAddress checks whether any node reports an IPv6 address.
// It does not, by itself, prove that the cluster is fully dual-stack capable.
func hasIPv6NodeAddress(ctx context.Context, config *rest.Config) (bool, error) {
    client, err := kubernetes.NewForConfig(config)
    if err != nil {
        return false, err
    }

    nodes, err := client.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
    if err != nil {
        return false, err
    }

    for _, node := range nodes.Items {
        for _, addr := range node.Status.Addresses {
            ip := net.ParseIP(addr.Address)
            if ip != nil && ip.To4() == nil {
                return true, nil // Found an IPv6 node address
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

// IsValidIPv6 returns true if the string is a valid IPv6 address
func IsValidIPv6(addr string) bool {
    ip := net.ParseIP(addr)
    return ip != nil && ip.To4() == nil
}

// IsValidIPv6CIDR returns true if the string is a valid IPv6 CIDR
func IsValidIPv6CIDR(cidr string) bool {
    ip, _, err := net.ParseCIDR(cidr)
    if err != nil {
        return false
    }
    return ip.To4() == nil
}

// GetIPVersion returns "ipv4" or "ipv6"
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

# Verify dual-stack is enabled
kubectl get nodes -o go-template --template='{{range .items}}{{.metadata.name}}{{"\n"}}{{range .status.addresses}}{{printf "  %s: %s\n" .type .address}}{{end}}{{end}}'
kubectl get pod -n kube-system "$(kubectl get pod -n kube-system -o jsonpath='{.items[0].metadata.name}')" -o go-template --template='{{range .status.podIPs}}{{printf "%s\n" .ip}}{{end}}'
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your operator's health endpoint over IPv6. Configure synthetic monitors that check the operator's metrics and health endpoints from IPv6 addresses.

## Conclusion

How to Handle IPv6 in Operator-Managed Ingress Resources involves using Go's `net` package for IPv6 validation, handling dual-stack backing Services with `.spec.ipFamilyPolicy`, and testing against IPv6-enabled Kubernetes clusters. Always validate IPv6 addresses in CRD webhook validators to catch issues before reconciliation.
