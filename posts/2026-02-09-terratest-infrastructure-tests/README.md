# How to Use Terratest to Write Automated Infrastructure Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Testing, Infrastructure

Description: Learn how to use Terratest to write automated infrastructure tests for Kubernetes resources, validate deployments, and ensure your infrastructure code behaves correctly across environments.

---

Infrastructure as Code has become the standard for managing Kubernetes resources, but without proper testing, IaC can introduce the same risks as untested application code. Manual verification of infrastructure deployments is time-consuming and unreliable, especially when managing multiple environments or making frequent changes. Terratest provides a testing framework for infrastructure code that allows you to write automated tests in Go.

Terratest enables you to deploy infrastructure, validate it works correctly, and tear it down automatically. For Kubernetes, this means deploying manifests or Helm charts, verifying pods are running, checking service connectivity, validating configuration, and ensuring everything behaves as expected. In this guide, you'll learn how to use Terratest to create comprehensive infrastructure tests for Kubernetes.

## Understanding Terratest for Kubernetes Testing

Terratest is a Go library that provides patterns and helper functions for testing infrastructure code. For Kubernetes, Terratest can apply manifests using kubectl, deploy Helm charts, wait for resources to be ready, query the Kubernetes API, validate pod status and logs, test service connectivity, and clean up resources after tests.

The testing workflow typically involves setting up test infrastructure, deploying the resources being tested, waiting for resources to become ready, running validation checks, and cleaning up all created resources. Terratest handles much of this complexity through built-in functions and retry logic.

## Setting Up Terratest for Kubernetes

Create a new Go module for your infrastructure tests:

```bash
mkdir kubernetes-tests
cd kubernetes-tests
go mod init github.com/yourorg/kubernetes-tests

# Install Terratest

go get github.com/gruntwork-io/terratest/modules/k8s
go get github.com/gruntwork-io/terratest/modules/helm
go get github.com/gruntwork-io/terratest/modules/random
go get github.com/stretchr/testify/assert
go get github.com/stretchr/testify/require
```

Create the basic project structure:

```text
kubernetes-tests/
├── go.mod
├── go.sum
├── test/
│   ├── deployment_test.go
│   ├── helm_test.go
│   └── integration_test.go
└── fixtures/
    ├── manifests/
    │   ├── deployment.yaml
    │   └── service.yaml
    └── helm/
        └── mychart/
            ├── Chart.yaml
            ├── values.yaml
            └── templates/
```

## Writing Basic Kubernetes Resource Tests

Create a test for a Kubernetes deployment:

```go
// test/deployment_test.go
package test

import (
    "context"
    "fmt"
    "path/filepath"
    "strings"
    "testing"
    "time"

    "github.com/gruntwork-io/terratest/modules/k8s"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestKubernetesDeployment(t *testing.T) {
    t.Parallel()
    ctx := context.Background()

    // Generate unique namespace for test isolation
    namespaceName := fmt.Sprintf("test-%s", strings.ToLower(random.UniqueID()))

    // Path to Kubernetes manifest
    manifestPath := filepath.Join("..", "fixtures", "manifests", "deployment.yaml")

    // Setup kubectl options
    options := k8s.NewKubectlOptions("", "", namespaceName)

    // Create namespace
    k8s.CreateNamespaceContext(t, ctx, options, namespaceName)

    // Ensure cleanup runs even if test fails
    defer k8s.DeleteNamespaceContext(t, ctx, options, namespaceName)

    // Apply the manifest
    k8s.KubectlApplyContext(t, ctx, options, manifestPath)

    // Wait for deployment to be ready
    k8s.WaitUntilDeploymentAvailableContext(t, ctx, options, "test-app", 60, 2*time.Second)

    // Get deployment
    deployment := k8s.GetDeploymentContext(t, ctx, options, "test-app")

    // Validate deployment configuration
    assert.Equal(t, int32(3), *deployment.Spec.Replicas, "Expected 3 replicas")
    assert.Equal(t, "test-app", deployment.Name)

    // Get pods for the deployment
    pods := k8s.ListPodsContext(t, ctx, options, metav1.ListOptions{
        LabelSelector: "app=test-app",
    })

    // Validate pod count
    require.Equal(t, 3, len(pods), "Expected 3 pods to be running")

    // Validate each pod is running
    for _, pod := range pods {
        assert.Equal(t, corev1.PodRunning, pod.Status.Phase,
            fmt.Sprintf("Pod %s should be in Running phase", pod.Name))

        // Check container is ready
        for _, containerStatus := range pod.Status.ContainerStatuses {
            assert.True(t, containerStatus.Ready,
                fmt.Sprintf("Container %s should be ready", containerStatus.Name))
        }
    }
}

func TestKubernetesService(t *testing.T) {
    t.Parallel()
    ctx := context.Background()

    namespaceName := fmt.Sprintf("test-%s", strings.ToLower(random.UniqueID()))
    manifestPath := filepath.Join("..", "fixtures", "manifests")

    options := k8s.NewKubectlOptions("", "", namespaceName)
    k8s.CreateNamespaceContext(t, ctx, options, namespaceName)
    defer k8s.DeleteNamespaceContext(t, ctx, options, namespaceName)

    // Apply all manifests in directory
    k8s.KubectlApplyContext(t, ctx, options, manifestPath)

    // Wait for service to be available
    k8s.WaitUntilServiceAvailableContext(t, ctx, options, "test-app-service", 10, 2*time.Second)

    // Get service
    service := k8s.GetServiceContext(t, ctx, options, "test-app-service")

    // Validate service configuration
    assert.Equal(t, "test-app-service", service.Name)
    assert.Equal(t, corev1.ServiceTypeClusterIP, service.Spec.Type)
    assert.Equal(t, int32(80), service.Spec.Ports[0].Port)

    // Test service connectivity from within cluster
    // Create a test pod to curl the service
    testPodName := "connectivity-test"
    podManifest := fmt.Sprintf(`
apiVersion: v1
kind: Pod
metadata:
  name: %s
spec:
  containers:
  - name: curl
    image: curlimages/curl:latest
    command: ["sleep", "3600"]
`, testPodName)

    // Apply the inline manifest
    k8s.KubectlApplyFromStringContext(t, ctx, options, podManifest)
    defer k8s.RunKubectlContext(t, ctx, options, "delete", "pod", testPodName)

    // Wait for test pod
    k8s.WaitUntilPodAvailableContext(t, ctx, options, testPodName, 10, 2*time.Second)

    // Test service connectivity
    serviceURL := fmt.Sprintf("http://test-app-service.%s.svc.cluster.local", namespaceName)
    output, err := k8s.RunKubectlAndGetOutputContextE(t, ctx, options,
        "exec", testPodName, "--", "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", serviceURL)

    require.NoError(t, err, "Failed to execute curl in test pod")
    assert.Equal(t, "200", strings.TrimSpace(output), "Expected HTTP 200 response")
}
```

## Testing Helm Charts with Terratest

Create tests for Helm chart deployments:

```go
// test/helm_test.go
package test

import (
    "context"
    "fmt"
    "path/filepath"
    "strings"
    "testing"
    "time"

    "github.com/gruntwork-io/terratest/modules/helm"
    "github.com/gruntwork-io/terratest/modules/k8s"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestHelmChartDeployment(t *testing.T) {
    t.Parallel()
    ctx := context.Background()

    namespaceName := fmt.Sprintf("test-%s", strings.ToLower(random.UniqueID()))
    releaseName := "test-release"
    chartPath := filepath.Join("..", "fixtures", "helm", "mychart")

    // Setup kubectl options
    kubectlOptions := k8s.NewKubectlOptions("", "", namespaceName)
    k8s.CreateNamespaceContext(t, ctx, kubectlOptions, namespaceName)
    defer k8s.DeleteNamespaceContext(t, ctx, kubectlOptions, namespaceName)

    // Setup Helm options
    helmOptions := &helm.Options{
        KubectlOptions: kubectlOptions,
        SetValues: map[string]string{
            "replicaCount": "2",
            "image.tag":    "v1.2.3",
        },
    }

    // Deploy Helm chart
    helm.InstallContext(t, ctx, helmOptions, chartPath, releaseName)
    defer helm.DeleteContext(t, ctx, helmOptions, releaseName, true)

    // Wait for deployment
    deploymentName := fmt.Sprintf("%s-mychart", releaseName)
    k8s.WaitUntilDeploymentAvailableContext(t, ctx, kubectlOptions, deploymentName, 60, 2*time.Second)

    // Get deployment and validate
    deployment := k8s.GetDeploymentContext(t, ctx, kubectlOptions, deploymentName)
    assert.Equal(t, int32(2), *deployment.Spec.Replicas)

    // Validate image tag
    container := deployment.Spec.Template.Spec.Containers[0]
    assert.Contains(t, container.Image, "v1.2.3", "Expected image tag v1.2.3")
}

func TestHelmChartUpgrade(t *testing.T) {
    t.Parallel()
    ctx := context.Background()

    namespaceName := fmt.Sprintf("test-%s", strings.ToLower(random.UniqueID()))
    releaseName := "upgrade-test"
    chartPath := filepath.Join("..", "fixtures", "helm", "mychart")

    kubectlOptions := k8s.NewKubectlOptions("", "", namespaceName)
    k8s.CreateNamespaceContext(t, ctx, kubectlOptions, namespaceName)
    defer k8s.DeleteNamespaceContext(t, ctx, kubectlOptions, namespaceName)

    // Initial deployment
    helmOptions := &helm.Options{
        KubectlOptions: kubectlOptions,
        SetValues: map[string]string{
            "replicaCount": "2",
        },
    }

    helm.InstallContext(t, ctx, helmOptions, chartPath, releaseName)
    defer helm.DeleteContext(t, ctx, helmOptions, releaseName, true)

    deploymentName := fmt.Sprintf("%s-mychart", releaseName)
    k8s.WaitUntilDeploymentAvailableContext(t, ctx, kubectlOptions, deploymentName, 60, 2*time.Second)

    // Verify initial state
    deployment := k8s.GetDeploymentContext(t, ctx, kubectlOptions, deploymentName)
    assert.Equal(t, int32(2), *deployment.Spec.Replicas)

    // Upgrade with new replica count
    upgradeOptions := &helm.Options{
        KubectlOptions: kubectlOptions,
        SetValues: map[string]string{
            "replicaCount": "4",
        },
    }

    helm.UpgradeContext(t, ctx, upgradeOptions, chartPath, releaseName)

    // Wait for upgrade to complete
    k8s.WaitUntilDeploymentAvailableContext(t, ctx, kubectlOptions, deploymentName, 60, 2*time.Second)

    // Verify upgraded state
    upgradedDeployment := k8s.GetDeploymentContext(t, ctx, kubectlOptions, deploymentName)
    assert.Equal(t, int32(4), *upgradedDeployment.Spec.Replicas)

    // Verify all pods are running
    pods := k8s.ListPodsContext(t, ctx, kubectlOptions, metav1.ListOptions{
        LabelSelector: fmt.Sprintf("app.kubernetes.io/instance=%s", releaseName),
    })
    assert.Equal(t, 4, len(pods), "Expected 4 pods after upgrade")
}
```

## Writing Integration Tests

Create comprehensive integration tests that validate multiple components:

```go
// test/integration_test.go
package test

import (
    "context"
    "fmt"
    "path/filepath"
    "strings"
    "testing"
    "time"

    "github.com/gruntwork-io/terratest/modules/helm"
    "github.com/gruntwork-io/terratest/modules/k8s"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/require"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestFullApplicationStack(t *testing.T) {
    t.Parallel()
    ctx := context.Background()

    namespaceName := fmt.Sprintf("test-%s", strings.ToLower(random.UniqueID()))
    kubectlOptions := k8s.NewKubectlOptions("", "", namespaceName)

    k8s.CreateNamespaceContext(t, ctx, kubectlOptions, namespaceName)
    defer k8s.DeleteNamespaceContext(t, ctx, kubectlOptions, namespaceName)

    // Deploy database
    dbChartPath := filepath.Join("..", "fixtures", "helm", "database")
    dbRelease := "test-db"

    dbHelmOptions := &helm.Options{
        KubectlOptions: kubectlOptions,
        SetValues: map[string]string{
            "persistence.enabled": "false",
        },
    }

    helm.InstallContext(t, ctx, dbHelmOptions, dbChartPath, dbRelease)
    defer helm.DeleteContext(t, ctx, dbHelmOptions, dbRelease, true)

    // Wait for database to be ready
    k8s.WaitUntilServiceAvailableContext(t, ctx, kubectlOptions, fmt.Sprintf("%s-database", dbRelease),
        60, 2*time.Second)

    // Deploy application
    appChartPath := filepath.Join("..", "fixtures", "helm", "application")
    appRelease := "test-app"

    appHelmOptions := &helm.Options{
        KubectlOptions: kubectlOptions,
        SetValues: map[string]string{
            "database.host": fmt.Sprintf("%s-database.%s.svc.cluster.local", dbRelease, namespaceName),
        },
    }

    helm.InstallContext(t, ctx, appHelmOptions, appChartPath, appRelease)
    defer helm.DeleteContext(t, ctx, appHelmOptions, appRelease, true)

    // Wait for application
    appDeployment := fmt.Sprintf("%s-application", appRelease)
    k8s.WaitUntilDeploymentAvailableContext(t, ctx, kubectlOptions, appDeployment, 120, 2*time.Second)

    // Test application connectivity
    testConnectivity(t, ctx, kubectlOptions, appRelease, namespaceName)

    // Test database connection
    testDatabaseConnection(t, ctx, kubectlOptions, appRelease)

    // Test application functionality
    testApplicationEndpoints(t, ctx, kubectlOptions, appRelease, namespaceName)
}

func testConnectivity(t *testing.T, ctx context.Context, options *k8s.KubectlOptions, appRelease, namespace string) {
    // Create test pod
    testPod := "connectivity-test"
    podManifest := fmt.Sprintf(`
apiVersion: v1
kind: Pod
metadata:
  name: %s
spec:
  containers:
  - name: test
    image: curlimages/curl:latest
    command: ["sleep", "3600"]
`, testPod)

    k8s.KubectlApplyFromStringContext(t, ctx, options, podManifest)
    defer k8s.RunKubectlContext(t, ctx, options, "delete", "pod", testPod)

    k8s.WaitUntilPodAvailableContext(t, ctx, options, testPod, 30, 2*time.Second)

    // Test HTTP connectivity
    serviceURL := fmt.Sprintf("http://%s-application.%s.svc.cluster.local", appRelease, namespace)
    output, err := k8s.RunKubectlAndGetOutputContextE(t, ctx, options,
        "exec", testPod, "--", "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", serviceURL)

    require.NoError(t, err)
    require.Equal(t, "200", strings.TrimSpace(output))
}

func testDatabaseConnection(t *testing.T, ctx context.Context, options *k8s.KubectlOptions, appRelease string) {
    // Get application pods
    pods := k8s.ListPodsContext(t, ctx, options, metav1.ListOptions{
        LabelSelector: fmt.Sprintf("app.kubernetes.io/instance=%s", appRelease),
    })

    require.NotEmpty(t, pods, "No application pods found")

    // Check logs for database connection
    for _, pod := range pods {
        logs := k8s.GetPodLogsContext(t, ctx, options, &pod, "")
        require.Contains(t, logs, "Database connected successfully",
            "Application should connect to database")
    }
}

func testApplicationEndpoints(t *testing.T, ctx context.Context, options *k8s.KubectlOptions, appRelease, namespace string) {
    testPod := "endpoint-test"
    podManifest := fmt.Sprintf(`
apiVersion: v1
kind: Pod
metadata:
  name: %s
spec:
  containers:
  - name: test
    image: curlimages/curl:latest
    command: ["sleep", "3600"]
`, testPod)

    k8s.KubectlApplyFromStringContext(t, ctx, options, podManifest)
    defer k8s.RunKubectlContext(t, ctx, options, "delete", "pod", testPod)
    k8s.WaitUntilPodAvailableContext(t, ctx, options, testPod, 30, 2*time.Second)

    baseURL := fmt.Sprintf("http://%s-application.%s.svc.cluster.local", appRelease, namespace)

    endpoints := []string{
        "/health",
        "/api/status",
        "/api/version",
    }

    for _, endpoint := range endpoints {
        url := baseURL + endpoint
        output, err := k8s.RunKubectlAndGetOutputContextE(t, ctx, options,
            "exec", testPod, "--", "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", url)

        require.NoError(t, err, fmt.Sprintf("Failed to test endpoint %s", endpoint))
        require.Equal(t, "200", strings.TrimSpace(output),
            fmt.Sprintf("Endpoint %s should return 200", endpoint))
    }
}
```

## Running Tests in CI/CD

Create a GitHub Actions workflow for running Terratest:

```yaml
# .github/workflows/terratest.yaml
name: Infrastructure Tests

on:
  pull_request:
    paths:
      - 'test/**'
      - 'fixtures/**'
  push:
    branches:
      - main

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Set up Go
        uses: actions/setup-go@v6
        with:
          go-version: '1.25'

      - name: Create Kind cluster
        uses: helm/kind-action@v1
        with:
          cluster_name: terratest

      - name: Install Helm
        uses: azure/setup-helm@v4.3.0

      - name: Download dependencies
        run: go mod download

      - name: Run tests
        run: |
          set -o pipefail
          go test -v -timeout 30m -parallel 4 ./test 2>&1 | tee test-results.txt

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results.txt
```

## Creating Helper Functions

Build reusable helper functions for common test patterns:

```go
// test/helpers.go
package test

import (
    "context"
    "fmt"
    "testing"
    "time"

    "github.com/gruntwork-io/terratest/modules/k8s"
    "github.com/gruntwork-io/terratest/modules/retry"
    "github.com/stretchr/testify/require"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// WaitForPodsReady waits for all pods matching selector to be ready
func WaitForPodsReady(t *testing.T, options *k8s.KubectlOptions, selector string, timeout time.Duration) {
    ctx := context.Background()
    message := fmt.Sprintf("Waiting for pods with selector %s to be ready", selector)

    retry.DoWithRetry(t, message, int(timeout.Seconds()/2), 2*time.Second, func() (string, error) {
        pods := k8s.ListPodsContext(t, ctx, options, metav1.ListOptions{
            LabelSelector: selector,
        })

        if len(pods) == 0 {
            return "", fmt.Errorf("no pods found with selector %s", selector)
        }

        for _, pod := range pods {
            if pod.Status.Phase != corev1.PodRunning {
                return "", fmt.Errorf("pod %s not running", pod.Name)
            }

            for _, condition := range pod.Status.Conditions {
                if condition.Type == corev1.PodReady && condition.Status != corev1.ConditionTrue {
                    return "", fmt.Errorf("pod %s not ready", pod.Name)
                }
            }
        }

        return "All pods ready", nil
    })
}

// GetPodLogs retrieves logs from all pods matching selector
func GetPodLogs(t *testing.T, options *k8s.KubectlOptions, selector string) []string {
    ctx := context.Background()
    pods := k8s.ListPodsContext(t, ctx, options, metav1.ListOptions{
        LabelSelector: selector,
    })

    var allLogs []string
    for _, pod := range pods {
        logs := k8s.GetPodLogsContext(t, ctx, options, &pod, "")
        allLogs = append(allLogs, logs)
    }

    return allLogs
}

// ExecuteInPod runs a command in a pod and returns output
func ExecuteInPod(t *testing.T, options *k8s.KubectlOptions, podName string, command []string) string {
    ctx := context.Background()
    args := append([]string{"exec", podName, "--"}, command...)
    output, err := k8s.RunKubectlAndGetOutputContextE(t, ctx, options, args...)
    require.NoError(t, err)
    return output
}
```

Terratest provides a powerful framework for writing automated infrastructure tests that validate your Kubernetes resources work correctly before deployment. By writing tests in Go with familiar testing patterns, you can create comprehensive test suites that verify deployments, services, configurations, and integrations, giving you confidence that your infrastructure code behaves as expected across all environments.
