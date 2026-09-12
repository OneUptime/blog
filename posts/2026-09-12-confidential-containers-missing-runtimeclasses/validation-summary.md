# Validation Summary: Confidential Containers Installed but No RuntimeClasses Appear

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Confidential Containers (CoCo)
- Kubernetes RuntimeClass and DaemonSets
- Confidential Containers Operator and `CcRuntime` custom resources
- Helm
- Kata Containers
- containerd
- kubectl and Kustomize

## Sources Consulted
- [Archived Confidential Containers Operator README and deprecation notice](https://github.com/confidential-containers/operator/blob/c8cace7d8766dc6ac801053525b6f931569736bc/README.md)
- [Archived Confidential Containers Operator installation guide](https://github.com/confidential-containers/operator/blob/c8cace7d8766dc6ac801053525b6f931569736bc/docs/INSTALL.md)
- [Confidential Containers Helm installation guide](https://confidentialcontainers.org/docs/getting-started/installation/)
- [Confidential Containers Helm charts repository](https://github.com/confidential-containers/charts)
- [Kubernetes RuntimeClass documentation](https://kubernetes.io/docs/concepts/containers/runtime-class/)
- [Kubernetes kubectl command reference](https://kubernetes.io/docs/reference/kubectl/)
- [Helm command documentation](https://helm.sh/docs/helm/)

## Issues Found
No technical issues found.

## Review Notes
The operator-specific guidance is intentionally historical and is clearly scoped to the archived operator at commit `c8cace7d`. The example `v0.15.0` Kustomize overlay was rendered successfully during validation, including the documented worker-node selector and RuntimeClass configuration. The current Helm documentation confirms that exposed RuntimeClasses vary by architecture and deployment type.
