# Validation Summary: How to Install Istio in an Air-Gapped Environment

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Istio
- Kubernetes
- Helm
- Docker
- containerd / ctr
- Private container registries
- Air-gapped installation workflows

## Sources Consulted
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio 1.30.0 release announcement: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio install with Helm: https://istio.io/latest/docs/setup/install/helm/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio installation configuration profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio Bookinfo sample manifest for 1.30.0: https://raw.githubusercontent.com/istio/istio/1.30.0/samples/bookinfo/platform/kube/bookinfo.yaml
- Istio addon sample manifests for 1.30.0: https://github.com/istio/istio/tree/1.30.0/samples/addons
- Docker save command reference: https://docs.docker.com/reference/cli/docker/image/save/
- Kubernetes image pull secrets documentation: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/

## Issues Found
- The post pinned Istio 1.24.0, which is no longer supported. Updated the examples to Istio 1.30.0, the current supported release at validation time.
- The Docker save examples placed `-o` after the image list. Updated them to the documented `docker save -o <file> IMAGE...` form.
- The Bookinfo and observability addon image examples used older image locations and tags. Updated them to match the official Istio 1.30.0 sample manifests.
- The Helm gateway install did not set `global.hub` and `global.tag`, so the gateway could still pull from the public Istio registry. Added the same internal registry settings used for `istiod`.
- The verification command used `istioctl verify-install`, which is not present in the current istioctl command reference. Replaced it with `istioctl install -f ... --verify -y`.
- The sidecar image check expected a literal full image in the injector config. Adjusted the grep to inspect hub, tag, and image-related fields.
- The registry pull-secret example created the secret in `istio-system` but patched a service account in `my-app`. Updated the example so the secret is created in the namespace whose workload service account references it.

## Review Notes
- The guide covers a sidecar-mode/default-profile installation. Ambient mode requires additional images and charts such as ztunnel and should be documented separately if added later.
- The `ctr` example shows the workflow for one image only; operators should repeat it for each required image or use a registry-sync tool in production.
