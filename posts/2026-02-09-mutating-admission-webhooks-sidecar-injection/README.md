# How to Write Mutating Admission Webhooks to Inject Sidecar Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Webhooks, Sidecar, Admission Control

Description: Learn how to implement mutating admission webhooks in Go to automatically inject sidecar containers into pods for logging, monitoring, and service mesh functionality.

---

Service meshes like Istio automatically inject proxy containers into your pods. Logging platforms inject fluentd sidecars. Security tools inject scanning agents. All of this magic happens through mutating admission webhooks.

Unlike validating webhooks that only approve or deny, mutating webhooks modify resources before they're persisted. This lets you inject containers, add labels, mount volumes, or change any part of a resource declaratively. This guide shows you how to build sidecar injection webhooks.

## Understanding Mutation

Mutating webhooks receive admission requests and return JSON patches that modify the resource. Kubernetes applies these patches before running validating webhooks or persisting to etcd.

The patch format uses JSON Patch (RFC 6902), which specifies operations like add, remove, and replace on JSON paths.

## Setting Up the Mutation Webhook

Start with a basic webhook server structure similar to validating webhooks.

```go
// main.go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/runtime/serializer"
)

var (
    scheme = runtime.NewScheme()
    codecs = serializer.NewCodecFactory(scheme)
)

func init() {
    corev1.AddToScheme(scheme)
    admissionv1.AddToScheme(scheme)
}

type patchOperation struct {
    Op    string      `json:"op"`
    Path  string      `json:"path"`
    Value interface{} `json:"value,omitempty"`
}

func (ws *WebhookServer) mutate(ar *admissionv1.AdmissionReview) *admissionv1.AdmissionResponse {
    req := ar.Request

    var pod corev1.Pod
    if err := json.Unmarshal(req.Object.Raw, &pod); err != nil {
        return &admissionv1.AdmissionResponse{
            Result: &metav1.Status{
                Message: err.Error(),
            },
        }
    }

    // Check if sidecar injection is enabled
    if !shouldInjectSidecar(&pod) {
        return &admissionv1.AdmissionResponse{
            Allowed: true,
        }
    }

    // Generate patches
    patches := createPatch(&pod)

    patchBytes, err := json.Marshal(patches)
    if err != nil {
        return &admissionv1.AdmissionResponse{
            Result: &metav1.Status{
                Message: err.Error(),
            },
        }
    }

    return &admissionv1.AdmissionResponse{
        Allowed: true,
        Patch:   patchBytes,
        PatchType: func() *admissionv1.PatchType {
            pt := admissionv1.PatchTypeJSONPatch
            return &pt
        }(),
    }
}
```

## Implementing Sidecar Injection Logic

Create functions that generate JSON patches to inject sidecars.

```go
// injection.go
package main

import (
    "fmt"

    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/resource"
)

const (
    sidecarAnnotation = "sidecar.example.com/inject"
    injectedLabel     = "sidecar.example.com/injected"
)

func shouldInjectSidecar(pod *corev1.Pod) bool {
    // Check annotation
    if pod.Annotations == nil {
        return false
    }

    inject, ok := pod.Annotations[sidecarAnnotation]
    if !ok || inject != "true" {
        return false
    }

    // Skip if already injected
    if pod.Labels != nil {
        if _, ok := pod.Labels[injectedLabel]; ok {
            return false
        }
    }

    return true
}

func createPatch(pod *corev1.Pod) []patchOperation {
    var patches []patchOperation

    // Add sidecar container
    sidecar := createSidecarContainer()
    patches = append(patches, addContainer(pod.Spec.Containers, sidecar)...)

    // Add volume for shared data
    volume := createSharedVolume()
    patches = append(patches, addVolume(pod.Spec.Volumes, volume)...)

    // Add init container to setup shared volume
    initContainer := createInitContainer()
    patches = append(patches, addInitContainer(pod.Spec.InitContainers, initContainer)...)

    // Add labels
    patches = append(patches, addLabels(pod.Labels)...)

    // Add annotations
    patches = append(patches, addAnnotations(pod.Annotations)...)

    return patches
}

func createSidecarContainer() corev1.Container {
    return corev1.Container{
        Name:  "logging-sidecar",
        Image: "registry.example.com/logging-sidecar:v1.0.0",
        Args: []string{
            "--log-path=/var/log/app",
            "--output=stdout",
        },
        Resources: corev1.ResourceRequirements{
            Requests: corev1.ResourceList{
                corev1.ResourceCPU:    resource.MustParse("100m"),
                corev1.ResourceMemory: resource.MustParse("128Mi"),
            },
            Limits: corev1.ResourceList{
                corev1.ResourceCPU:    resource.MustParse("200m"),
                corev1.ResourceMemory: resource.MustParse("256Mi"),
            },
        },
        VolumeMounts: []corev1.VolumeMount{
            {
                Name:      "app-logs",
                MountPath: "/var/log/app",
                ReadOnly:  true,
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
    }
}

func createSharedVolume() corev1.Volume {
    return corev1.Volume{
        Name: "app-logs",
        VolumeSource: corev1.VolumeSource{
            EmptyDir: &corev1.EmptyDirVolumeSource{},
        },
    }
}

func createInitContainer() corev1.Container {
    return corev1.Container{
        Name:  "log-init",
        Image: "busybox:latest",
        Command: []string{
            "sh",
            "-c",
            "mkdir -p /var/log/app && chmod 777 /var/log/app",
        },
        VolumeMounts: []corev1.VolumeMount{
            {
                Name:      "app-logs",
                MountPath: "/var/log/app",
            },
        },
    }
}
```

## Creating JSON Patches

Implement functions that generate JSON patch operations.

```go
// patches.go
package main

import (
    corev1 "k8s.io/api/core/v1"
)

func addContainer(containers []corev1.Container, sidecar corev1.Container) []patchOperation {
    var patches []patchOperation

    if len(containers) == 0 {
        // First container - create array
        patches = append(patches, patchOperation{
            Op:    "add",
            Path:  "/spec/containers",
            Value: []corev1.Container{sidecar},
        })
    } else {
        // Add to existing array
        patches = append(patches, patchOperation{
            Op:    "add",
            Path:  "/spec/containers/-",
            Value: sidecar,
        })
    }

    return patches
}

func addVolume(volumes []corev1.Volume, volume corev1.Volume) []patchOperation {
    var patches []patchOperation

    if len(volumes) == 0 {
        patches = append(patches, patchOperation{
            Op:    "add",
            Path:  "/spec/volumes",
            Value: []corev1.Volume{volume},
        })
    } else {
        patches = append(patches, patchOperation{
            Op:    "add",
            Path:  "/spec/volumes/-",
            Value: volume,
        })
    }

    return patches
}

func addInitContainer(initContainers []corev1.Container, initContainer corev1.Container) []patchOperation {
    var patches []patchOperation

    if len(initContainers) == 0 {
        patches = append(patches, patchOperation{
            Op:    "add",
            Path:  "/spec/initContainers",
            Value: []corev1.Container{initContainer},
        })
    } else {
        patches = append(patches, patchOperation{
            Op:    "add",
            Path:  "/spec/initContainers/-",
            Value: initContainer,
        })
    }

    return patches
}

func addLabels(labels map[string]string) []patchOperation {
    var patches []patchOperation

    if labels == nil {
        // Create labels map
        patches = append(patches, patchOperation{
            Op:   "add",
            Path: "/metadata/labels",
            Value: map[string]string{
                injectedLabel: "true",
            },
        })
    } else {
        // Add to existing labels
        patches = append(patches, patchOperation{
            Op:    "add",
            Path:  "/metadata/labels/" + escapeJSONPointer(injectedLabel),
            Value: "true",
        })
    }

    return patches
}

func addAnnotations(annotations map[string]string) []patchOperation {
    var patches []patchOperation

    timestamp := time.Now().Format(time.RFC3339)

    if annotations == nil {
        patches = append(patches, patchOperation{
            Op:   "add",
            Path: "/metadata/annotations",
            Value: map[string]string{
                "sidecar.example.com/injected-at": timestamp,
            },
        })
    } else {
        patches = append(patches, patchOperation{
            Op:    "add",
            Path:  "/metadata/annotations/sidecar.example.com~1injected-at",
            Value: timestamp,
        })
    }

    return patches
}

// escapeJSONPointer escapes ~ and / in JSON pointer paths
func escapeJSONPointer(s string) string {
    s = strings.Replace(s, "~", "~0", -1)
    s = strings.Replace(s, "/", "~1", -1)
    return s
}
```

## Injecting Environment-Specific Sidecars

Customize sidecar injection based on pod metadata.

```go
func createPatch(pod *corev1.Pod) []patchOperation {
    var patches []patchOperation

    // Determine sidecar configuration based on namespace
    config := getSidecarConfig(pod.Namespace, pod.Annotations)

    // Add monitoring sidecar for production
    if strings.HasPrefix(pod.Namespace, "prod-") {
        monitoring := createMonitoringSidecar(config)
        patches = append(patches, addContainer(pod.Spec.Containers, monitoring)...)
    }

    // Add logging sidecar
    logging := createLoggingSidecar(config)
    patches = append(patches, addContainer(pod.Spec.Containers, logging)...)

    // Add security scanner sidecar if enabled
    if config.SecurityScanningEnabled {
        scanner := createSecuritySidecar(config)
        patches = append(patches, addContainer(pod.Spec.Containers, scanner)...)
    }

    // Add required volumes
    for _, volume := range config.Volumes {
        patches = append(patches, addVolume(pod.Spec.Volumes, volume)...)
    }

    return patches
}

type SidecarConfig struct {
    LogLevel                string
    MetricsEndpoint         string
    SecurityScanningEnabled bool
    Volumes                 []corev1.Volume
}

func getSidecarConfig(namespace string, annotations map[string]string) SidecarConfig {
    config := SidecarConfig{
        LogLevel:        "info",
        MetricsEndpoint: "http://metrics-collector:9090",
    }

    // Override from annotations
    if level, ok := annotations["sidecar.example.com/log-level"]; ok {
        config.LogLevel = level
    }

    if endpoint, ok := annotations["sidecar.example.com/metrics-endpoint"]; ok {
        config.MetricsEndpoint = endpoint
    }

    if scan, ok := annotations["sidecar.example.com/security-scan"]; ok && scan == "true" {
        config.SecurityScanningEnabled = true
    }

    // Add shared volumes
    config.Volumes = []corev1.Volume{
        {
            Name: "app-logs",
            VolumeSource: corev1.VolumeSource{
                EmptyDir: &corev1.EmptyDirVolumeSource{},
            },
        },
    }

    return config
}
```

## Modifying Existing Containers

Sometimes you need to modify existing containers rather than just adding sidecars.

```go
func addVolumeMountsToContainers(pod *corev1.Pod) []patchOperation {
    var patches []patchOperation

    volumeMount := corev1.VolumeMount{
        Name:      "app-logs",
        MountPath: "/var/log/app",
    }

    for i := range pod.Spec.Containers {
        path := fmt.Sprintf("/spec/containers/%d/volumeMounts", i)

        if len(pod.Spec.Containers[i].VolumeMounts) == 0 {
            // Create volumeMounts array
            patches = append(patches, patchOperation{
                Op:    "add",
                Path:  path,
                Value: []corev1.VolumeMount{volumeMount},
            })
        } else {
            // Append to existing volumeMounts
            patches = append(patches, patchOperation{
                Op:    "add",
                Path:  path + "/-",
                Value: volumeMount,
            })
        }
    }

    return patches
}
```

## Deploying the Mutating Webhook

Create the MutatingWebhookConfiguration.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: sidecar-injector
webhooks:
- name: inject.sidecar.example.com
  clientConfig:
    service:
      name: sidecar-injector
      namespace: webhook-system
      path: /mutate
    caBundle: LS0tLS1CRUdJTi...
  rules:
  - operations: ["CREATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  timeoutSeconds: 10
  failurePolicy: Ignore
  namespaceSelector:
    matchLabels:
      sidecar-injection: enabled
  objectSelector:
    matchExpressions:
    - key: sidecar.example.com/inject
      operator: In
      values: ["true"]
```

## Testing Sidecar Injection

Create a test pod with the injection annotation.

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: test-app
  namespace: default
  annotations:
    sidecar.example.com/inject: "true"
spec:
  containers:
  - name: app
    image: nginx:latest
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
EOF

# Check the pod
kubectl get pod test-app -o yaml
```

You should see the sidecar containers, init containers, volumes, and labels that were injected.

## Debugging Injection Issues

Check webhook logs.

```bash
kubectl logs -n webhook-system deployment/sidecar-injector
```

Verify the webhook is being called.

```bash
kubectl get mutatingwebhookconfiguration sidecar-injector -o yaml
```

Test without injection to isolate issues.

```bash
# Pod without annotation should not be modified
kubectl run test-no-inject --image=nginx
kubectl get pod test-no-inject -o yaml | grep sidecar
```

## Conclusion

Mutating admission webhooks enable powerful automation patterns like sidecar injection. They modify resources transparently, adding capabilities without requiring users to change their manifests.

Use mutation for cross-cutting concerns like logging, monitoring, security scanning, and service mesh integration. Keep mutation logic simple and predictable. Add comprehensive logging to debug injection issues. Use namespace and object selectors to control where injection applies.

Deploy webhooks with appropriate failure policies. Ignore is safer during development to prevent blocking pod creation. Fail provides stronger guarantees in production but requires careful testing.
