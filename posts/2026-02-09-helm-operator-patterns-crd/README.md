# How to Build Helm Operator Patterns That Watch for Chart CRD Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, Operators

Description: Learn how to build Helm operator patterns that watch for custom resource definition changes and automatically manage chart deployments with real code examples.

---

Helm operators extend Kubernetes by combining the power of Helm charts with the operator pattern. They watch for custom resource definition (CRD) changes and automatically manage application lifecycle based on those resources. This approach gives you declarative management of complex applications while leveraging existing Helm charts.

## Understanding the Helm Operator Pattern

Traditional Helm usage requires manual commands to install, upgrade, or rollback releases. Helm operators automate this by watching Kubernetes resources and reconciling the desired state defined in CRDs with actual Helm releases. When you create or modify a CRD instance, the operator detects the change and performs the appropriate Helm operations.

The operator pattern solves several problems. It eliminates manual intervention for chart management, provides continuous reconciliation to fix configuration drift, and enables GitOps workflows where you commit CRD changes to version control.

## Building a Basic Helm Operator CRD

Start by defining a custom resource that represents your Helm release. This CRD should capture the chart name, version, values, and other configuration needed to manage the release.

```yaml
# helmrelease-crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: helmreleases.charts.example.com
spec:
  group: charts.example.com
  names:
    kind: HelmRelease
    plural: helmreleases
    singular: helmrelease
    shortNames:
    - hr
  scope: Namespaced
  versions:
  - name: v1alpha1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            required:
            - chart
            - version
            properties:
              chart:
                type: string
                description: Name of the Helm chart
              version:
                type: string
                description: Chart version to deploy
              repo:
                type: string
                description: Helm repository URL
              values:
                type: object
                x-kubernetes-preserve-unknown-fields: true
                description: Values to override in the chart
              suspend:
                type: boolean
                description: Suspend reconciliation
          status:
            type: object
            properties:
              conditions:
                type: array
                items:
                  type: object
                  properties:
                    type:
                      type: string
                    status:
                      type: string
                    lastTransitionTime:
                      type: string
                      format: date-time
                    reason:
                      type: string
                    message:
                      type: string
              lastAppliedRevision:
                type: string
              releaseStatus:
                type: string
```

This CRD defines a HelmRelease resource that users can create to manage their Helm deployments declaratively.

## Implementing the Operator Controller

The controller watches for changes to HelmRelease resources and reconciles them. Using controller-runtime, you can build this efficiently in Go.

```go
// helmrelease_controller.go
package controllers

import (
    "context"
    "fmt"
    "time"

    "helm.sh/helm/v3/pkg/action"
    "helm.sh/helm/v3/pkg/chart/loader"
    "helm.sh/helm/v3/pkg/cli"
    "k8s.io/apimachinery/pkg/runtime"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/log"

    chartsv1alpha1 "example.com/helmoperator/api/v1alpha1"
)

type HelmReleaseReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

// Reconcile handles HelmRelease resource changes
func (r *HelmReleaseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    // Fetch the HelmRelease instance
    var helmRelease chartsv1alpha1.HelmRelease
    if err := r.Get(ctx, req.NamespacedName, &helmRelease); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    // Check if reconciliation is suspended
    if helmRelease.Spec.Suspend {
        logger.Info("Reconciliation suspended for HelmRelease")
        return ctrl.Result{}, nil
    }

    // Configure Helm action
    settings := cli.New()
    settings.SetNamespace(req.Namespace)

    actionConfig := new(action.Configuration)
    if err := actionConfig.Init(settings.RESTClientGetter(), req.Namespace,
        "secret", func(format string, v ...interface{}) {
            logger.Info(fmt.Sprintf(format, v...))
        }); err != nil {
        return ctrl.Result{}, err
    }

    // Check if release exists
    releaseExists, err := r.releaseExists(actionConfig, helmRelease.Name)
    if err != nil {
        return ctrl.Result{}, err
    }

    if releaseExists {
        // Upgrade existing release
        if err := r.upgradeRelease(ctx, actionConfig, &helmRelease); err != nil {
            r.updateStatus(ctx, &helmRelease, "Failed", err.Error())
            return ctrl.Result{RequeueAfter: time.Minute}, err
        }
    } else {
        // Install new release
        if err := r.installRelease(ctx, actionConfig, &helmRelease); err != nil {
            r.updateStatus(ctx, &helmRelease, "Failed", err.Error())
            return ctrl.Result{RequeueAfter: time.Minute}, err
        }
    }

    r.updateStatus(ctx, &helmRelease, "Deployed", "Release reconciled successfully")
    return ctrl.Result{RequeueAfter: 5 * time.Minute}, nil
}

func (r *HelmReleaseReconciler) releaseExists(cfg *action.Configuration, name string) (bool, error) {
    listClient := action.NewList(cfg)
    releases, err := listClient.Run()
    if err != nil {
        return false, err
    }

    for _, rel := range releases {
        if rel.Name == name {
            return true, nil
        }
    }
    return false, nil
}

func (r *HelmReleaseReconciler) installRelease(ctx context.Context, cfg *action.Configuration, hr *chartsv1alpha1.HelmRelease) error {
    client := action.NewInstall(cfg)
    client.ReleaseName = hr.Name
    client.Namespace = hr.Namespace
    client.Version = hr.Spec.Version

    // Load chart from repository
    chartPath, err := client.ChartPathOptions.LocateChart(hr.Spec.Chart, cli.New())
    if err != nil {
        return err
    }

    chart, err := loader.Load(chartPath)
    if err != nil {
        return err
    }

    // Install with custom values
    _, err = client.Run(chart, hr.Spec.Values)
    return err
}

func (r *HelmReleaseReconciler) upgradeRelease(ctx context.Context, cfg *action.Configuration, hr *chartsv1alpha1.HelmRelease) error {
    client := action.NewUpgrade(cfg)
    client.Namespace = hr.Namespace
    client.Version = hr.Spec.Version

    chartPath, err := client.ChartPathOptions.LocateChart(hr.Spec.Chart, cli.New())
    if err != nil {
        return err
    }

    chart, err := loader.Load(chartPath)
    if err != nil {
        return err
    }

    _, err = client.Run(hr.Name, chart, hr.Spec.Values)
    return err
}

func (r *HelmReleaseReconciler) updateStatus(ctx context.Context, hr *chartsv1alpha1.HelmRelease, status, message string) {
    hr.Status.ReleaseStatus = status
    hr.Status.LastAppliedRevision = hr.Spec.Version
    r.Status().Update(ctx, hr)
}

// SetupWithManager sets up the controller with the Manager
func (r *HelmReleaseReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&chartsv1alpha1.HelmRelease{}).
        Complete(r)
}
```

This controller watches HelmRelease resources and performs install or upgrade operations based on whether the release already exists.

## Using the Helm Operator

Once your operator is deployed, users can create HelmRelease resources to manage applications.

```yaml
# nginx-release.yaml
apiVersion: charts.example.com/v1alpha1
kind: HelmRelease
metadata:
  name: my-nginx
  namespace: default
spec:
  chart: nginx
  version: 15.0.0
  repo: https://charts.bitnami.com/bitnami
  values:
    replicaCount: 3
    service:
      type: LoadBalancer
    resources:
      requests:
        memory: "256Mi"
        cpu: "200m"
```

Apply this resource and the operator automatically installs the nginx chart with the specified values.

## Handling CRD Updates

When users modify the HelmRelease resource, the controller detects the change through its watch mechanism and triggers reconciliation. The controller compares the desired state in the CRD with the actual Helm release state.

```go
// Add to your reconciler to handle updates intelligently
func (r *HelmReleaseReconciler) needsUpdate(current *release.Release, hr *chartsv1alpha1.HelmRelease) bool {
    // Check version change
    if current.Chart.Metadata.Version != hr.Spec.Version {
        return true
    }

    // Check values change by comparing digests
    currentValues := current.Config
    desiredValues := hr.Spec.Values

    // Perform deep comparison of values
    return !reflect.DeepEqual(currentValues, desiredValues)
}
```

## Advanced Patterns

For production use, implement health checks that verify the deployed resources are ready before marking the HelmRelease as successful.

```go
func (r *HelmReleaseReconciler) checkReleaseHealth(ctx context.Context, releaseName, namespace string) error {
    // Get all resources from the release
    var deploymentList appsv1.DeploymentList
    if err := r.List(ctx, &deploymentList,
        client.InNamespace(namespace),
        client.MatchingLabels{"app.kubernetes.io/instance": releaseName}); err != nil {
        return err
    }

    // Check each deployment's status
    for _, dep := range deploymentList.Items {
        if dep.Status.ReadyReplicas != dep.Status.Replicas {
            return fmt.Errorf("deployment %s not ready: %d/%d",
                dep.Name, dep.Status.ReadyReplicas, dep.Status.Replicas)
        }
    }

    return nil
}
```

Add dependency management to ensure releases install in the correct order when they depend on each other.

```yaml
spec:
  chart: my-app
  version: 1.0.0
  dependsOn:
  - name: database
    namespace: default
  - name: cache
    namespace: default
```

Implement automatic rollback when upgrades fail by catching errors and using Helm's rollback action.

## Monitoring and Observability

Expose metrics about your operator's reconciliation behavior using Prometheus metrics.

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "sigs.k8s.io/controller-runtime/pkg/metrics"
)

var (
    reconcileTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "helmrelease_reconcile_total",
            Help: "Total number of reconciliations",
        },
        []string{"namespace", "name", "result"},
    )
)

func init() {
    metrics.Registry.MustRegister(reconcileTotal)
}

// In your reconcile function
reconcileTotal.WithLabelValues(req.Namespace, req.Name, "success").Inc()
```

The Helm operator pattern provides powerful automation for managing complex applications in Kubernetes. By combining CRDs with Helm's package management capabilities, you get declarative, version-controlled application deployment that reconciles continuously to maintain desired state. This pattern is particularly valuable in GitOps workflows where infrastructure changes flow through pull requests and automated pipelines.
