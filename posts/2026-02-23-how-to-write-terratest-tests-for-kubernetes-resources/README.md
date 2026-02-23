# How to Write Terratest Tests for Kubernetes Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terratest, Kubernetes, Testing, Go, Infrastructure as Code

Description: Learn how to write Terratest tests that validate Kubernetes resources deployed by Terraform, including pods, services, deployments, and ingress configurations.

---

When Terraform manages Kubernetes resources - whether through the Kubernetes provider, Helm charts, or by provisioning clusters - you need to verify that the deployed resources actually work. Terratest includes a Kubernetes module that lets you interact with your cluster from Go tests, checking that pods are running, services are reachable, and deployments are healthy. This guide covers practical patterns for testing Kubernetes resources deployed by Terraform.

## Prerequisites

You need a Kubernetes cluster for testing. This could be:
- A real cloud cluster (EKS, GKE, AKS) created by your Terraform code
- A local cluster (kind, minikube) for faster feedback
- A shared test cluster with namespace isolation

Install the Terratest Kubernetes module:

```bash
cd test
go get github.com/gruntwork-io/terratest/modules/k8s
go get github.com/gruntwork-io/terratest/modules/helm
```

## Setting Up Kubernetes Test Options

The `k8s.KubectlOptions` struct tells Terratest how to connect to your cluster:

```go
// Create kubectl options from a kubeconfig file
k8sOptions := k8s.NewKubectlOptions("", "/path/to/kubeconfig", "test-namespace")

// Or use the default kubeconfig and a specific context
k8sOptions := k8s.NewKubectlOptions("my-cluster-context", "", "test-namespace")

// Or get the kubeconfig path from a Terraform output
kubeconfigPath := terraform.Output(t, opts, "kubeconfig_path")
k8sOptions := k8s.NewKubectlOptions("", kubeconfigPath, "default")
```

## Testing Deployments

Verify that a Terraform-managed Kubernetes deployment is running correctly:

```go
// test/deployment_test.go
package test

import (
    "testing"
    "fmt"
    "time"

    "github.com/gruntwork-io/terratest/modules/k8s"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestKubernetesDeployment(t *testing.T) {
    t.Parallel()

    uniqueId := random.UniqueId()
    namespace := fmt.Sprintf("test-%s", uniqueId)

    opts := &terraform.Options{
        TerraformDir: "../modules/k8s-app",
        Vars: map[string]interface{}{
            "namespace":     namespace,
            "app_name":      "test-app",
            "image":         "nginx:1.25",
            "replicas":      3,
            "container_port": 80,
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    kubeconfigPath := terraform.Output(t, opts, "kubeconfig_path")
    k8sOptions := k8s.NewKubectlOptions("", kubeconfigPath, namespace)

    // Wait for the deployment to become available
    k8s.WaitUntilDeploymentAvailable(t, k8sOptions, "test-app", 30, 10*time.Second)

    // Get the deployment
    deployment := k8s.GetDeployment(t, k8sOptions, "test-app")

    // Verify replica count
    assert.Equal(t, int32(3), *deployment.Spec.Replicas,
        "Deployment should have 3 replicas")

    // Verify the container image
    containers := deployment.Spec.Template.Spec.Containers
    require.Len(t, containers, 1)
    assert.Equal(t, "nginx:1.25", containers[0].Image)

    // Verify container port
    require.Len(t, containers[0].Ports, 1)
    assert.Equal(t, int32(80), containers[0].Ports[0].ContainerPort)

    // Verify all pods are running
    pods := k8s.ListPods(t, k8sOptions, metav1.ListOptions{
        LabelSelector: "app=test-app",
    })
    assert.Len(t, pods, 3, "Should have 3 pods running")

    for _, pod := range pods {
        assert.Equal(t, "Running", string(pod.Status.Phase),
            fmt.Sprintf("Pod %s should be in Running phase", pod.Name))
    }
}
```

## Testing Services

Verify that Kubernetes services are created and routing traffic correctly:

```go
// test/service_test.go
package test

import (
    "testing"
    "fmt"
    "time"

    "github.com/gruntwork-io/terratest/modules/k8s"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    http_helper "github.com/gruntwork-io/terratest/modules/http-helper"
    "github.com/stretchr/testify/assert"
)

func TestKubernetesService(t *testing.T) {
    t.Parallel()

    uniqueId := random.UniqueId()
    namespace := fmt.Sprintf("test-svc-%s", uniqueId)

    opts := &terraform.Options{
        TerraformDir: "../modules/k8s-service",
        Vars: map[string]interface{}{
            "namespace":    namespace,
            "app_name":     "web-app",
            "image":        "nginx:1.25",
            "service_type": "LoadBalancer",
            "service_port": 80,
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    kubeconfigPath := terraform.Output(t, opts, "kubeconfig_path")
    k8sOptions := k8s.NewKubectlOptions("", kubeconfigPath, namespace)

    // Wait for the service to get an external IP
    k8s.WaitUntilServiceAvailable(t, k8sOptions, "web-app", 30, 10*time.Second)

    // Get the service
    service := k8s.GetService(t, k8sOptions, "web-app")

    // Verify service type
    assert.Equal(t, "LoadBalancer", string(service.Spec.Type))

    // Verify the port mapping
    assert.Len(t, service.Spec.Ports, 1)
    assert.Equal(t, int32(80), service.Spec.Ports[0].Port)

    // Get the external URL and test connectivity
    serviceUrl := fmt.Sprintf("http://%s", k8s.GetServiceEndpoint(t, k8sOptions, service, 80))

    // Retry HTTP requests since the load balancer may take time to provision
    http_helper.HttpGetWithRetry(t, serviceUrl, nil, 200, "Welcome to nginx",
        30, 10*time.Second)
}
```

## Testing Pods Directly

Sometimes you need to verify pod-level details like resource limits, environment variables, or volume mounts:

```go
// test/pod_test.go
package test

import (
    "testing"
    "fmt"

    "github.com/gruntwork-io/terratest/modules/k8s"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestPodConfiguration(t *testing.T) {
    t.Parallel()

    uniqueId := random.UniqueId()
    namespace := fmt.Sprintf("test-pod-%s", uniqueId)

    opts := &terraform.Options{
        TerraformDir: "../modules/k8s-app",
        Vars: map[string]interface{}{
            "namespace":       namespace,
            "app_name":        "configured-app",
            "image":           "myapp:latest",
            "cpu_request":     "100m",
            "memory_request":  "128Mi",
            "cpu_limit":       "500m",
            "memory_limit":    "512Mi",
            "environment_vars": map[string]string{
                "DATABASE_URL": "postgres://db:5432/app",
                "LOG_LEVEL":    "info",
            },
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    kubeconfigPath := terraform.Output(t, opts, "kubeconfig_path")
    k8sOptions := k8s.NewKubectlOptions("", kubeconfigPath, namespace)

    // Get pods with the app label
    pods := k8s.ListPods(t, k8sOptions, metav1.ListOptions{
        LabelSelector: "app=configured-app",
    })
    require.NotEmpty(t, pods)

    pod := pods[0]
    container := pod.Spec.Containers[0]

    // Verify resource requests
    cpuRequest := container.Resources.Requests.Cpu().String()
    assert.Equal(t, "100m", cpuRequest, "CPU request should be 100m")

    memRequest := container.Resources.Requests.Memory().String()
    assert.Equal(t, "128Mi", memRequest, "Memory request should be 128Mi")

    // Verify resource limits
    cpuLimit := container.Resources.Limits.Cpu().String()
    assert.Equal(t, "500m", cpuLimit, "CPU limit should be 500m")

    memLimit := container.Resources.Limits.Memory().String()
    assert.Equal(t, "512Mi", memLimit, "Memory limit should be 512Mi")

    // Verify environment variables
    envMap := make(map[string]string)
    for _, env := range container.Env {
        envMap[env.Name] = env.Value
    }
    assert.Equal(t, "info", envMap["LOG_LEVEL"])
}
```

## Testing Helm Releases

If Terraform deploys Helm charts, use the Helm helper module:

```go
// test/helm_test.go
package test

import (
    "testing"
    "fmt"
    "time"

    "github.com/gruntwork-io/terratest/modules/k8s"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestHelmRelease(t *testing.T) {
    t.Parallel()

    uniqueId := random.UniqueId()
    namespace := fmt.Sprintf("test-helm-%s", uniqueId)

    opts := &terraform.Options{
        TerraformDir: "../modules/monitoring",
        Vars: map[string]interface{}{
            "namespace":       namespace,
            "prometheus_enabled": true,
            "grafana_enabled":   true,
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    kubeconfigPath := terraform.Output(t, opts, "kubeconfig_path")
    k8sOptions := k8s.NewKubectlOptions("", kubeconfigPath, namespace)

    // Wait for Prometheus to be available
    k8s.WaitUntilDeploymentAvailable(t, k8sOptions, "prometheus-server",
        60, 10*time.Second)

    // Wait for Grafana to be available
    k8s.WaitUntilDeploymentAvailable(t, k8sOptions, "grafana",
        60, 10*time.Second)

    // Verify ConfigMaps were created for dashboards
    configMaps := k8s.ListConfigMaps(t, k8sOptions, metav1.ListOptions{
        LabelSelector: "grafana_dashboard=1",
    })
    assert.Greater(t, len(configMaps), 0,
        "Should have dashboard ConfigMaps")
}
```

## Testing with Namespace Isolation

Use unique namespaces to isolate parallel tests:

```go
func TestInIsolatedNamespace(t *testing.T) {
    t.Parallel()

    uniqueId := random.UniqueId()
    namespace := fmt.Sprintf("test-%s", uniqueId)

    // Use the default kubeconfig
    k8sOptions := k8s.NewKubectlOptions("", "", namespace)

    // Create the namespace
    k8s.CreateNamespace(t, k8sOptions, namespace)

    // Clean up the namespace when done
    defer k8s.DeleteNamespace(t, k8sOptions, namespace)

    opts := &terraform.Options{
        TerraformDir: "../modules/k8s-app",
        Vars: map[string]interface{}{
            "namespace": namespace,
            "app_name":  "isolated-app",
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    // Run tests within the isolated namespace
    pods := k8s.ListPods(t, k8sOptions, metav1.ListOptions{})
    assert.Greater(t, len(pods), 0)
}
```

## Testing NetworkPolicies

Verify that network policies are correctly restricting traffic:

```go
func TestNetworkPolicy(t *testing.T) {
    t.Parallel()

    uniqueId := random.UniqueId()
    namespace := fmt.Sprintf("test-netpol-%s", uniqueId)

    opts := &terraform.Options{
        TerraformDir: "../modules/k8s-network-policy",
        Vars: map[string]interface{}{
            "namespace": namespace,
            "app_name":  "secure-app",
            "allowed_namespaces": []string{"monitoring"},
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)

    kubeconfigPath := terraform.Output(t, opts, "kubeconfig_path")
    k8sOptions := k8s.NewKubectlOptions("", kubeconfigPath, namespace)

    // Verify the NetworkPolicy was created
    // Use kubectl to check, since Terratest does not have a dedicated NetworkPolicy helper
    output, err := k8s.RunKubectlAndGetOutputE(t, k8sOptions,
        "get", "networkpolicy", "secure-app-policy", "-o", "json")
    assert.NoError(t, err)
    assert.Contains(t, output, "secure-app-policy")
    assert.Contains(t, output, "monitoring",
        "Network policy should reference the monitoring namespace")
}
```

## Running Kubernetes Tests in CI

```yaml
# .github/workflows/k8s-terratest.yml
name: Kubernetes Terratest

on:
  pull_request:
    paths:
      - 'modules/k8s-**'

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false

      # Create a local cluster for testing
      - name: Create Kind Cluster
        uses: helm/kind-action@v1.10.0
        with:
          cluster_name: test-cluster

      - name: Run Tests
        working-directory: test
        run: |
          export KUBECONFIG=$HOME/.kube/config
          go test -v -timeout 20m -run TestKubernetes -parallel 2
```

## Summary

Terratest's Kubernetes module bridges the gap between Terraform provisioning and actual cluster behavior. You can verify that deployments reach the desired replica count, services get external endpoints, pods have correct resource limits, and Helm charts deploy the expected components. Combined with namespace isolation and kind clusters for CI, you get fast, reliable tests for your Kubernetes infrastructure.

For more Terratest patterns, see [How to Use Terratest for Go-Based Terraform Testing](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terratest-for-go-based-terraform-testing/view) and [How to Write Terratest Tests for AWS Resources](https://oneuptime.com/blog/post/2026-02-23-how-to-write-terratest-tests-for-aws-resources/view).
