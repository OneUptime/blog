# How to Implement Velero Plugin Development for Custom Resource Backup Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Kubernetes, Plugin Development, Go, Backup

Description: Learn how to develop custom Velero plugins for specialized backup and restore logic. Complete guide covering plugin architecture, implementation patterns, and best practices.

---

Velero's plugin architecture allows you to extend backup and restore functionality to handle custom resources, integrate with proprietary storage systems, or implement specialized backup logic. While Velero's built-in capabilities cover many use cases, custom plugins enable integration with custom resource definitions, external systems, and organization-specific requirements. Understanding plugin development empowers you to tailor Velero to your exact needs rather than working around limitations.

## Understanding Velero Plugin Architecture

Velero uses a plugin system based on HashiCorp's go-plugin library, which runs plugins as separate processes communicating over RPC. This architecture provides isolation between Velero and plugins, preventing plugin crashes from affecting the main Velero process.

Velero supports several plugin types:

- **ObjectStore**: Custom storage backends
- **VolumeSnapshotter**: Volume snapshot implementations
- **BackupItemAction**: Pre-backup resource modification
- **RestoreItemAction**: Pre-restore resource modification
- **DeleteItemAction**: Resource deletion logic

Each plugin type serves specific purposes in the backup and restore workflow.

## Setting Up Development Environment

Create a development environment for plugin development:

```bash
# Install Go 1.21 or later
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# Create plugin project
mkdir -p velero-custom-plugin
cd velero-custom-plugin

# Initialize Go module
go mod init github.com/myorg/velero-custom-plugin

# Install Velero plugin dependencies
go get github.com/vmware-tanzu/velero/pkg/plugin/framework
```

## Creating a BackupItemAction Plugin

Implement a plugin that modifies resources during backup:

```go
// plugins/backup/custom_action.go
package main

import (
    "encoding/json"

    "github.com/pkg/errors"
    "github.com/sirupsen/logrus"
    v1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
    "k8s.io/apimachinery/pkg/runtime"

    "github.com/vmware-tanzu/velero/pkg/plugin/velero"
)

// CustomBackupAction implements BackupItemAction interface
type CustomBackupAction struct {
    log logrus.FieldLogger
}

// NewCustomBackupAction creates a new plugin instance
func NewCustomBackupAction(log logrus.FieldLogger) (interface{}, error) {
    return &CustomBackupAction{log: log}, nil
}

// AppliesTo returns the resources this plugin applies to
func (p *CustomBackupAction) AppliesTo() (velero.ResourceSelector, error) {
    return velero.ResourceSelector{
        IncludedResources: []string{"configmaps", "secrets"},
    }, nil
}

// Execute performs the backup action
func (p *CustomBackupAction) Execute(item runtime.Unstructured, backup *v1.ConfigMap) (runtime.Unstructured, []velero.ResourceIdentifier, error) {
    p.log.Info("Executing custom backup action")

    // Get the object metadata
    metadata, err := getObjectMeta(item)
    if err != nil {
        return nil, nil, err
    }

    // Add custom annotations
    annotations := metadata["annotations"]
    if annotations == nil {
        annotations = make(map[string]interface{})
    }

    annotationsMap := annotations.(map[string]interface{})
    annotationsMap["backup.example.com/processed"] = "true"
    annotationsMap["backup.example.com/timestamp"] = backup.CreationTimestamp.String()

    metadata["annotations"] = annotationsMap

    // Return modified item
    return item, nil, nil
}

func getObjectMeta(item runtime.Unstructured) (map[string]interface{}, error) {
    u := item.(*unstructured.Unstructured)
    return u.Object["metadata"].(map[string]interface{}), nil
}
```

## Implementing RestoreItemAction Plugin

Create a plugin that modifies resources during restore:

```go
// plugins/restore/custom_action.go
package main

import (
    "fmt"

    "github.com/pkg/errors"
    "github.com/sirupsen/logrus"
    "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
    "k8s.io/apimachinery/pkg/runtime"

    "github.com/vmware-tanzu/velero/pkg/plugin/velero"
)

type CustomRestoreAction struct {
    log logrus.FieldLogger
}

func NewCustomRestoreAction(log logrus.FieldLogger) (interface{}, error) {
    return &CustomRestoreAction{log: log}, nil
}

func (p *CustomRestoreAction) AppliesTo() (velero.ResourceSelector, error) {
    return velero.ResourceSelector{
        IncludedResources: []string{"deployments", "statefulsets"},
    }, nil
}

func (p *CustomRestoreAction) Execute(input *velero.RestoreItemActionExecuteInput) (*velero.RestoreItemActionExecuteOutput, error) {
    p.log.Info("Executing custom restore action")

    item := input.Item
    u := item.(*unstructured.Unstructured)

    // Modify replica count during restore
    spec, found, err := unstructured.NestedMap(u.Object, "spec")
    if err != nil || !found {
        return nil, errors.Wrap(err, "unable to get spec from item")
    }

    // Set replicas to 1 during initial restore
    spec["replicas"] = int64(1)

    if err := unstructured.SetNestedMap(u.Object, spec, "spec"); err != nil {
        return nil, errors.Wrap(err, "unable to set spec in item")
    }

    p.log.Infof("Set replicas to 1 for %s", u.GetName())

    return &velero.RestoreItemActionExecuteOutput{
        UpdatedItem: item,
    }, nil
}
```

## Creating ObjectStore Plugin for Custom Storage

Implement a plugin for custom storage backends:

```go
// plugins/objectstore/custom_store.go
package main

import (
    "io"
    "time"

    "github.com/pkg/errors"
    "github.com/sirupsen/logrus"

    "github.com/vmware-tanzu/velero/pkg/plugin/velero"
)

type CustomObjectStore struct {
    log logrus.FieldLogger
}

func NewCustomObjectStore(log logrus.FieldLogger) (interface{}, error) {
    return &CustomObjectStore{log: log}, nil
}

func (s *CustomObjectStore) Init(config map[string]string) error {
    s.log.Info("Initializing custom object store")
    // Initialize connection to custom storage system
    return nil
}

func (s *CustomObjectStore) PutObject(bucket, key string, body io.Reader) error {
    s.log.Infof("Uploading object: %s/%s", bucket, key)
    // Implement upload logic to custom storage
    return nil
}

func (s *CustomObjectStore) GetObject(bucket, key string) (io.ReadCloser, error) {
    s.log.Infof("Downloading object: %s/%s", bucket, key)
    // Implement download logic from custom storage
    return nil, nil
}

func (s *CustomObjectStore) ListCommonPrefixes(bucket, prefix, delimiter string) ([]string, error) {
    s.log.Infof("Listing prefixes in bucket: %s", bucket)
    // Implement prefix listing logic
    return []string{}, nil
}

func (s *CustomObjectStore) ListObjects(bucket, prefix string) ([]string, error) {
    s.log.Infof("Listing objects in bucket: %s", bucket)
    // Implement object listing logic
    return []string{}, nil
}

func (s *CustomObjectStore) DeleteObject(bucket, key string) error {
    s.log.Infof("Deleting object: %s/%s", bucket, key)
    // Implement deletion logic
    return nil
}

func (s *CustomObjectStore) CreateSignedURL(bucket, key string, ttl time.Duration) (string, error) {
    s.log.Infof("Creating signed URL for: %s/%s", bucket, key)
    // Implement signed URL generation
    return "", nil
}

func (s *CustomObjectStore) ObjectExists(bucket, key string) (bool, error) {
    s.log.Infof("Checking if object exists: %s/%s", bucket, key)
    // Implement existence check
    return false, nil
}
```

## Building the Plugin Binary

Create the main plugin entry point:

```go
// main.go
package main

import (
    "github.com/sirupsen/logrus"
    "github.com/vmware-tanzu/velero/pkg/plugin/framework"
)

func main() {
    framework.NewServer().
        RegisterBackupItemAction("example.com/custom-backup-action", newCustomBackupAction).
        RegisterRestoreItemAction("example.com/custom-restore-action", newCustomRestoreAction).
        RegisterObjectStore("example.com/custom-object-store", newCustomObjectStore).
        Serve()
}

func newCustomBackupAction(logger logrus.FieldLogger) (interface{}, error) {
    return NewCustomBackupAction(logger)
}

func newCustomRestoreAction(logger logrus.FieldLogger) (interface{}, error) {
    return NewCustomRestoreAction(logger)
}

func newCustomObjectStore(logger logrus.FieldLogger) (interface{}, error) {
    return NewCustomObjectStore(logger)
}
```

Build the plugin:

```bash
# Build for Linux
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o velero-custom-plugin .

# Create Dockerfile
cat <<EOF > Dockerfile
FROM scratch
COPY velero-custom-plugin /plugins/
USER 65532:65532
ENTRYPOINT ["/plugins/velero-custom-plugin"]
EOF

# Build and push Docker image
docker build -t myregistry/velero-custom-plugin:v1.0.0 .
docker push myregistry/velero-custom-plugin:v1.0.0
```

## Installing the Custom Plugin

Deploy the plugin to your Velero installation:

```bash
# Add plugin to Velero
velero plugin add myregistry/velero-custom-plugin:v1.0.0
```

Or configure in Velero installation:

```bash
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0,myregistry/velero-custom-plugin:v1.0.0 \
  --bucket velero-backups \
  --secret-file ./credentials
```

## Testing Plugin Functionality

Verify the plugin works correctly:

```bash
# Create test backup
velero backup create test-custom-plugin \
  --include-namespaces default \
  --wait

# Check plugin logs
kubectl logs -n velero -l name=velero | grep "custom-backup-action"

# Verify annotations were added
velero backup download test-custom-plugin
tar -xzf test-custom-plugin.tar.gz
cat resources/configmaps/namespaces/default/*.json | jq '.metadata.annotations'
```

## Implementing Advanced Plugin Features

Add configuration support to plugins:

```go
type ConfigurableAction struct {
    log      logrus.FieldLogger
    config   map[string]string
}

func (p *ConfigurableAction) Execute(item runtime.Unstructured, backup *v1.ConfigMap) (runtime.Unstructured, []velero.ResourceIdentifier, error) {
    // Read configuration
    annotationKey := p.config["annotationKey"]
    if annotationKey == "" {
        annotationKey = "backup.example.com/default"
    }

    // Use configuration in plugin logic
    metadata, _ := getObjectMeta(item)
    annotations := metadata["annotations"].(map[string]interface{})
    annotations[annotationKey] = "true"

    return item, nil, nil
}
```

Configure the plugin via Velero ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-plugin-config
  namespace: velero
  labels:
    velero.io/plugin-config: ""
    velero.io/custom-backup-action: ConfigurableAction
data:
  annotationKey: "custom.example.com/backup"
```

## Debugging Plugin Issues

Enable debug logging for plugin development:

```bash
# Update Velero deployment with debug logging
kubectl patch deployment velero -n velero -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "velero",
          "env": [{
            "name": "LOG_LEVEL",
            "value": "debug"
          }]
        }]
      }
    }
  }
}'

# View detailed plugin logs
kubectl logs -n velero -l name=velero --follow | grep plugin
```

## Best Practices for Plugin Development

1. **Error Handling**: Always return descriptive errors
```go
if err != nil {
    return nil, nil, errors.Wrap(err, "failed to process resource")
}
```

2. **Idempotency**: Ensure plugins can be safely re-executed
```go
// Check if already processed
if annotations["backup.example.com/processed"] == "true" {
    p.log.Info("Already processed, skipping")
    return item, nil, nil
}
```

3. **Resource Selection**: Be specific about applicable resources
```go
func (p *CustomAction) AppliesTo() (velero.ResourceSelector, error) {
    return velero.ResourceSelector{
        IncludedResources: []string{"customresources.example.com"},
        LabelSelector:     "backup-required=true",
    }, nil
}
```

4. **Testing**: Write comprehensive unit tests
```go
func TestCustomBackupAction_Execute(t *testing.T) {
    action := &CustomBackupAction{log: logrus.New()}

    item := &unstructured.Unstructured{
        Object: map[string]interface{}{
            "metadata": map[string]interface{}{
                "name": "test",
                "annotations": map[string]interface{}{},
            },
        },
    }

    result, _, err := action.Execute(item, nil)
    assert.NoError(t, err)
    // Add assertions
}
```

## Conclusion

Velero plugin development enables powerful customization of backup and restore workflows. Implement BackupItemAction plugins to modify resources during backup, create RestoreItemAction plugins for custom restoration logic, and develop ObjectStore plugins for proprietary storage systems. Follow best practices for error handling, idempotency, and testing to create reliable plugins that extend Velero's capabilities to meet your specific requirements. With custom plugins, Velero adapts to any backup scenario, from specialized CRD handling to integration with enterprise storage systems.
