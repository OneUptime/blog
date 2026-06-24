# How to Monitor Operator-Managed IPv6 Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Operator, IPv6, Monitoring, Prometheus

Description: Monitor Kubernetes operator health and the IPv6 resources it manages using Prometheus metrics and custom alerts.

## Overview

Monitor Kubernetes operator health and the IPv6 resources it manages using IPv6-aware validation, testing, and monitoring checks.

## Prerequisites

- Kubernetes cluster with dual-stack or IPv6 support
- Go development environment with controller-runtime
- Basic understanding of Kubernetes operators

## Working with IPv6 in Kubernetes Operators

### Checking IPv6 Support in the Cluster

```go
// Check if the cluster has IPv6 Pod CIDRs assigned
func isIPv6Enabled(ctx context.Context, config *rest.Config) (bool, error) {
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

# Verify dual-stack is enabled
# Replace <node-name> and <pod-name> with resources from your cluster
kubectl get nodes <node-name> -o go-template --template='{{range .spec.podCIDRs}}{{printf "%s\n" .}}{{end}}'
kubectl get pods -n kube-system <pod-name> -o go-template --template='{{range .status.podIPs}}{{printf "%s\n" .ip}}{{end}}'
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your operator's health endpoint over IPv6. Configure monitors that check the operator's metrics and health endpoints over IPv6.

## Conclusion

How to Monitor Operator-Managed IPv6 Resources involves using Go's `net` package for IPv6 validation, checking for IPv6 Pod CIDRs assigned to cluster nodes, handling dual-stack service creation with `.spec.ipFamilyPolicy`, and testing against IPv6-enabled Kubernetes clusters. Always validate IPv6 addresses in CRD webhook validators to catch issues before reconciliation.
