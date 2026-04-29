# How to Write Custom Kubewarden Policies in Go - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Go, Policy as Code, Kubernetes, WebAssembly, Admission Control, SUSE Rancher

Description: Learn how to write custom Kubewarden admission policies in Go compiled to WebAssembly using the Kubewarden Go SDK for type-safe Kubernetes object validation.

---

Writing Kubewarden policies in Go uses the familiar Go ecosystem and the Kubewarden Go SDK to inspect Kubernetes admission requests. The policy compiles to a WASM module that Kubewarden runs in a sandboxed environment.

---

## Prerequisites

```bash
# Install Go 1.25.x

curl -Lo go.tar.gz https://go.dev/dl/go1.25.9.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go.tar.gz
export PATH=$PATH:/usr/local/go/bin

# Install TinyGo (required for WASM compilation)
curl -Lo tinygo.tar.gz https://github.com/tinygo-org/tinygo/releases/download/v0.39.0/tinygo0.39.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf tinygo.tar.gz
export PATH=$PATH:/usr/local/tinygo/bin

# Install kwctl
curl -Lo kwctl https://github.com/kubewarden/kwctl/releases/latest/download/kwctl-linux-amd64
chmod +x kwctl && sudo mv kwctl /usr/local/bin/
```

---

## Step 1: Create a New Policy Project

```bash
# Initialize the project
mkdir disallow-latest-tag && cd disallow-latest-tag
go mod init github.com/my-org/disallow-latest-tag

# Add Kubewarden SDK
go get github.com/kubewarden/policy-sdk-go
```

---

## Step 2: Write the Policy

```go
// main.go
package main

import (
    "encoding/json"
    "fmt"
    "strings"

    corev1 "github.com/kubewarden/k8s-objects/api/core/v1"
    kubewarden "github.com/kubewarden/policy-sdk-go"
    kubewarden_protocol "github.com/kubewarden/policy-sdk-go/protocol"
    wapc "github.com/wapc/wapc-guest-tinygo"
)

const httpBadRequestStatusCode = 400

func validate(payload []byte) ([]byte, error) {
    // Unmarshal the admission request
    validationRequest := kubewarden_protocol.ValidationRequest{}
    if err := json.Unmarshal(payload, &validationRequest); err != nil {
        return kubewarden.RejectRequest(
            kubewarden.Message(fmt.Sprintf("Cannot unmarshal request: %v", err)),
            kubewarden.Code(httpBadRequestStatusCode),
        )
    }

    // Get the pod object
    pod := &corev1.Pod{}
    if err := json.Unmarshal(validationRequest.Request.Object, pod); err != nil {
        return kubewarden.RejectRequest(
            kubewarden.Message(fmt.Sprintf("Cannot unmarshal Pod object: %v", err)),
            kubewarden.Code(httpBadRequestStatusCode),
        )
    }

    // Check all pod container types for the :latest tag or a missing tag
    violations := []string{}
    for _, container := range pod.Spec.InitContainers {
        if usesLatestOrNoTag(container.Image) {
            violations = append(violations,
                fmt.Sprintf("Init container '%s' uses the :latest tag or has no tag - use a specific version or digest", container.Name))
        }
    }
    for _, container := range pod.Spec.Containers {
        if usesLatestOrNoTag(container.Image) {
            violations = append(violations,
                fmt.Sprintf("Container '%s' uses the :latest tag or has no tag - use a specific version or digest", container.Name))
        }
    }
    for _, container := range pod.Spec.EphemeralContainers {
        if usesLatestOrNoTag(container.Image) {
            violations = append(violations,
                fmt.Sprintf("Ephemeral container '%s' uses the :latest tag or has no tag - use a specific version or digest", container.Name))
        }
    }

    if len(violations) > 0 {
        return kubewarden.RejectRequest(
            kubewarden.Message(strings.Join(violations, "; ")),
            kubewarden.NoCode,
        )
    }

    return kubewarden.AcceptRequest()
}

func validateSettings(payload []byte) ([]byte, error) {
    return kubewarden.AcceptSettings()
}

func usesLatestOrNoTag(image string) bool {
    if strings.Contains(image, "@") {
        return false
    }

    lastSlash := strings.LastIndex(image, "/")
    lastColon := strings.LastIndex(image, ":")

    return strings.HasSuffix(image, ":latest") || lastColon <= lastSlash
}

func main() {
    wapc.RegisterFunctions(wapc.Functions{
        "validate":          validate,
        "validate_settings": validateSettings,
    })
}
```

---

## Step 3: Build the WASM Policy

```bash
# Sync module dependencies
go mod tidy

# Compile to WASM using TinyGo
tinygo build \
  -o disallow-latest-tag.wasm \
  -target wasi \
  -no-debug .

# Verify the WASM file was created
ls -la disallow-latest-tag.wasm
```

---

## Step 4: Test the Policy

```bash
# Test against a pod using :latest tag (should be rejected)
cat > test-latest.json << EOF
{
  "request": {
    "operation": "CREATE",
    "kind": {"version":"v1","kind":"Pod"},
    "object": {
      "spec": {
        "containers": [{"name":"app","image":"nginx:latest"}]
      }
    }
  }
}
EOF

kwctl run --request-path test-latest.json disallow-latest-tag.wasm
```

---

## Step 5: Deploy the Policy

```bash
# Create policy metadata
cat > metadata.yaml << EOF
rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
    operations: ["CREATE", "UPDATE"]
mutating: false
contextAwareResources: []
executionMode: kubewarden-wapc
policyType: kubernetes
backgroundAudit: true
annotations:
  io.kubewarden.policy.title: disallow-latest-tag
  io.kubewarden.policy.version: v0.1.0
  io.kubewarden.policy.description: Reject Pods that use the latest tag or omit an image tag
  io.kubewarden.policy.author: my-org
  io.kubewarden.policy.url: https://github.com/my-org/disallow-latest-tag
  io.kubewarden.policy.source: https://github.com/my-org/disallow-latest-tag
  io.kubewarden.policy.license: Apache-2.0
  io.kubewarden.policy.severity: medium
  io.kubewarden.policy.category: Resource validation
  io.kubewarden.policy.ociUrl: ghcr.io/my-org/disallow-latest-tag
EOF

# Annotate the policy with metadata
kwctl annotate \
  --metadata-path metadata.yaml \
  --output-path annotated-policy.wasm \
  disallow-latest-tag.wasm

# Push to OCI registry
kwctl push annotated-policy.wasm \
  ghcr.io/my-org/disallow-latest-tag:v0.1.0

# Create a ClusterAdmissionPolicy
kubectl apply -f - <<EOF
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: disallow-latest-tag
spec:
  module: registry://ghcr.io/my-org/disallow-latest-tag:v0.1.0
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
EOF
```

---

## Best Practices

- Use TinyGo's WASM compilation (not standard Go) - it produces much smaller WASM binaries.
- Write table-driven tests in Go to cover edge cases before building the WASM.
- Use `kwctl verify` to validate policy signatures before deploying to production clusters.
