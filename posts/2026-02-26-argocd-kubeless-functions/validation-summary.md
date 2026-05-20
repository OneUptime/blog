# Validation Summary: How to Deploy Kubeless Functions with ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kubeless
- Kustomize
- Prometheus Operator ServiceMonitor
- Python
- Node.js
- Go

## Sources Consulted
- Kubeless archived repository README: https://github.com/vmware-archive/kubeless
- Kubeless v1.0.8 release manifest: https://github.com/vmware-archive/kubeless/releases/download/v1.0.8/kubeless-v1.0.8.yaml
- Kubeless runtime documentation: https://github.com/vmware-archive/kubeless/blob/master/docs/runtimes.md
- Kubeless advanced function deployment documentation: https://github.com/vmware-archive/kubeless/blob/master/docs/advanced-function-deployment.md
- Kubeless function controller configuration documentation: https://github.com/vmware-archive/kubeless/blob/master/docs/function-controller-configuration.md
- Kubeless HTTP trigger documentation: https://github.com/vmware-archive/kubeless/blob/master/docs/http-triggers.md
- Kubeless CronJob trigger documentation: https://github.com/vmware-archive/kubeless/blob/master/docs/cronjob-triggers.md
- Kubeless HTTP trigger API source: https://github.com/kubeless/http-trigger
- Kubeless CronJob trigger API source: https://github.com/kubeless/cronjob-trigger
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The post described Kubeless as being in maintenance mode. The upstream repository is archived and states that Kubeless is no longer actively maintained, so the wording was updated throughout the post.
- The controller Deployment snippet only showed the function controller and omitted the HTTP trigger and CronJob trigger controllers included in the v1.0.8 release manifest. The snippet was updated to match the released controller container layout and environment variables more closely.
- The runtime ConfigMap used `runtimeImage` and `initImage` fields and referenced Python 3.9, Node.js 18, and Go 1.21 runtimes. Kubeless v1.0.8 uses an `images` array with `phase` entries, and the released manifest includes runtimes such as `python38`, `node14`, and `go1.14`. The ConfigMap and function manifests were updated accordingly.
- The Function manifests omitted `function-content-type: text`, which is part of the documented Function specification for inline function source. The field was added to the examples.
- The Kustomize patch example used a Kubernetes-object-style patch for a Kubeless custom resource. Kubernetes documentation recommends JSON patch for arbitrary fields and resources when strategic merge is not supported, so the patch was changed to JSON patch and the target now includes the Kubeless group and version.

## Review Notes
- Kubeless is obsolete and its final released runtimes are old. The corrected examples are accurate for Kubeless v1.0.8, but new production deployments should strongly consider Knative, OpenFaaS, or another actively maintained serverless platform.
- The Kubeless v1.0.8 manifest still uses some deprecated Kubernetes APIs internally, including `apiextensions.k8s.io/v1beta1` CRDs and `rbac.authorization.k8s.io/v1beta1` RBAC resources. Existing clusters that still run Kubeless need Kubernetes version compatibility checks before applying these manifests.
