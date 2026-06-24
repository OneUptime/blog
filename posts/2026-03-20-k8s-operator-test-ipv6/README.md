# How to Test Kubernetes Operators with IPv6 Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Operator, IPv6, Testing, Envtest

Description: Test Kubernetes operators against dual-stack and IPv6-only clusters using envtest, KIND, and integration testing frameworks.

## Overview

Use envtest for API-level controller tests and KIND for dual-stack or IPv6-only cluster validation.

## Prerequisites

- Kubernetes cluster with dual-stack or IPv6 support
- Go development environment with controller-runtime
- Basic understanding of Kubernetes operators

## Working with IPv6 in Kubernetes Operators

### Detecting IPv6 Node Addresses in the Cluster

```go
// hasIPv6NodeAddress returns true if any node reports an IPv6 address.
func hasIPv6NodeAddress(config *rest.Config) (bool, error) {
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return false, err
    }

    nodes, err := clientset.CoreV1().Nodes().List(context.Background(), metav1.ListOptions{})
    if err != nil {
        return false, err
    }

    for _, node := range nodes.Items {
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

Use `envtest` for controller and webhook tests that only need the Kubernetes API server. For dual-stack or IPv6-only networking validation, use a real cluster such as KIND, because `envtest` starts only `etcd` and `kube-apiserver`.

```bash
# Create a KIND cluster with dual-stack support.
# For an IPv6-only KIND cluster, set `networking.ipFamily: ipv6` instead of `dual`.

cat > kind-dual-stack.yaml <<'EOF'
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  ipFamily: dual
EOF

kind create cluster --config kind-dual-stack.yaml

# Verify the node reports both Pod CIDR families and IPv4/IPv6 node addresses.
NODE=$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')
kubectl get node "$NODE" -o go-template --template='{{range .spec.podCIDRs}}{{printf "%s\n" .}}{{end}}'
kubectl get node "$NODE" -o go-template --template='{{range .status.addresses}}{{printf "%s: %s\n" .type .address}}{{end}}'

# Verify a Pod has both IPv4 and IPv6 addresses assigned.
POD=$(kubectl get pods -n kube-system -o jsonpath='{.items[0].metadata.name}')
kubectl get pod -n kube-system "$POD" -o go-template --template='{{range .status.podIPs}}{{printf "%s\n" .ip}}{{end}}'
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your operator's IPv6-enabled endpoints. For direct IPv6 addresses, use an IP monitor; for HTTP health endpoints inside private networks, run a custom probe with IPv6 connectivity and use website or synthetic monitors.

## Conclusion

How to Test Kubernetes Operators with IPv6 Clusters involves using Go's `net` package for IPv6 validation, using `envtest` for API-level controller and webhook checks, and validating dual-stack or IPv6-only behavior on real IPv6-enabled clusters. If your operator manages Services, validate `IPFamilyPolicy` behavior as part of integration tests. Always validate IPv6 addresses in CRD webhook validators to catch issues before reconciliation.
