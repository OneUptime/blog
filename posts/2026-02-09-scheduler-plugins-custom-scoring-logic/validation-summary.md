# Validation Summary: How to Use Scheduler Plugins Framework to Add Custom Scoring Logic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes scheduler framework
- Kubernetes scheduler plugins
- Go
- kube-scheduler configuration
- Kubernetes RBAC
- Docker
- kubectl

## Sources Consulted
- Kubernetes Scheduling Framework documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/scheduling-framework/
- Kubernetes Scheduler Configuration documentation: https://kubernetes.io/docs/reference/scheduling/config/
- Kubernetes Configure Multiple Schedulers documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/configure-multiple-schedulers/
- Kubernetes v1.28 scheduler framework source: https://raw.githubusercontent.com/kubernetes/kubernetes/v1.28.0/pkg/scheduler/framework/interface.go
- Go package documentation for k8s.io/kubernetes/pkg/scheduler/framework: https://pkg.go.dev/k8s.io/kubernetes/pkg/scheduler/framework
- Go package documentation for k8s.io/kubernetes/cmd/kube-scheduler/app: https://pkg.go.dev/k8s.io/kubernetes/cmd/kube-scheduler/app

## Issues Found
- The scheduler extension point list omitted the pre-enqueue extension point. Added pre-enqueue to match the Kubernetes scheduler framework documentation.
- The post said the framework handles score normalization generally. Adjusted this to optional score normalization, because normalization only occurs when a scoring plugin implements ScoreExtensions.
- The setup commands omitted k8s.io/component-base even though the main.go example imports k8s.io/component-base/cli. Added the matching v0.28.0 dependency.
- The CostAware and DataLocality packages were referenced as costaware.Name and datalocality.Name from main.go, but their snippets did not define exported Name constants. Added Name constants and returned them from Name().
- The CostAware plugin did not check for a nil node returned from NodeInfo.Node(). Added an error status for that case.
- The CostAware plugin ignored fmt.Sscanf errors, which could make malformed cost labels score as the cheapest nodes. Added parsing error handling that returns the neutral score.
- The DataLocality plugin used strings.Split(..., "-")[0] to infer same-region placement, which would incorrectly treat zones such as us-west-2a and us-east-1a as the same region. Replaced this with an explicit data-region pod label and topology.kubernetes.io/region node label comparison.
- The DataLocality plugin did not check for a nil node returned from NodeInfo.Node(). Added an error status for that case.
- The scheduler configuration claimed to keep default plugins by explicitly enabling two defaults. Updated the comment to say those entries tune default plugin weights, since default plugins remain enabled unless disabled.
- The deployment manifest referenced serviceAccountName: custom-scheduler without defining the service account or scheduler RBAC. Added the ServiceAccount, system:kube-scheduler ClusterRoleBinding, system:volume-scheduler ClusterRoleBinding, and extension-apiserver-authentication-reader RoleBinding resources shown in Kubernetes' multiple-scheduler guidance.
- The deployment passed --leader-elect=false while also using a scheduler config file. Moved leader election into the KubeSchedulerConfiguration so the configuration owns that setting.

## Review Notes
The reviewed snippets match the documented scheduler framework interfaces and configuration shape for Kubernetes v1.28-era APIs after the fixes. The local workspace does not have the Go toolchain installed, so I could not run a compile check for the complete example module.
