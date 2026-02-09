# How to Implement Mutating Webhooks for Automatic Sidecar Injection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Mutating Webhooks, Sidecar Injection, Service Mesh, Observability

Description: Learn how to build mutating admission webhooks that automatically inject sidecar containers into pods for logging, monitoring, service mesh proxies, and security agents without modifying application deployments.

---

Sidecar injection is a powerful pattern for adding capabilities to pods without changing application code. Mutating admission webhooks can automatically inject logging agents, monitoring exporters, service mesh proxies, or security scanners as sidecar containers. This guide shows you how to implement robust sidecar injection with proper configuration, conditional logic, and production best practices.

## Understanding Sidecar Injection

Sidecar containers run alongside application containers in the same pod, sharing network and storage namespaces. They provide cross-cutting concerns like logging, monitoring, or proxying without coupling to application code. Mutating webhooks inject sidecars at admission time, making the process transparent to developers.

The injection logic reads pod specifications, determines if sidecars are needed based on labels or annotations, and adds container definitions with appropriate configurations.

## Basic Sidecar Injection Logic

Extend the mutating webhook from the previous guide with sidecar injection:

```go
// sidecar.go
package main

import (
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/resource"
)

func injectSidecar(pod *corev1.Pod) []JSONPatch {
    var patches []JSONPatch

    // Check if sidecar injection is requested
    if pod.Annotations == nil {
        return patches
    }

    injectLogging := pod.Annotations["inject-logging"] == "true"
    injectMonitoring := pod.Annotations["inject-monitoring"] == "true"
    injectProxy := pod.Annotations["inject-proxy"] == "true"

    // Skip if no injection requested
    if !injectLogging && !injectMonitoring && !injectProxy {
        return patches
    }

    // Get current container count for indexing
    containerCount := len(pod.Spec.Containers)

    // Inject logging sidecar
    if injectLogging {
        loggingSidecar := createLoggingSidecar()
        patches = append(patches, JSONPatch{
            Op:    "add",
            Path:  fmt.Sprintf("/spec/containers/%d", containerCount),
            Value: loggingSidecar,
        })
        containerCount++
    }

    // Inject monitoring sidecar
    if injectMonitoring {
        monitoringSidecar := createMonitoringSidecar()
        patches = append(patches, JSONPatch{
            Op:    "add",
            Path:  fmt.Sprintf("/spec/containers/%d", containerCount),
            Value: monitoringSidecar,
        })
        containerCount++
    }

    // Inject proxy sidecar
    if injectProxy {
        proxySidecar := createProxySidecar()
        patches = append(patches, JSONPatch{
            Op:    "add",
            Path:  fmt.Sprintf("/spec/containers/%d", containerCount),
            Value: proxySidecar,
        })
    }

    // Add shared volumes if needed
    if injectLogging {
        patches = append(patches, createVolumePatches(pod)...)
    }

    return patches
}

func createLoggingSidecar() corev1.Container {
    return corev1.Container{
        Name:  "fluentbit",
        Image: "fluent/fluent-bit:2.0",
        Args: []string{
            "-c", "/fluent-bit/etc/fluent-bit.conf",
        },
        VolumeMounts: []corev1.VolumeMount{
            {
                Name:      "varlog",
                MountPath: "/var/log",
                ReadOnly:  true,
            },
            {
                Name:      "config",
                MountPath: "/fluent-bit/etc",
            },
        },
        Resources: corev1.ResourceRequirements{
            Limits: corev1.ResourceList{
                corev1.ResourceCPU:    resource.MustParse("200m"),
                corev1.ResourceMemory: resource.MustParse("256Mi"),
            },
            Requests: corev1.ResourceList{
                corev1.ResourceCPU:    resource.MustParse("100m"),
                corev1.ResourceMemory: resource.MustParse("128Mi"),
            },
        },
    }
}

func createMonitoringSidecar() corev1.Container {
    return corev1.Container{
        Name:  "prometheus-exporter",
        Image: "prom/node-exporter:v1.5.0",
        Ports: []corev1.ContainerPort{
            {
                Name:          "metrics",
                ContainerPort: 9100,
                Protocol:      corev1.ProtocolTCP,
            },
        },
        Resources: corev1.ResourceRequirements{
            Limits: corev1.ResourceList{
                corev1.ResourceCPU:    resource.MustParse("100m"),
                corev1.ResourceMemory: resource.MustParse("128Mi"),
            },
            Requests: corev1.ResourceList{
                corev1.ResourceCPU:    resource.MustParse("50m"),
                corev1.ResourceMemory: resource.MustParse("64Mi"),
            },
        },
    }
}

func createProxySidecar() corev1.Container {
    return corev1.Container{
        Name:  "envoy-proxy",
        Image: "envoyproxy/envoy:v1.25.0",
        Args: []string{
            "-c", "/etc/envoy/envoy.yaml",
        },
        Ports: []corev1.ContainerPort{
            {
                Name:          "proxy-inbound",
                ContainerPort: 15006,
            },
            {
                Name:          "proxy-admin",
                ContainerPort: 15000,
            },
        },
        Env: []corev1.EnvVar{
            {
                Name: "POD_NAME",
                ValueFrom: &corev1.EnvVarSource{
                    FieldRef: &corev1.ObjectFieldSelector{
                        FieldPath: "metadata.name",
                    },
                },
            },
            {
                Name: "POD_NAMESPACE",
                ValueFrom: &corev1.EnvVarSource{
                    FieldRef: &corev1.ObjectFieldSelector{
                        FieldPath: "metadata.namespace",
                    },
                },
            },
        },
        Resources: corev1.ResourceRequirements{
            Limits: corev1.ResourceList{
                corev1.ResourceCPU:    resource.MustParse("500m"),
                corev1.ResourceMemory: resource.MustParse("512Mi"),
            },
            Requests: corev1.ResourceList{
                corev1.ResourceCPU:    resource.MustParse("100m"),
                corev1.ResourceMemory: resource.MustParse("128Mi"),
            },
        },
    }
}

func createVolumePatches(pod *corev1.Pod) []JSONPatch {
    var patches []JSONPatch

    // Add shared volume if it doesn't exist
    volumeExists := false
    for _, vol := range pod.Spec.Volumes {
        if vol.Name == "varlog" {
            volumeExists = true
            break
        }
    }

    if !volumeExists {
        volumeIndex := len(pod.Spec.Volumes)
        patches = append(patches, JSONPatch{
            Op:   "add",
            Path: fmt.Sprintf("/spec/volumes/%d", volumeIndex),
            Value: corev1.Volume{
                Name: "varlog",
                VolumeSource: corev1.VolumeSource{
                    EmptyDir: &corev1.EmptyDirVolumeSource{},
                },
            },
        })
    }

    return patches
}
```

This implementation checks annotations to determine which sidecars to inject and adds them with appropriate configurations.

## Configuration Through Annotations

Use annotations to customize sidecar behavior:

```go
func parseSidecarConfig(pod *corev1.Pod) SidecarConfig {
    config := SidecarConfig{
        LoggingEnabled:    pod.Annotations["inject-logging"] == "true",
        MonitoringEnabled: pod.Annotations["inject-monitoring"] == "true",
        ProxyEnabled:      pod.Annotations["inject-proxy"] == "true",
    }

    // Parse custom resource limits
    if cpuLimit, exists := pod.Annotations["sidecar.logging.cpu-limit"]; exists {
        config.LoggingCPULimit = cpuLimit
    } else {
        config.LoggingCPULimit = "200m"
    }

    if memLimit, exists := pod.Annotations["sidecar.logging.memory-limit"]; exists {
        config.LoggingMemoryLimit = memLimit
    } else {
        config.LoggingMemoryLimit = "256Mi"
    }

    // Parse custom image versions
    if image, exists := pod.Annotations["sidecar.logging.image"]; exists {
        config.LoggingImage = image
    } else {
        config.LoggingImage = "fluent/fluent-bit:2.0"
    }

    return config
}

type SidecarConfig struct {
    LoggingEnabled      bool
    MonitoringEnabled   bool
    ProxyEnabled        bool
    LoggingCPULimit     string
    LoggingMemoryLimit  string
    LoggingImage        string
}
```

This allows users to customize sidecar behavior without changing the webhook code.

## Injecting Init Containers

Add init containers for setup tasks:

```go
func injectInitContainer(pod *corev1.Pod) []JSONPatch {
    var patches []JSONPatch

    if pod.Annotations["inject-proxy"] != "true" {
        return patches
    }

    // Add init container to set up iptables for traffic interception
    initContainer := corev1.Container{
        Name:  "proxy-init",
        Image: "istio/proxyv2:1.19.0",
        Args: []string{
            "istio-iptables",
            "-p", "15001",
            "-z", "15006",
            "-u", "1337",
            "-m", "REDIRECT",
            "-i", "*",
            "-x", "",
            "-b", "*",
            "-d", "15090,15021,15020",
        },
        SecurityContext: &corev1.SecurityContext{
            Capabilities: &corev1.Capabilities{
                Add: []corev1.Capability{"NET_ADMIN", "NET_RAW"},
            },
            RunAsUser:  int64Ptr(0),
            RunAsGroup: int64Ptr(0),
        },
    }

    initIndex := len(pod.Spec.InitContainers)
    patches = append(patches, JSONPatch{
        Op:    "add",
        Path:  fmt.Sprintf("/spec/initContainers/%d", initIndex),
        Value: initContainer,
    })

    return patches
}
```

Init containers run before application containers, setting up networking or file systems.

## Namespace-Based Injection

Enable automatic injection for entire namespaces:

```go
func shouldInjectSidecar(pod *corev1.Pod, namespace *corev1.Namespace) bool {
    // Check if explicitly disabled
    if pod.Annotations["sidecar-injection"] == "disabled" {
        return false
    }

    // Check namespace labels
    if namespace.Labels["sidecar-injection"] == "enabled" {
        return true
    }

    // Check pod annotation
    if pod.Annotations["sidecar-injection"] == "enabled" {
        return true
    }

    return false
}
```

Query the namespace in the webhook handler:

```go
import (
    "context"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

func mutateHandler(w http.ResponseWriter, r *http.Request) {
    // ... existing code ...

    // Create Kubernetes client
    config, err := rest.InClusterConfig()
    if err != nil {
        log.Printf("failed to get cluster config: %v", err)
        return
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        log.Printf("failed to create clientset: %v", err)
        return
    }

    // Get namespace
    ns, err := clientset.CoreV1().Namespaces().Get(
        context.Background(),
        admissionReview.Request.Namespace,
        metav1.GetOptions{},
    )
    if err != nil {
        log.Printf("failed to get namespace: %v", err)
        return
    }

    // Check if injection should happen
    if !shouldInjectSidecar(pod, ns) {
        // Return with no patches
        admissionResponse.Allowed = true
        // ... send response ...
        return
    }

    // ... existing mutation code ...
}
```

## Handling Volume Mounts

Share volumes between application and sidecar containers:

```go
func injectSharedVolumes(pod *corev1.Pod) []JSONPatch {
    var patches []JSONPatch

    // Add shared log volume
    patches = append(patches, JSONPatch{
        Op:   "add",
        Path: "/spec/volumes/-",
        Value: corev1.Volume{
            Name: "app-logs",
            VolumeSource: corev1.VolumeSource{
                EmptyDir: &corev1.EmptyDirVolumeSource{},
            },
        },
    })

    // Mount volume in application containers
    for i := range pod.Spec.Containers {
        patches = append(patches, JSONPatch{
            Op:   "add",
            Path: fmt.Sprintf("/spec/containers/%d/volumeMounts/-", i),
            Value: corev1.VolumeMount{
                Name:      "app-logs",
                MountPath: "/var/log/app",
            },
        })
    }

    return patches
}
```

This creates a shared volume for logs that both application and sidecar can access.

## Testing Sidecar Injection

Deploy a test pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-sidecar
  annotations:
    inject-logging: "true"
    inject-monitoring: "true"
    sidecar.logging.cpu-limit: "300m"
spec:
  containers:
    - name: app
      image: nginx:1.21
```

Check the injected sidecars:

```bash
kubectl apply -f test-pod.yaml
kubectl get pod test-sidecar -o jsonpath='{.spec.containers[*].name}'
# Should show: app fluentbit prometheus-exporter

kubectl describe pod test-sidecar
```

## Webhook Configuration

Register the mutating webhook:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: sidecar-injector
webhooks:
  - name: sidecar.admission-webhook.svc
    clientConfig:
      service:
        name: admission-webhook
        namespace: default
        path: /mutate
      caBundle: <base64-ca-cert>
    rules:
      - operations: ["CREATE"]
        apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["pods"]
    admissionReviewVersions: ["v1"]
    sideEffects: None
    failurePolicy: Ignore
    namespaceSelector:
      matchExpressions:
        - key: sidecar-injection
          operator: In
          values: ["enabled"]
```

Use `failurePolicy: Ignore` to prevent webhook failures from blocking pod creation.

## Conclusion

Mutating webhooks enable automatic sidecar injection without changing application deployments. Implement conditional logic based on annotations or namespace labels, configure sidecars through annotations, and inject init containers when needed. Share volumes between application and sidecar containers for log collection or configuration. Test injection thoroughly and use namespace selectors to limit webhook scope. Set appropriate failure policies to prevent webhook issues from affecting pod creation.

Sidecar injection is essential for service meshes, observability, and security solutions that need to augment application functionality transparently.
