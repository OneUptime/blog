# Validation Summary: How to Deploy Kubeflow with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Kubeflow
- Flux CD
- Kubernetes
- Kustomize
- Istio
- oauth2-proxy
- Dex
- Kubeflow Pipelines
- Kubeflow Notebooks
- KServe
- Knative
- Kubeflow Training Operator

## Sources Consulted
- Kubeflow manifests v1.9.0 release notes: https://github.com/kubeflow/manifests/releases/tag/v1.9.0
- Kubeflow manifests v1.9.0 repository README and checked-out manifest paths: https://github.com/kubeflow/manifests/tree/v1.9.0
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux reconcile CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile/
- Kubeflow Profiles and Namespaces documentation: https://www.kubeflow.org/docs/components/central-dash/profiles/
- Kubeflow Pipelines multi-user isolation documentation: https://www.kubeflow.org/docs/components/pipelines/operator-guides/multi-user/
- KServe serverless installation documentation: https://kserve.github.io/website/0.11/admin/serverless/serverless/

## Issues Found
- The prerequisites listed Kubernetes v1.25 or later, but Kubeflow manifests v1.9.0 officially targets Kubernetes 1.27 to 1.29. Updated the prerequisite and added the documented Kustomize 5.2.1+ requirement.
- The Istio install path used `common/istio-1-22/istio-install/overlays/helm`, which does not exist in the Kubeflow manifests v1.9.0 tag. Changed it to `common/istio-1-22/istio-install/overlays/oauth2-proxy` and added the missing Istio namespace and Kubeflow Istio resources Kustomizations.
- The authentication examples used the older OIDC authservice-style Dex configuration. Kubeflow v1.9.0 replaced oidc-authservice with oauth2-proxy, so the guide now deploys oauth2-proxy and uses the Dex oauth2-proxy overlay.
- The guide referenced Kubeflow roles and Profiles as dependencies but did not deploy the corresponding Kubeflow roles or Profiles controller manifests. Added Flux Kustomizations for both and moved user Profile resources behind a dependent Flux Kustomization so the Profile CRD exists first.
- The KServe section described serverless serving but did not deploy Knative, which is required for KServe serverless mode. Added Knative Serving and cluster-local gateway Kustomizations before KServe.
- The master `kustomization.yaml` used a Flux `Kustomization` custom resource where Kustomize expects a `kustomize.config.k8s.io` Kustomization file. Split the examples into a Kustomize `kustomization.yaml` for local resources and a separate Flux Kustomization at `clusters/production/kubeflow.yaml`.
- The verification step port-forwarded the Kubeflow Pipelines UI service directly. Updated it to port-forward the Istio ingress gateway, matching the Kubeflow manifests access pattern.

## Review Notes
The corrected guide is aligned to the pinned Kubeflow manifests v1.9.0 tag. For production use, the Dex static password example should be replaced with a real bcrypt hash or an external identity provider.
