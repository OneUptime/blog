# Validation Summary: How to Create Istio IstioOperator

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio
- IstioOperator API
- istioctl
- Kubernetes
- Kubernetes Deployments, Services, HPAs, PodDisruptionBudgets, and annotations
- Istio ingress and egress gateways
- Istio CNI

## Sources Consulted
- Istio in-cluster operator deprecation announcement: https://istio.io/latest/blog/2024/in-cluster-operator-deprecation-announcement/
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio installation configuration profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio installation customization and gateway configuration: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio command reference for install, upgrade, uninstall, and proxy-config: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio CNI documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio sidecar injection and resource annotation documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/

## Issues Found
- The post used the deprecated in-cluster operator flow (`istioctl operator init`, `kubectl apply` of `IstioOperator` resources, `kubectl get istiooperators`, and `istioctl operator remove`). Updated the post to use the currently supported `istioctl install -f`, `istioctl upgrade -f`, and `istioctl uninstall -f` workflow. Official Istio documentation states the in-cluster operator was deprecated in Istio 1.23 and removed for Istio 1.24+ upgrades, while the IstioOperator file format remains supported by `istioctl`.
- The install command downloaded the latest Istio release but then changed into `istio-1.20.0`. Replaced that with `cd istio-*` and removed the hard-coded `values.global.tag: 1.20.0` from the production example to avoid pinning an outdated release accidentally.
- The post used `istioctl verify-install`, which is not listed in the current Istio command reference. Replaced it with `istioctl install -f <file> --verify`, matching the documented `install --verify` flag.
- Gateway examples placed cloud provider annotations under `k8s.service.annotations`. In the IstioOperator Kubernetes resources schema, service annotations are configured with `k8s.serviceAnnotations`. Moved the AWS service annotations to `serviceAnnotations` in the ingress gateway examples.
- The post used `istioctl proxy-config cluster -n istio-system deploy/istio-ingressgateway`. Updated this to `istioctl proxy-config clusters deployment/istio-ingressgateway.istio-system`, matching the documented workload selector syntax.
- Troubleshooting included in-cluster operator log checks. Removed that command because the corrected installation flow does not deploy an Istio operator controller.

## Review Notes
The remaining IstioOperator examples are syntactically valid YAML and align with the documented IstioOperator schema at a tutorial level. `istioctl` was not installed in the workspace, so live `istioctl validate` or manifest generation was not run; validation was performed against official Istio documentation and by parsing all YAML code fences.
