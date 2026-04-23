# Validation Summary: How to Deploy Linkerd with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Linkerd
- Helm
- Gateway API
- mTLS
- Linkerd Viz
- Smallstep `step` CLI

## Sources Consulted
- Linkerd Getting Started: https://linkerd.io/2.18/getting-started/
- Linkerd Supported Kubernetes Versions: https://linkerd.io/2/reference/k8s-versions/
- Linkerd Gateway API support: https://linkerd.io/2.19/features/gateway-api/
- Linkerd Generating your own mTLS root certificates: https://linkerd.io/2.16/tasks/generate-certificates/
- Linkerd Installing Linkerd with Helm: https://linkerd.io/2.10/tasks/install-helm/
- Linkerd Adding your services to Linkerd: https://linkerd.io/2.12/tasks/adding-your-service/
- Linkerd Authorization Policy reference: https://linkerd.io/2.18/reference/authorization-policy/
- Linkerd Viz CLI reference: https://linkerd.io/2/reference/cli/viz/
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The prerequisite `Kubernetes cluster (1.25+)` was too loose for current Linkerd guidance. I changed it to require a Linkerd-supported Kubernetes version and added the official support-matrix dependency instead of leaving a stale hardcoded minimum.
- The post omitted the `step` CLI even though the certificate-generation commands depend on it. I added `step` to the prerequisites.
- The PATH example appended `~/.linkerd2/bin`, which can leave an older `linkerd` binary earlier in `PATH`. I changed it to prepend the directory, matching Linkerd’s docs.
- `kubectl version --short` is no longer part of the current documented `kubectl version` flags. I replaced it with `kubectl version`.
- The post missed the Gateway API requirement for current Linkerd releases. I added a compatible Gateway API install/check step and updated the `linkerd-crds` Helm install to use `--set installGatewayAPI=false` when Gateway API is managed externally.
- The verification step used `linkerd version --client --short` while claiming to check the running Linkerd version. I changed it to `linkerd version --short` so it checks client and control plane versions together.
- The sample `Deployment` manifest was invalid for `apps/v1` because it lacked `.spec.selector` and matching pod template labels. I added both required fields.
- The injection workflow did not apply `deployment.yaml`, and its verification command did not directly prove proxy injection. I added `kubectl apply -f deployment.yaml` and switched verification to the official `jsonpath` container check for `linkerd-proxy`.
- The demo app comment said `bookinfo`, but the manifest URL was Linkerd’s `emojivoto.yml`. I corrected the demo name.
- The policy example used older `ServerAuthorization` style despite current docs preferring `AuthorizationPolicy`. I updated the example to use `AuthorizationPolicy` and removed the hard-coded `HTTP/2` protocol assumption from the generic `Server` example.
- The `linkerd viz routes` example implied route metrics are always available. I clarified that this command depends on per-route configuration being defined.

## Review Notes
- The guide is now technically consistent with current Linkerd and Kubernetes documentation, but it does not pin a specific Linkerd distribution or release. Since upstream Linkerd docs now distinguish edge releases from vendor-provided stable distributions, pinning a tested distribution/version would make the guide more durable.
- This review validated commands and manifests against official documentation, but did not execute them against a live Rancher-managed cluster during the review.
