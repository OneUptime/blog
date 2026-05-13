# Validation Summary: How to Deploy Kubeless with Flux CD

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubeless
- Flux CD v2
- Kubernetes
- Kustomize
- GitOps
- Python functions
- Kubernetes HTTPTrigger and CronJobTrigger custom resources
- Horizontal Pod Autoscaler

## Sources Consulted
- Kubeless v1.0.8 release manifest: https://github.com/kubeless/kubeless/releases/download/v1.0.8/kubeless-v1.0.8.yaml
- Kubeless archived source repository and tag: https://github.com/vmware-archive/kubeless/tree/v1.0.8
- Kubeless Function API source: https://github.com/vmware-archive/kubeless/blob/v1.0.8/pkg/apis/kubeless/v1beta1/function.go
- Kubeless advanced function deployment docs: https://github.com/vmware-archive/kubeless/blob/v1.0.8/docs/advanced-function-deployment.md
- Kubeless HTTP trigger docs: https://github.com/vmware-archive/kubeless/blob/v1.0.8/docs/http-triggers.md
- Kubeless HTTP trigger API source: https://github.com/kubeless/http-trigger/blob/master/pkg/apis/kubeless/v1beta1/http_trigger.go
- Kubeless runtime docs: https://github.com/vmware-archive/kubeless/blob/v1.0.8/docs/runtimes.md
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux installation and supported Kubernetes versions: https://fluxcd.io/flux/installation/

## Issues Found
- The post recommends Kubernetes 1.24+, but the official Kubeless v1.0.8 release manifest uses `apiextensions.k8s.io/v1beta1` CustomResourceDefinition objects and `rbac.authorization.k8s.io/v1beta1` RBAC resources. Kubernetes stopped serving the CRD v1beta1 API in v1.22, so the described installation path cannot work on Kubernetes 1.24+.
- The post points Flux at `./manifests` in the archived Kubeless source repository, but Kubeless' own manifests README says installation should use released manifests from GitHub releases. The repository `manifests/` directory contains add-on/development manifests, not the full released install manifest.
- The Flux source uses `https://github.com/vmware-archive/kubeless` as a GitRepository. That can fetch the archived source tag, but it does not fetch the GitHub release asset `kubeless-v1.0.8.yaml` that the official Kubeless install instructions rely on.
- The `Function` example uses `runtime: python3.8`, but the Kubeless runtime IDs in the v1.0.8 configuration use names such as `python38`, not dotted Python versions.
- The `Function` example embeds an autoscaling/v2-style metric target under `spec.horizontalPodAutoscaler`, but the Kubeless v1.0.8 Function API imports `autoscaling/v2beta1`. Its documented HPA example uses `targetAverageUtilization`, not `target.type` and `target.averageUtilization`.
- The `HTTPTrigger` example uses fields such as `serviceName`, `servicePort`, `hostname`, `routeTimeoutSeconds`, and `corsEnable`. The Kubeless HTTPTrigger API uses fields such as `function-name`, `host-name`, `path`, `gateway`, `tls`, `tls-secret`, and `cors-enable`.
- The testing step port-forwards the generated function service directly and sends JSON to it, which is plausible for invoking the function service, but it does not test the HTTPTrigger path described in the previous step.
- The best-practice recommendation to build and push a container image and reference it through `spec.deployment` is misleading for Kubeless Function resources. Kubeless' documented Function spec customizes Deployment, Service, and HPA fields, while the runtime image selection is managed through the Kubeless controller configuration and runtime metadata.

## Review Notes
Kubeless is archived and its latest official release is based on Kubernetes APIs that are not compatible with currently supported Kubernetes versions. Because the article is framed as a current Flux CD deployment guide and depends on an unsupported Kubeless installation path, it should be removed or replaced with a guide for a maintained serverless framework.
