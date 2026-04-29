# How to Build Kubernetes Operators That Handle IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Operator, IPv6, Go, Controller-runtime

Description: Build Kubernetes operators using controller-runtime that handle IPv6 addresses in custom resources, service management, and network configuration.

## Operator IPv6 Considerations

Kubernetes operators that manage network resources must understand IPv6:
- Custom Resources may include IPv6 addresses as fields
- Services can have IPv6 cluster IPs
- Pods in dual-stack clusters get both IPv4 and IPv6 addresses
- Operators should validate IPv6 CIDRs and addresses

## Setting Up the Operator with IPv6 Awareness

```go
// main.go
package main

import (
    "os"

    "k8s.io/apimachinery/pkg/runtime"
    utilruntime "k8s.io/apimachinery/pkg/util/runtime"
    clientgoscheme "k8s.io/client-go/kubernetes/scheme"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/healthz"
    metricsserver "sigs.k8s.io/controller-runtime/pkg/metrics/server"

    myv1 "example.com/my-operator/api/v1"
    "example.com/my-operator/controllers"
)

var scheme = runtime.NewScheme()

func init() {
    utilruntime.Must(clientgoscheme.AddToScheme(scheme))
    utilruntime.Must(myv1.AddToScheme(scheme))
}

func main() {
    mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
        Scheme: scheme,
        // Metrics on IPv6
        Metrics: metricsserver.Options{
            BindAddress: "[::]:8080",
        },
        // Health probes on IPv6
        HealthProbeBindAddress: "[::]:8081",
        LeaderElectionID: "my-operator.example.com",
    })
    if err != nil {
        os.Exit(1)
    }

    if err = (&controllers.MyResourceReconciler{
        Client: mgr.GetClient(),
        Scheme: mgr.GetScheme(),
    }).SetupWithManager(mgr); err != nil {
        os.Exit(1)
    }

    if err := mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
        os.Exit(1)
    }

    if err := mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
        os.Exit(1)
    }

    if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
        os.Exit(1)
    }
}
```

## Custom Resource with IPv6 Fields

```go
// api/v1/myresource_types.go
package v1

import metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

type MyResourceSpec struct {
    // IPv6 address field, validated by the reconciler
    IPv6Address string `json:"ipv6Address,omitempty"`

    // IPv6 CIDR field, validated by the reconciler
    IPv6CIDR string `json:"ipv6CIDR,omitempty"`

    // Whether to enable IPv6
    EnableIPv6 bool `json:"enableIPv6,omitempty"`
}

type MyResourceStatus struct {
    // Assigned IPv6 addresses
    IPv6Addresses []string `json:"ipv6Addresses,omitempty"`
    Conditions    []metav1.Condition `json:"conditions,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
type MyResource struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   MyResourceSpec   `json:"spec,omitempty"`
    Status MyResourceStatus `json:"status,omitempty"`
}
```

## Reconciler with IPv6 Logic

```go
// controllers/myresource_controller.go
package controllers

import (
    "context"
    "fmt"
    "net"

    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/runtime"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"

    myv1 "example.com/my-operator/api/v1"
)

type MyResourceReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

func (r *MyResourceReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := ctrl.LoggerFrom(ctx)

    // Fetch the resource
    var myResource myv1.MyResource
    if err := r.Get(ctx, req.NamespacedName, &myResource); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Validate IPv6 address if provided
    if myResource.Spec.IPv6Address != "" {
        ip := net.ParseIP(myResource.Spec.IPv6Address)
        if ip == nil || ip.To4() != nil {
            // Not a valid IPv6 address
            logger.Error(fmt.Errorf("invalid IPv6 address %q", myResource.Spec.IPv6Address), "Invalid IPv6 address",
                "address", myResource.Spec.IPv6Address)
            return ctrl.Result{}, nil
        }
    }

    // Validate IPv6 CIDR if provided
    if myResource.Spec.IPv6CIDR != "" {
        ip, _, err := net.ParseCIDR(myResource.Spec.IPv6CIDR)
        if err != nil || ip.To4() != nil {
            logger.Error(fmt.Errorf("invalid IPv6 CIDR %q", myResource.Spec.IPv6CIDR), "Invalid IPv6 CIDR",
                "cidr", myResource.Spec.IPv6CIDR)
            return ctrl.Result{}, nil
        }
    }

    // Get pod IPv6 addresses in the namespace
    var pods corev1.PodList
    if err := r.List(ctx, &pods, client.InNamespace(req.Namespace)); err != nil {
        return ctrl.Result{}, err
    }

    var ipv6Addresses []string
    for _, pod := range pods.Items {
        for _, ip := range pod.Status.PodIPs {
            parsed := net.ParseIP(ip.IP)
            // Collect only IPv6 addresses (To4() returns nil for IPv6)
            if parsed != nil && parsed.To4() == nil {
                ipv6Addresses = append(ipv6Addresses, ip.IP)
            }
        }
    }

    // Update status with IPv6 addresses
    myResource.Status.IPv6Addresses = ipv6Addresses
    if err := r.Status().Update(ctx, &myResource); err != nil {
        return ctrl.Result{}, err
    }

    return ctrl.Result{}, nil
}
```

## Creating Dual-Stack Services from an Operator

```go
// Create a service with IPv6 support
func (r *MyResourceReconciler) createService(ctx context.Context, resource *myv1.MyResource) error {
    service := &corev1.Service{
        ObjectMeta: metav1.ObjectMeta{
            Name:      resource.Name,
            Namespace: resource.Namespace,
        },
        Spec: corev1.ServiceSpec{
            Selector: map[string]string{"app": resource.Name},
            Ports: []corev1.ServicePort{
                {Port: 80, Protocol: corev1.ProtocolTCP},
            },
            // Enable dual-stack
            IPFamilyPolicy: func() *corev1.IPFamilyPolicyType {
                p := corev1.IPFamilyPolicyPreferDualStack
                return &p
            }(),
            IPFamilies: []corev1.IPFamily{
                corev1.IPv6Protocol,
                corev1.IPv4Protocol,
            },
        },
    }

    return r.Create(ctx, service)
}
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) to monitor your Kubernetes operator's metrics endpoint over IPv6 using the pod or Service IPv6 address, for example `http://[2001:db8::10]:8080/metrics`. Set up alerts for reconciliation errors and operator health degradation.

## Conclusion

Building Kubernetes operators with IPv6 support requires validating IPv6 addresses and CIDRs using Go's `net.ParseIP` and `net.ParseCIDR`, handling dual-stack service creation with `IPFamilyPolicy`, and exposing operator metrics and health endpoints on IPv6 interfaces. Test your operator against both IPv4-only and dual-stack clusters.
