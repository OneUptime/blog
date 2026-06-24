# How to Validate IPv6 Addresses in Custom Resource Definitions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CRD, IPv6, Validation, CEL

Description: Add CEL validation rules and webhook validators to Kubernetes CRDs to enforce IPv6 address format and CIDR constraints.

## Overview

Add CEL validation rules and validating webhooks to Kubernetes CRDs to enforce IPv6 address and CIDR format. The CEL examples in this post use the Kubernetes 1.31+ IP and CIDR libraries.

## Prerequisites

- Kubernetes 1.31+ cluster for the CEL IP/CIDR functions shown here, or a validating webhook for older clusters
- Kubernetes cluster with dual-stack or IPv6 support for end-to-end testing
- Go development environment with controller-runtime
- Basic understanding of Kubernetes operators

## Working with IPv6 in Kubernetes Operators

### CEL Validation in the CRD Schema

```go
type MyResourceSpec struct {
    // +kubebuilder:validation:MinItems=1
    // +kubebuilder:validation:items:XValidation:rule="isIP(self) && ip(self).family() == 6",message="each entry must be a valid IPv6 address"
    IPAddresses []string `json:"ipAddresses"`

    // +kubebuilder:validation:XValidation:rule="isCIDR(self) && cidr(self).ip().family() == 6",message="must be a canonical IPv6 CIDR"
    CIDR string `json:"cidr,omitempty"`
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

// IsValidIPv6CIDR returns true if the string is a canonical IPv6 CIDR
func IsValidIPv6CIDR(cidr string) bool {
    ip, network, err := net.ParseCIDR(cidr)
    if err != nil {
        return false
    }
    return ip.To4() == nil && ip.Equal(network.IP)
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

### Validating Webhook Logic

```go
type MyResourceCustomValidator struct{}

func (v *MyResourceCustomValidator) ValidateCreate(_ context.Context, obj *myv1.MyResource) (admission.Warnings, error) {
    return nil, validateMyResource(obj)
}

func (v *MyResourceCustomValidator) ValidateUpdate(_ context.Context, _, newObj *myv1.MyResource) (admission.Warnings, error) {
    return nil, validateMyResource(newObj)
}

func (v *MyResourceCustomValidator) ValidateDelete(_ context.Context, _ *myv1.MyResource) (admission.Warnings, error) {
    return nil, nil
}

func validateMyResource(resource *myv1.MyResource) error {
    var allErrs field.ErrorList

    for i, addr := range resource.Spec.IPAddresses {
        if !iputil.IsValidIPv6(addr) {
            allErrs = append(allErrs, field.Invalid(
                field.NewPath("spec").Child("ipAddresses").Index(i),
                addr,
                "must be a valid IPv6 address",
            ))
        }
    }

    if resource.Spec.CIDR != "" && !iputil.IsValidIPv6CIDR(resource.Spec.CIDR) {
        allErrs = append(allErrs, field.Invalid(
            field.NewPath("spec").Child("cidr"),
            resource.Spec.CIDR,
            "must be a canonical IPv6 CIDR",
        ))
    }

    if len(allErrs) == 0 {
        return nil
    }

    return apierrors.NewInvalid(
        schema.GroupKind{Group: myv1.GroupVersion.Group, Kind: "MyResource"},
        resource.Name,
        allErrs,
    )
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
kubectl get nodes -o wide
kubectl get nodes <node-name> -o go-template --template='{{range .spec.podCIDRs}}{{printf "%s\n" .}}{{end}}'
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your operator's health endpoint over IPv6. Configure synthetic monitors that check the operator's metrics and health endpoints from IPv6 addresses.

## Conclusion

How to Validate IPv6 Addresses in Custom Resource Definitions involves using Kubernetes CEL validation in the CRD schema, backing it up with Go-based validating webhooks for more complex checks, and testing against IPv6-enabled Kubernetes clusters. Always validate IPv6 addresses during admission to catch issues before reconciliation.
