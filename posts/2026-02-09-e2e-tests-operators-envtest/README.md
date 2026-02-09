# How to Build End-to-End Tests for Kubernetes Operators Using Envtest Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Operators, Testing, Envtest, Controller Runtime

Description: Learn how to build comprehensive end-to-end tests for Kubernetes operators using the envtest framework, testing controller logic without requiring a full cluster.

---

Kubernetes operators automate complex application lifecycle management, but testing operator logic requires validating interactions with the Kubernetes API. The envtest framework from controller-runtime provides a lightweight test environment with real etcd and API server components, enabling fast operator testing without full cluster deployment.

In this guide, we'll build end-to-end tests for a Kubernetes operator using envtest, test reconciliation logic, validate status updates, and ensure operators handle edge cases correctly.

## Understanding Envtest

Envtest runs real Kubernetes API server and etcd binaries locally in test processes. Unlike mocking the API, envtest provides actual Kubernetes behavior including validation, defaulting, and webhooks. This catches integration issues that unit tests miss while remaining fast enough for CI/CD pipelines.

The framework integrates with Go testing and supports parallel test execution. Tests create resources, trigger reconciliation, and verify expected outcomes using the same client libraries as production code. This ensures tests validate actual operator behavior.

Envtest handles lifecycle management of test clusters, cleaning up resources between tests and providing isolated namespaces for parallel execution. This eliminates test interference and makes test suites reliable.

## Setting Up Envtest

Install envtest binaries:

```bash
# Install setup-envtest tool
go install sigs.k8s.io/controller-runtime/tools/setup-envtest@latest

# Download Kubernetes binaries
setup-envtest use 1.28.0 -p path

# Verify installation
$(setup-envtest use 1.28.0 -p path)/kube-apiserver --version
```

Add envtest dependencies to your operator project:

```go
// go.mod additions
require (
    sigs.k8s.io/controller-runtime v0.16.0
    sigs.k8s.io/controller-runtime/tools/setup-envtest v0.0.0-latest
)
```

## Creating a Sample Operator

Define a custom resource:

```go
// api/v1/application_types.go
package v1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type ApplicationSpec struct {
    Image    string `json:"image"`
    Replicas int32  `json:"replicas"`
}

type ApplicationStatus struct {
    ReadyReplicas int32  `json:"readyReplicas"`
    Conditions    []metav1.Condition `json:"conditions"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
type Application struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   ApplicationSpec   `json:"spec,omitempty"`
    Status ApplicationStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true
type ApplicationList struct {
    metav1.TypeMeta `json:",inline"`
    metav1.ListMeta `json:"metadata,omitempty"`
    Items           []Application `json:"items"`
}
```

Implement controller reconciliation:

```go
// controller/application_controller.go
package controller

import (
    "context"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/runtime"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"

    myappv1 "example.com/myoperator/api/v1"
)

type ApplicationReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

func (r *ApplicationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    var app myappv1.Application
    if err := r.Get(ctx, req.NamespacedName, &app); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Create or update deployment
    deployment := r.constructDeployment(&app)
    if err := r.createOrUpdate(ctx, deployment); err != nil {
        return ctrl.Result{}, err
    }

    // Update status
    app.Status.ReadyReplicas = deployment.Status.ReadyReplicas
    if err := r.Status().Update(ctx, &app); err != nil {
        return ctrl.Result{}, err
    }

    return ctrl.Result{}, nil
}

func (r *ApplicationReconciler) constructDeployment(app *myappv1.Application) *appsv1.Deployment {
    // Construct deployment from Application spec
    // Implementation details omitted for brevity
    return &appsv1.Deployment{}
}
```

## Building Envtest Test Suite

Create test suite setup:

```go
// controller/suite_test.go
package controller

import (
    "path/filepath"
    "testing"

    . "github.com/onsi/ginkgo/v2"
    . "github.com/onsi/gomega"
    "k8s.io/client-go/kubernetes/scheme"
    "k8s.io/client-go/rest"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/envtest"

    myappv1 "example.com/myoperator/api/v1"
)

var (
    cfg       *rest.Config
    k8sClient client.Client
    testEnv   *envtest.Environment
)

func TestControllers(t *testing.T) {
    RegisterFailHandler(Fail)
    RunSpecs(t, "Controller Suite")
}

var _ = BeforeSuite(func() {
    // Setup envtest
    testEnv = &envtest.Environment{
        CRDDirectoryPaths: []string{filepath.Join("..", "config", "crd", "bases")},
    }

    var err error
    cfg, err = testEnv.Start()
    Expect(err).NotTo(HaveOccurred())
    Expect(cfg).NotTo(BeNil())

    // Register schemes
    err = myappv1.AddToScheme(scheme.Scheme)
    Expect(err).NotTo(HaveOccurred())

    // Create client
    k8sClient, err = client.New(cfg, client.Options{Scheme: scheme.Scheme})
    Expect(err).NotTo(HaveOccurred())
    Expect(k8sClient).NotTo(BeNil())

    // Start controller manager
    mgr, err := ctrl.NewManager(cfg, ctrl.Options{
        Scheme: scheme.Scheme,
    })
    Expect(err).NotTo(HaveOccurred())

    err = (&ApplicationReconciler{
        Client: mgr.GetClient(),
        Scheme: mgr.GetScheme(),
    }).SetupWithManager(mgr)
    Expect(err).NotTo(HaveOccurred())

    go func() {
        defer GinkgoRecover()
        err = mgr.Start(ctrl.SetupSignalHandler())
        Expect(err).NotTo(HaveOccurred())
    }()
})

var _ = AfterSuite(func() {
    By("tearing down the test environment")
    err := testEnv.Stop()
    Expect(err).NotTo(HaveOccurred())
})
```

## Writing End-to-End Tests

Test basic reconciliation:

```go
// controller/application_controller_test.go
package controller

import (
    "context"
    "time"

    . "github.com/onsi/ginkgo/v2"
    . "github.com/onsi/gomega"
    appsv1 "k8s.io/api/apps/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/types"

    myappv1 "example.com/myoperator/api/v1"
)

var _ = Describe("Application Controller", func() {
    const (
        timeout  = time.Second * 10
        interval = time.Millisecond * 250
    )

    Context("When creating an Application", func() {
        It("Should create a Deployment", func() {
            ctx := context.Background()

            app := &myappv1.Application{
                ObjectMeta: metav1.ObjectMeta{
                    Name:      "test-app",
                    Namespace: "default",
                },
                Spec: myappv1.ApplicationSpec{
                    Image:    "nginx:latest",
                    Replicas: 3,
                },
            }

            By("Creating the Application resource")
            Expect(k8sClient.Create(ctx, app)).Should(Succeed())

            appLookupKey := types.NamespacedName{Name: "test-app", Namespace: "default"}
            createdApp := &myappv1.Application{}

            Eventually(func() bool {
                err := k8sClient.Get(ctx, appLookupKey, createdApp)
                return err == nil
            }, timeout, interval).Should(BeTrue())

            By("Checking that the Deployment was created")
            deploymentLookupKey := types.NamespacedName{Name: "test-app", Namespace: "default"}
            deployment := &appsv1.Deployment{}

            Eventually(func() bool {
                err := k8sClient.Get(ctx, deploymentLookupKey, deployment)
                return err == nil
            }, timeout, interval).Should(BeTrue())

            By("Verifying Deployment spec matches Application spec")
            Expect(*deployment.Spec.Replicas).Should(Equal(app.Spec.Replicas))
            Expect(deployment.Spec.Template.Spec.Containers[0].Image).Should(Equal(app.Spec.Image))
        })
    })

    Context("When updating an Application", func() {
        It("Should update the Deployment", func() {
            ctx := context.Background()

            appLookupKey := types.NamespacedName{Name: "test-app", Namespace: "default"}
            app := &myappv1.Application{}

            By("Fetching the Application")
            Eventually(func() bool {
                err := k8sClient.Get(ctx, appLookupKey, app)
                return err == nil
            }, timeout, interval).Should(BeTrue())

            By("Updating the Application replicas")
            app.Spec.Replicas = 5
            Expect(k8sClient.Update(ctx, app)).Should(Succeed())

            By("Checking that Deployment was updated")
            deployment := &appsv1.Deployment{}
            deploymentLookupKey := types.NamespacedName{Name: "test-app", Namespace: "default"}

            Eventually(func() int32 {
                err := k8sClient.Get(ctx, deploymentLookupKey, deployment)
                if err != nil {
                    return 0
                }
                return *deployment.Spec.Replicas
            }, timeout, interval).Should(Equal(int32(5)))
        })
    })

    Context("When deleting an Application", func() {
        It("Should delete the Deployment", func() {
            ctx := context.Background()

            appLookupKey := types.NamespacedName{Name: "test-app", Namespace: "default"}
            app := &myappv1.Application{}

            By("Fetching the Application")
            Expect(k8sClient.Get(ctx, appLookupKey, app)).Should(Succeed())

            By("Deleting the Application")
            Expect(k8sClient.Delete(ctx, app)).Should(Succeed())

            By("Checking that Deployment was deleted")
            deployment := &appsv1.Deployment{}
            deploymentLookupKey := types.NamespacedName{Name: "test-app", Namespace: "default"}

            Eventually(func() bool {
                err := k8sClient.Get(ctx, deploymentLookupKey, deployment)
                return err != nil
            }, timeout, interval).Should(BeTrue())
        })
    })
})
```

Run tests:

```bash
# Run all tests
make test

# OR directly with go test
go test ./controller/... -v
```

## Testing Status Updates

Test that controller updates status correctly:

```go
var _ = Describe("Application Status", func() {
    It("Should update status when Deployment is ready", func() {
        ctx := context.Background()

        // Create Application
        app := &myappv1.Application{
            ObjectMeta: metav1.ObjectMeta{
                Name:      "status-test-app",
                Namespace: "default",
            },
            Spec: myappv1.ApplicationSpec{
                Image:    "nginx:latest",
                Replicas: 2,
            },
        }

        Expect(k8sClient.Create(ctx, app)).Should(Succeed())

        // Simulate Deployment becoming ready
        deploymentLookupKey := types.NamespacedName{Name: "status-test-app", Namespace: "default"}
        deployment := &appsv1.Deployment{}

        Eventually(func() bool {
            err := k8sClient.Get(ctx, deploymentLookupKey, deployment)
            return err == nil
        }, timeout, interval).Should(BeTrue())

        // Update Deployment status
        deployment.Status.ReadyReplicas = 2
        Expect(k8sClient.Status().Update(ctx, deployment)).Should(Succeed())

        // Check Application status reflects Deployment status
        appLookupKey := types.NamespacedName{Name: "status-test-app", Namespace: "default"}
        updatedApp := &myappv1.Application{}

        Eventually(func() int32 {
            k8sClient.Get(ctx, appLookupKey, updatedApp)
            return updatedApp.Status.ReadyReplicas
        }, timeout, interval).Should(Equal(int32(2)))
    })
})
```

## Testing Error Handling

Test controller behavior during error conditions:

```go
var _ = Describe("Error Handling", func() {
    It("Should handle invalid image specifications", func() {
        ctx := context.Background()

        app := &myappv1.Application{
            ObjectMeta: metav1.ObjectMeta{
                Name:      "invalid-app",
                Namespace: "default",
            },
            Spec: myappv1.ApplicationSpec{
                Image:    "invalid!@#image",
                Replicas: 1,
            },
        }

        Expect(k8sClient.Create(ctx, app)).Should(Succeed())

        // Verify status contains error condition
        appLookupKey := types.NamespacedName{Name: "invalid-app", Namespace: "default"}
        updatedApp := &myappv1.Application{}

        Eventually(func() bool {
            k8sClient.Get(ctx, appLookupKey, updatedApp)
            for _, cond := range updatedApp.Status.Conditions {
                if cond.Type == "Error" && cond.Status == metav1.ConditionTrue {
                    return true
                }
            }
            return false
        }, timeout, interval).Should(BeTrue())
    })
})
```

## Parallel Test Execution

Enable parallel tests with isolated namespaces:

```go
var _ = Describe("Parallel Tests", func() {
    var testNamespace string

    BeforeEach(func() {
        // Create unique namespace for each test
        testNamespace = fmt.Sprintf("test-%d", time.Now().UnixNano())
        ns := &corev1.Namespace{
            ObjectMeta: metav1.ObjectMeta{
                Name: testNamespace,
            },
        }
        Expect(k8sClient.Create(context.Background(), ns)).Should(Succeed())
    })

    AfterEach(func() {
        // Cleanup namespace after test
        ns := &corev1.Namespace{
            ObjectMeta: metav1.ObjectMeta{
                Name: testNamespace,
            },
        }
        Expect(k8sClient.Delete(context.Background(), ns)).Should(Succeed())
    })

    It("Should run independently", func() {
        // Test logic using testNamespace
    })
})
```

## Integration with CI/CD

Create GitHub Actions workflow:

```yaml
# .github/workflows/operator-test.yml
name: Operator Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2

    - name: Setup Go
      uses: actions/setup-go@v2
      with:
        go-version: 1.21

    - name: Install envtest binaries
      run: |
        go install sigs.k8s.io/controller-runtime/tools/setup-envtest@latest
        setup-envtest use 1.28.0

    - name: Run tests
      run: |
        export KUBEBUILDER_ASSETS=$(setup-envtest use 1.28.0 -p path)
        make test

    - name: Upload coverage
      uses: codecov/codecov-action@v2
      with:
        files: ./cover.out
```

## Conclusion

Envtest provides comprehensive testing for Kubernetes operators without requiring full cluster deployments. By running real API server components, tests validate actual operator behavior while remaining fast enough for development workflows.

This testing approach catches integration issues early, ensures operators handle edge cases correctly, and provides confidence that controller logic works as expected before production deployment.

For operator development, combine envtest integration tests with unit tests for business logic, test both happy paths and error scenarios, and integrate testing into CI/CD pipelines to maintain operator quality across changes.
