# How to Handle IPv6 in Go Kubernetes Controllers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Kubernetes, IPv6, Controller, Operator, Networking

Description: Handle IPv6 in Go Kubernetes controllers including dual-stack service creation, IPv6 address validation in CRDs, and IPv6-aware networking policies.

## Kubernetes Dual-Stack Overview

Kubernetes dual-stack networking is enabled by default starting in 1.21 and is stable in 1.23+. Controllers need to handle both IPv4 and IPv6 addresses for Services, Pods, and Nodes.

Key dual-stack Kubernetes concepts:
- Services can have both IPv4 and IPv6 ClusterIPs
- Pods get both IPv4 and IPv6 addresses in dual-stack clusters
- IPFamilyPolicy controls whether services are single-stack or dual-stack

## Detecting Cluster IPv6 Support

One simple API check is to inspect `Node.status.addresses` for IPv6 entries.

```go
package main

import (
    "context"
    "net/netip"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

func hasIPv6NodeAddresses(clientset *kubernetes.Clientset) (bool, error) {
    nodes, err := clientset.CoreV1().Nodes().List(context.Background(), metav1.ListOptions{})
    if err != nil {
        return false, err
    }

    for _, node := range nodes.Items {
        for _, addr := range node.Status.Addresses {
            ip, err := netip.ParseAddr(addr.Address)
            if err == nil && ip.Is6() && !ip.Is4In6() {
                return true, nil  // Found an IPv6 address on a node
            }
        }
    }
    return false, nil
}
```

## Creating a Dual-Stack Service

```go
package main

import (
    "context"

    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

func createDualStackService(
    clientset *kubernetes.Clientset,
    namespace, name string,
    selector map[string]string,
    port int32,
) error {
    // Request dual-stack allocation with IPv4 as the primary service family.
    ipFamilyPolicyPreferDualStack := corev1.IPFamilyPolicyPreferDualStack
    ipFamilies := []corev1.IPFamily{
        corev1.IPv4Protocol,
        corev1.IPv6Protocol,
    }

    service := &corev1.Service{
        ObjectMeta: metav1.ObjectMeta{
            Name:      name,
            Namespace: namespace,
        },
        Spec: corev1.ServiceSpec{
            Selector:       selector,
            IPFamilyPolicy: &ipFamilyPolicyPreferDualStack,
            IPFamilies:     ipFamilies,
            Ports: []corev1.ServicePort{
                {
                    Port:     port,
                    Protocol: corev1.ProtocolTCP,
                },
            },
            Type: corev1.ServiceTypeClusterIP,
        },
    }

    _, err := clientset.CoreV1().Services(namespace).Create(
        context.Background(), service, metav1.CreateOptions{},
    )
    return err
}
```

## IPv6 Address Validation in CRD Webhook

```go
package main

import (
    "context"
    "fmt"
    "net/netip"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

// NetworkDevice is a custom resource with IPv6 address
type NetworkDevice struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`
    Spec              NetworkDeviceSpec `json:"spec,omitempty"`
}

type NetworkDeviceSpec struct {
    IPv6Address string `json:"ipv6Address"`
    PrefixLen   int    `json:"prefixLen,omitempty"`
}

type NetworkDeviceCustomValidator struct{}

// ValidateCreate validates IPv6 on CRD creation.
func (v *NetworkDeviceCustomValidator) ValidateCreate(_ context.Context, obj *NetworkDevice) (admission.Warnings, error) {
    return nil, validateIPv6(obj)
}

func (v *NetworkDeviceCustomValidator) ValidateUpdate(_ context.Context, _, newObj *NetworkDevice) (admission.Warnings, error) {
    return nil, validateIPv6(newObj)
}

func (v *NetworkDeviceCustomValidator) ValidateDelete(_ context.Context, _ *NetworkDevice) (admission.Warnings, error) {
    return nil, nil
}

func validateIPv6(d *NetworkDevice) error {
    addr, err := netip.ParseAddr(d.Spec.IPv6Address)
    if err != nil || !addr.Is6() || addr.Is4In6() {
        return fmt.Errorf("spec.ipv6Address is not a valid IPv6 address: %s",
            d.Spec.IPv6Address)
    }

    if d.Spec.PrefixLen < 0 || d.Spec.PrefixLen > 128 {
        return fmt.Errorf("spec.prefixLen must be between 0 and 128")
    }
    return nil
}
```

## Getting Pod IPv6 Addresses in a Controller

```go
package main

import (
    "context"
    "net/netip"

    corev1 "k8s.io/api/core/v1"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

func getPodIPv6Addresses(
    ctx context.Context,
    k8sClient client.Client,
    namespace, name string,
) ([]string, error) {
    pod := &corev1.Pod{}
    if err := k8sClient.Get(ctx, client.ObjectKey{
        Namespace: namespace,
        Name:      name,
    }, pod); err != nil {
        return nil, err
    }

    var ipv6Addrs []string
    for _, podIP := range pod.Status.PodIPs {
        ip, err := netip.ParseAddr(podIP.IP)
        if err == nil && ip.Is6() && !ip.Is4In6() {
            ipv6Addrs = append(ipv6Addrs, podIP.IP)
        }
    }

    return ipv6Addrs, nil
}
```

## NetworkPolicy for IPv6

```go
package main

import (
    "context"

    networkingv1 "k8s.io/api/networking/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

func createIPv6NetworkPolicy(
    clientset *kubernetes.Clientset,
    namespace string,
) error {
    policy := &networkingv1.NetworkPolicy{
        ObjectMeta: metav1.ObjectMeta{
            Name:      "allow-ipv6-internal",
            Namespace: namespace,
        },
        Spec: networkingv1.NetworkPolicySpec{
            PodSelector: metav1.LabelSelector{},
            PolicyTypes: []networkingv1.PolicyType{
                networkingv1.PolicyTypeIngress,
            },
            Ingress: []networkingv1.NetworkPolicyIngressRule{
                {
                    From: []networkingv1.NetworkPolicyPeer{
                        {
                            // Allow from a specific IPv6 prefix only
                            IPBlock: &networkingv1.IPBlock{
                                CIDR:   "2001:db8::/48",
                                Except: []string{"2001:db8:ff::/64"},
                            },
                        },
                    },
                },
            },
        },
    }

    _, err := clientset.NetworkingV1().NetworkPolicies(namespace).Create(
        context.Background(), policy, metav1.CreateOptions{},
    )
    return err
}
```

## Conclusion

Handling IPv6 in Go Kubernetes controllers involves using dual-stack service specs, validating IPv6 addresses in admission webhooks, and working with both IPv4 and IPv6 pod addresses. The `net/netip` package provides reliable IPv6 address validation for CRD admission. Always check `IPFamilyPolicy` when creating services to ensure dual-stack behavior in clusters that support it.
