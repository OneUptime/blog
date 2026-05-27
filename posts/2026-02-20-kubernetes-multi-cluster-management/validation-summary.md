# Validation Summary: How to Manage Multiple Kubernetes Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kubectl and kubeconfig
- GitOps
- Kustomize
- ExternalName Services
- Istio and Linkerd service mesh concepts
- Argo CD
- Rancher Fleet
- Karmada
- Submariner
- Python subprocess automation
- OneUptime monitoring

## Sources Consulted
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes guide for configuring access to multiple clusters: https://kubernetes.io/docs/tasks/access-application-cluster/configure-access-multiple-clusters/
- Kubernetes Service documentation for ExternalName Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Argo CD cluster management documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-management/
- Istio multi-cluster traffic management documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/multicluster/
- Linkerd multi-cluster documentation: https://linkerd.io/2/reference/multicluster/
- Rancher Fleet documentation: https://fleet.rancher.io/0.11/concepts
- Karmada project documentation: https://karmada.io/
- Submariner documentation: https://submariner.io/getting-started/

## Issues Found
- The Kustomize patch used JSON Patch syntax to append to `/spec/template/spec/containers/0/env/-`. That only works when the `env` array already exists in the base Deployment; otherwise the patch fails because the parent path is missing. Changed the example to an inline strategic merge patch that sets `replicas` and adds the `REGION` environment variable by container name.
- The Python deployment script ran `kubectl rollout status deployment` without a deployment name, selector, or file reference. The kubectl command requires a concrete rollout resource such as `deployment/nginx`, a matching selector, or resources from `-f`. Changed it to `kubectl rollout status -f manifest_path` so the rollout check targets the deployment manifest that was just applied.

## Review Notes
The remaining examples and claims align with the consulted documentation. `commonLabels` is still documented, but teams should be aware that it adds labels to resources and selectors; future edits may prefer the newer `labels` field when selector mutation is not desired. Local validation was limited because `kubectl` and `kustomize` were not installed in this environment; the Python snippet was syntax-checked with `ast.parse`.
