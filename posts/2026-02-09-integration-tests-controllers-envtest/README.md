# How to Write Integration Tests for Kubernetes Controllers with envtest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Testing, envtest, Controllers

Description: Learn how to write comprehensive integration tests for Kubernetes controllers using envtest to run a real API server and etcd without requiring a full cluster.

---

Unit tests verify individual functions work correctly. But controllers interact with the Kubernetes API server, watch resources, update status, and handle complex state transitions. You can mock the API, but mocks don't catch real integration issues like incorrect RBAC, wrong API versions, or missing owner references.

envtest provides a real Kubernetes API server and etcd for testing. Your controller talks to actual Kubernetes components without needing a full cluster. Tests run fast, reliably, and in CI. This guide shows you how to write integration tests with envtest.

## Understanding envtest

envtest is part of controller-runtime. It downloads API server and etcd binaries, starts them on random ports, and provides a kubeconfig. Your tests create a real client, run your controller, and interact with actual Kubernetes resources.

The environment is ephemeral. Each test suite gets a fresh API server and etcd. This ensures test isolation and prevents flaky tests from shared state.

## Installing envtest

Kubebuilder projects include envtest by default. For existing projects, install it.

```bash
go get sigs.k8s.io/controller-runtime/pkg/envtest

# Download test binaries
go install sigs.k8s.io/controller-runtime/tools/setup-envtest@latest
setup-envtest use
```

## Creating a Test Suite

Set up envtest in your test suite.

```go
// controllers/suite_test.go
package controllers

import (
    "context"
    "path/filepath"
    "testing"
    "time"

    . "github.com/onsi/ginkgo/v2"
    . "github.com/onsi/gomega"

    "k8s.io/client-go/kubernetes/scheme"
    "k8s.io/client-go/rest"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/envtest"
    logf "sigs.k8s.io/controller-runtime/pkg/log"
    "sigs.k8s.io/controller-runtime/pkg/log/zap"

    appsv1 "github.com/yourorg/application-operator/api/v1"
)

var (
    cfg       *rest.Config
    k8sClient client.Client
    testEnv   *envtest.Environment
    ctx       context.Context
    cancel    context.CancelFunc
)

func TestControllers(t *testing.T) {
    RegisterFailHandler(Fail)
    RunSpecs(t, "Controller Suite")
}

var _ = BeforeSuite(func() {
    logf.SetLogger(zap.New(zap.WriteTo(GinkgoWriter), zap.UseDevMode(true)))

    ctx, cancel = context.WithCancel(context.TODO())

    By("bootstrapping test environment")
    testEnv = &envtest.Environment{
        CRDDirectoryPaths:     []string{filepath.Join("..", "config", "crd", "bases")},
        ErrorIfCRDPathMissing: true,
    }

    var err error
    cfg, err = testEnv.Start()
    Expect(err).NotTo(HaveOccurred())
    Expect(cfg).NotTo(BeNil())

    err = appsv1.AddToScheme(scheme.Scheme)
    Expect(err).NotTo(HaveOccurred())

    k8sClient, err = client.New(cfg, client.Options{Scheme: scheme.Scheme})
    Expect(err).NotTo(HaveOccurred())
    Expect(k8sClient).NotTo(BeNil())

    // Start controller manager
    k8sManager, err := ctrl.NewManager(cfg, ctrl.Options{
        Scheme: scheme.Scheme,
    })
    Expect(err).ToNot(HaveOccurred())

    err = (&ApplicationReconciler{
        Client: k8sManager.GetClient(),
        Scheme: k8sManager.GetScheme(),
    }).SetupWithManager(k8sManager)
    Expect(err).ToNot(HaveOccurred())

    go func() {
        defer GinkgoRecover()
        err = k8sManager.Start(ctx)
        Expect(err).ToNot(HaveOccurred(), "failed to run manager")
    }()
})

var _ = AfterSuite(func() {
    cancel()
    By("tearing down the test environment")
    err := testEnv.Stop()
    Expect(err).NotTo(HaveOccurred())
})
```

## Writing Controller Tests

Test the full reconciliation cycle.

```go
// controllers/application_controller_test.go
package controllers

import (
    "time"

    . "github.com/onsi/ginkgo/v2"
    . "github.com/onsi/gomega"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/types"

    appsexamplev1 "github.com/yourorg/application-operator/api/v1"
)

var _ = Describe("Application Controller", func() {
    const (
        timeout  = time.Second * 10
        interval = time.Millisecond * 250
    )

    Context("When creating an Application", func() {
        It("Should create a Deployment", func() {
            ctx := context.Background()

            // Create namespace
            namespace := &corev1.Namespace{
                ObjectMeta: metav1.ObjectMeta{
                    Name: "test-namespace",
                },
            }
            Expect(k8sClient.Create(ctx, namespace)).Should(Succeed())

            // Create Application
            app := &appsexamplev1.Application{
                ObjectMeta: metav1.ObjectMeta{
                    Name:      "test-app",
                    Namespace: "test-namespace",
                },
                Spec: appsexamplev1.ApplicationSpec{
                    Image:    "nginx:latest",
                    Replicas: 3,
                    Port:     80,
                },
            }
            Expect(k8sClient.Create(ctx, app)).Should(Succeed())

            // Verify Deployment was created
            deployment := &appsv1.Deployment{}
            Eventually(func() error {
                return k8sClient.Get(ctx, types.NamespacedName{
                    Name:      "test-app",
                    Namespace: "test-namespace",
                }, deployment)
            }, timeout, interval).Should(Succeed())

            // Verify Deployment spec
            Expect(*deployment.Spec.Replicas).Should(Equal(int32(3)))
            Expect(deployment.Spec.Template.Spec.Containers[0].Image).Should(Equal("nginx:latest"))
            Expect(deployment.Spec.Template.Spec.Containers[0].Ports[0].ContainerPort).Should(Equal(int32(80)))

            // Verify owner reference
            Expect(deployment.OwnerReferences).Should(HaveLen(1))
            Expect(deployment.OwnerReferences[0].Name).Should(Equal("test-app"))
        })
    })

    Context("When updating an Application", func() {
        It("Should update the Deployment", func() {
            ctx := context.Background()

            // Create Application
            app := &appsexamplev1.Application{
                ObjectMeta: metav1.ObjectMeta{
                    Name:      "update-test-app",
                    Namespace: "test-namespace",
                },
                Spec: appsexamplev1.ApplicationSpec{
                    Image:    "nginx:1.19",
                    Replicas: 2,
                    Port:     8080,
                },
            }
            Expect(k8sClient.Create(ctx, app)).Should(Succeed())

            // Wait for Deployment
            deployment := &appsv1.Deployment{}
            Eventually(func() error {
                return k8sClient.Get(ctx, types.NamespacedName{
                    Name:      "update-test-app",
                    Namespace: "test-namespace",
                }, deployment)
            }, timeout, interval).Should(Succeed())

            // Update Application
            updatedApp := &appsexamplev1.Application{}
            Expect(k8sClient.Get(ctx, types.NamespacedName{
                Name:      "update-test-app",
                Namespace: "test-namespace",
            }, updatedApp)).Should(Succeed())

            updatedApp.Spec.Replicas = 5
            updatedApp.Spec.Image = "nginx:1.20"
            Expect(k8sClient.Update(ctx, updatedApp)).Should(Succeed())

            // Verify Deployment was updated
            Eventually(func() int32 {
                err := k8sClient.Get(ctx, types.NamespacedName{
                    Name:      "update-test-app",
                    Namespace: "test-namespace",
                }, deployment)
                if err != nil {
                    return 0
                }
                return *deployment.Spec.Replicas
            }, timeout, interval).Should(Equal(int32(5)))

            Expect(deployment.Spec.Template.Spec.Containers[0].Image).Should(Equal("nginx:1.20"))
        })
    })

    Context("When deleting an Application", func() {
        It("Should delete the Deployment", func() {
            ctx := context.Background()

            // Create Application
            app := &appsexamplev1.Application{
                ObjectMeta: metav1.ObjectMeta{
                    Name:      "delete-test-app",
                    Namespace: "test-namespace",
                },
                Spec: appsexamplev1.ApplicationSpec{
                    Image:    "nginx:latest",
                    Replicas: 1,
                    Port:     80,
                },
            }
            Expect(k8sClient.Create(ctx, app)).Should(Succeed())

            // Wait for Deployment
            deployment := &appsv1.Deployment{}
            Eventually(func() error {
                return k8sClient.Get(ctx, types.NamespacedName{
                    Name:      "delete-test-app",
                    Namespace: "test-namespace",
                }, deployment)
            }, timeout, interval).Should(Succeed())

            // Delete Application
            Expect(k8sClient.Delete(ctx, app)).Should(Succeed())

            // Verify Deployment was deleted (garbage collected)
            Eventually(func() bool {
                err := k8sClient.Get(ctx, types.NamespacedName{
                    Name:      "delete-test-app",
                    Namespace: "test-namespace",
                }, deployment)
                return errors.IsNotFound(err)
            }, timeout, interval).Should(BeTrue())
        })
    })
})
```

## Testing Status Updates

Verify that controllers update resource status correctly.

```go
var _ = Describe("Application Status", func() {
    It("Should update status fields", func() {
        ctx := context.Background()

        app := &appsexamplev1.Application{
            ObjectMeta: metav1.ObjectMeta{
                Name:      "status-test-app",
                Namespace: "test-namespace",
            },
            Spec: appsexamplev1.ApplicationSpec{
                Image:    "nginx:latest",
                Replicas: 1,
                Port:     80,
            },
        }
        Expect(k8sClient.Create(ctx, app)).Should(Succeed())

        // Wait for status to be updated
        Eventually(func() string {
            updatedApp := &appsexamplev1.Application{}
            err := k8sClient.Get(ctx, types.NamespacedName{
                Name:      "status-test-app",
                Namespace: "test-namespace",
            }, updatedApp)
            if err != nil {
                return ""
            }
            return updatedApp.Status.Phase
        }, timeout, interval).Should(Equal("Running"))

        // Verify Ready status
        finalApp := &appsexamplev1.Application{}
        Expect(k8sClient.Get(ctx, types.NamespacedName{
            Name:      "status-test-app",
            Namespace: "test-namespace",
        }, finalApp)).Should(Succeed())
        Expect(finalApp.Status.Ready).Should(BeTrue())
    })
})
```

## Testing Error Conditions

Verify controller behavior with invalid inputs.

```go
var _ = Describe("Application Error Handling", func() {
    It("Should handle invalid image names", func() {
        ctx := context.Background()

        app := &appsexamplev1.Application{
            ObjectMeta: metav1.ObjectMeta{
                Name:      "invalid-app",
                Namespace: "test-namespace",
            },
            Spec: appsexamplev1.ApplicationSpec{
                Image:    "", // Invalid empty image
                Replicas: 1,
                Port:     80,
            },
        }

        // This should fail due to validation webhook
        err := k8sClient.Create(ctx, app)
        Expect(err).Should(HaveOccurred())
    })
})
```

## Testing Finalizers

Verify cleanup logic runs correctly.

```go
var _ = Describe("Application Finalizers", func() {
    It("Should run cleanup before deletion", func() {
        ctx := context.Background()

        // Create resource that uses finalizers
        app := &appsexamplev1.Application{
            ObjectMeta: metav1.ObjectMeta{
                Name:      "finalizer-test-app",
                Namespace: "test-namespace",
            },
            Spec: appsexamplev1.ApplicationSpec{
                Image:    "nginx:latest",
                Replicas: 1,
                Port:     80,
            },
        }
        Expect(k8sClient.Create(ctx, app)).Should(Succeed())

        // Wait for finalizer to be added
        Eventually(func() []string {
            updatedApp := &appsexamplev1.Application{}
            k8sClient.Get(ctx, types.NamespacedName{
                Name:      "finalizer-test-app",
                Namespace: "test-namespace",
            }, updatedApp)
            return updatedApp.Finalizers
        }, timeout, interval).Should(ContainElement("application.example.com/finalizer"))

        // Delete resource
        Expect(k8sClient.Delete(ctx, app)).Should(Succeed())

        // Verify deletion completed (finalizer was removed)
        Eventually(func() bool {
            err := k8sClient.Get(ctx, types.NamespacedName{
                Name:      "finalizer-test-app",
                Namespace: "test-namespace",
            }, &appsexamplev1.Application{})
            return errors.IsNotFound(err)
        }, timeout, interval).Should(BeTrue())
    })
})
```

## Running Tests

Execute the test suite.

```bash
# Run all tests
make test

# Run with verbose output
go test -v ./controllers/...

# Run specific test
ginkgo -focus "Should create a Deployment" ./controllers/

# Run with coverage
go test -coverprofile=cover.out ./controllers/...
go tool cover -html=cover.out
```

## Best Practices

Use Eventually() for assertions that depend on reconciliation. Controllers run asynchronously.

Set appropriate timeouts. Complex reconciliation might take several seconds.

Clean up resources between tests or use unique names to avoid conflicts.

Test both happy paths and error conditions. Controllers should handle failures gracefully.

Verify status updates separately from spec changes. Status is a different subresource.

Test finalizers to ensure cleanup logic runs correctly.

Use table-driven tests for testing multiple scenarios with similar structure.

## Conclusion

envtest enables comprehensive integration testing for Kubernetes controllers without requiring a full cluster. Tests run fast, reliably, and in CI pipelines.

Set up envtest in your test suite, start your controller, and write tests that create resources and verify reconciliation results. Test status updates, error conditions, and finalizers. Use Eventually() for asynchronous assertions.

Integration tests catch bugs that unit tests miss such as incorrect RBAC, wrong API usage, and reconciliation logic errors. They're essential for building reliable controllers.
