# How to Write Custom Kubewarden Policies in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Kubernetes, Policy, Go, WebAssembly

Description: Learn how to write custom Kubewarden admission control policies in Go using the TinyGo compiler and Kubewarden Go SDK for WebAssembly compilation.

## Introduction

Go is a popular choice for writing Kubewarden policies, especially for teams already familiar with Kubernetes tooling (which is written in Go). Kubewarden provides a Go SDK that enables you to write policies in idiomatic Go, compile them to WebAssembly using TinyGo, and deploy them as Kubewarden admission policies.

## Prerequisites

- Go 1.25 or later
- TinyGo 0.40.1 or later (for Wasm compilation)
- `kwctl` CLI installed
- Basic Go programming knowledge

## Setting Up the Development Environment

```bash
# Install TinyGo

# macOS
brew tap tinygo-org/tools
brew install tinygo

# Linux (Ubuntu/Debian)
wget https://github.com/tinygo-org/tinygo/releases/download/v0.40.1/tinygo_0.40.1_amd64.deb
sudo dpkg -i tinygo_0.40.1_amd64.deb

# Verify TinyGo installation
tinygo version

# Verify kwctl installation
kwctl --version
```

## Creating a New Go Policy

```bash
# Create a new policy
mkdir my-go-policy && cd my-go-policy

# Initialize the Go module
go mod init github.com/my-org/my-go-policy

# Install the Kubewarden Go SDK and TinyGo-compatible dependencies
go get github.com/kubewarden/policy-sdk-go@latest \
  github.com/kubewarden/k8s-objects/api/core/v1 \
  github.com/wapc/wapc-guest-tinygo
```

## Project Structure

```text
my-go-policy/
├── go.mod
├── go.sum
├── main.go             # Policy entrypoints and validation logic
├── metadata.yml        # Policy metadata
└── Makefile
```

## Writing the Policy

### Main Policy File

```go
// main.go - Kubewarden policy in Go
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

// Settings holds the policy configuration.
type Settings struct {
	ExemptImages []string `json:"exemptImages"`
}

func (s *Settings) Valid() (bool, error) {
	for _, image := range s.ExemptImages {
		if image == "" {
			return false, fmt.Errorf("exemptImages entries must not be empty")
		}
	}

	return true, nil
}

func (s *Settings) IsExempt(image string) bool {
	for _, exemptImage := range s.ExemptImages {
		if exemptImage == image {
			return true
		}
	}

	return false
}

// main registers the waPC entrypoints used by Kubewarden.
func main() {
	wapc.RegisterFunctions(wapc.Functions{
		"validate":          validate,
		"validate_settings": validateSettings,
	})
}

func validate(payload []byte) ([]byte, error) {
	validationRequest := kubewarden_protocol.ValidationRequest{}
	if err := json.Unmarshal(payload, &validationRequest); err != nil {
		return kubewarden.RejectRequest(
			kubewarden.Message(fmt.Sprintf("Cannot parse request: %v", err)),
			kubewarden.Code(httpBadRequestStatusCode))
	}

	settings, err := newSettings(validationRequest.Settings)
	if err != nil {
		return kubewarden.RejectRequest(
			kubewarden.Message(fmt.Sprintf("Cannot parse settings: %v", err)),
			kubewarden.Code(httpBadRequestStatusCode))
	}

	pod := &corev1.Pod{}
	if err := json.Unmarshal(validationRequest.Request.Object, pod); err != nil {
		return kubewarden.RejectRequest(
			kubewarden.Message(fmt.Sprintf("Cannot decode Pod object: %v", err)),
			kubewarden.Code(httpBadRequestStatusCode))
	}

	if err := validatePod(pod, settings); err != nil {
		return kubewarden.RejectRequest(
			kubewarden.Message(err.Error()),
			kubewarden.NoCode)
	}

	return kubewarden.AcceptRequest()
}

func validatePod(pod *corev1.Pod, settings Settings) error {
	if pod.Spec == nil {
		return nil
	}

	if err := validateContainers(pod.Spec.Containers, settings, "container"); err != nil {
		return err
	}

	if err := validateContainers(pod.Spec.InitContainers, settings, "init container"); err != nil {
		return err
	}

	return validateEphemeralContainers(pod.Spec.EphemeralContainers, settings)
}

func validateContainers(containers []*corev1.Container, settings Settings, containerType string) error {
	for _, container := range containers {
		if container == nil || settings.IsExempt(container.Image) {
			continue
		}

		if isLatestTag(container.Image) {
			return fmt.Errorf(
				"%s %q uses the 'latest' tag. Use a specific version tag",
				containerType,
				stringValue(container.Name, "unnamed"))
		}
	}

	return nil
}

func validateEphemeralContainers(containers []*corev1.EphemeralContainer, settings Settings) error {
	for _, container := range containers {
		if container == nil || settings.IsExempt(container.Image) {
			continue
		}

		if isLatestTag(container.Image) {
			return fmt.Errorf(
				"ephemeral container %q uses the 'latest' tag. Use a specific version tag",
				stringValue(container.Name, "unnamed"))
		}
	}

	return nil
}

func isLatestTag(image string) bool {
	imageWithoutDigest := image
	hasDigest := false

	if at := strings.Index(image, "@"); at != -1 {
		imageWithoutDigest = image[:at]
		hasDigest = true
	}

	lastSlash := strings.LastIndex(imageWithoutDigest, "/")
	lastColon := strings.LastIndex(imageWithoutDigest, ":")

	if lastColon > lastSlash {
		return strings.HasSuffix(imageWithoutDigest, ":latest")
	}

	return !hasDigest
}

func stringValue(value *string, fallback string) string {
	if value == nil {
		return fallback
	}

	return *value
}

func newSettings(payload []byte) (Settings, error) {
	settings := Settings{}

	if len(payload) == 0 || string(payload) == "null" {
		return settings, nil
	}

	if err := json.Unmarshal(payload, &settings); err != nil {
		return Settings{}, err
	}

	return settings, nil
}

func validateSettings(payload []byte) ([]byte, error) {
	settings, err := newSettings(payload)
	if err != nil {
		return kubewarden.RejectSettings(
			kubewarden.Message(fmt.Sprintf("Cannot parse settings: %v", err)))
	}

	valid, err := settings.Valid()
	if err != nil {
		return kubewarden.RejectSettings(kubewarden.Message(err.Error()))
	}
	if !valid {
		return kubewarden.RejectSettings(
			kubewarden.Message("Provided settings are not valid"))
	}

	return kubewarden.AcceptSettings()
}
```

## Building the Policy

```bash
# Create the Makefile
cat > Makefile <<'EOF'
CLUSTER_POLICY_MODULE=policy.wasm

.PHONY: build
build:
	tinygo build \
		-target wasi \
		-no-debug \
		-o $(CLUSTER_POLICY_MODULE) \
		.

.PHONY: annotate
annotate: build
	kwctl annotate \
		--metadata-path metadata.yml \
		--output-path annotated-$(CLUSTER_POLICY_MODULE) \
		$(CLUSTER_POLICY_MODULE)

.PHONY: test
test:
	go test ./...

.PHONY: clean
clean:
	rm -f *.wasm
EOF

# Build the policy
make build

# Annotate with metadata
make annotate
```

## Creating Policy Metadata

```yaml
# metadata.yml
rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
    operations:
      - CREATE
      - UPDATE
mutating: false
contextAwareResources: []
executionMode: kubewarden-wapc
policyType: kubernetes
backgroundAudit: true
annotations:
  io.kubewarden.policy.title: no-latest-tag
  io.kubewarden.policy.version: v0.1.0
  io.kubewarden.policy.description: Reject pods using 'latest' image tag
  io.kubewarden.policy.author: My Team
  io.kubewarden.policy.url: https://github.com/my-org/my-go-policy
  io.kubewarden.policy.source: https://github.com/my-org/my-go-policy
  io.kubewarden.policy.license: Apache-2.0
  io.kubewarden.policy.category: Resource validation
  io.kubewarden.policy.severity: medium
```

## Testing with kwctl

```bash
# Create policy settings
cat > settings.json <<EOF
{
  "exemptImages": []
}
EOF

# Create a Pod manifest to test
cat > test-pod.json <<EOF
{
  "apiVersion": "v1",
  "kind": "Pod",
  "metadata": {"name": "test"},
  "spec": {
    "containers": [{"name": "app", "image": "nginx:latest"}]
  }
}
EOF

# Turn the Pod manifest into an AdmissionRequest
kwctl scaffold admission-request \
  --operation CREATE \
  --object test-pod.json > test-request.json

# Test the policy
kwctl run \
  --settings-path settings.json \
  --request-path test-request.json \
  annotated-policy.wasm
```

## Deploying the Go Policy

```bash
# Push to OCI registry
kwctl push \
  annotated-policy.wasm \
  registry://registry.example.com/kubewarden/no-latest-tag:v0.1.0
```

```yaml
# deploy-go-policy.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: no-latest-tag-go
spec:
  module: registry://registry.example.com/kubewarden/no-latest-tag:v0.1.0
  settings:
    exemptImages: []
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
```

## Conclusion

Writing Kubewarden policies in Go enables Kubernetes-native teams to leverage their existing Go expertise for admission control. The TinyGo compiler makes it straightforward to compile Go code to WebAssembly, and the Kubewarden Go SDK provides a clean API for handling admission requests. The combination of Go's familiar patterns, TinyGo's WebAssembly output, and Kubewarden's policy framework gives you a productive and powerful platform for building custom security policies.
