# How to Handle IPv6 in Operator-Managed Database Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Operator, IPv6, Database, PostgreSQL

Description: Configure database connections managed by Kubernetes operators to use IPv6 addresses for connecting to PostgreSQL, MongoDB, and Redis.

## Overview

Configure database connections managed by Kubernetes operators to use IPv6 addresses for connecting to PostgreSQL, MongoDB, and Redis.

## Prerequisites

- Kubernetes cluster with dual-stack or IPv6 support
- Go development environment with controller-runtime
- Basic understanding of Kubernetes operators

## Working with IPv6 in Kubernetes Operators

### Checking IPv6 Support in the Cluster

```go
// Check if the cluster allocates IPv6 Pod CIDRs
func isIPv6Enabled(config *rest.Config) (bool, error) {
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return false, err
    }

    nodes, err := clientset.CoreV1().Nodes().List(context.Background(), metav1.ListOptions{})
    if err != nil {
        return false, err
    }

    for _, node := range nodes.Items {
        cidrs := node.Spec.PodCIDRs
        if len(cidrs) == 0 && node.Spec.PodCIDR != "" {
            cidrs = []string{node.Spec.PodCIDR}
        }

        for _, cidr := range cidrs {
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
kubectl get nodes -o go-template --template='{{range .items}}{{.metadata.name}}{{"\n"}}{{range .spec.podCIDRs}}{{printf "  %s\n" .}}{{end}}{{end}}'
kubectl get pods -n kube-system -o go-template --template='{{range .items}}{{.metadata.name}}{{": "}}{{range .status.podIPs}}{{printf "%s " .ip}}{{end}}{{"\n"}}{{end}}'
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your operator's health endpoint over IPv6. Configure API monitors for the operator's metrics and health endpoints, or IP monitors for the underlying IPv6 address.

## Conclusion

How to Handle IPv6 in Operator-Managed Database Connections involves using Go's `net` package for IPv6 validation, handling dual-stack service creation with `IPFamilyPolicy`, and testing against IPv6-enabled Kubernetes clusters. Always validate IPv6 addresses in CRD webhook validators to catch issues before reconciliation.
