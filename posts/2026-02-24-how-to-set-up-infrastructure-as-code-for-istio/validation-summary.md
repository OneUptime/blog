# Validation Summary: How to Set Up Infrastructure as Code for Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Kustomize
- kubectl
- istioctl
- kubeconform
- GitHub Actions
- SOPS / Kubernetes Secrets
- GitOps drift detection

## Sources Consulted
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio authentication policy task: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio request timeouts task: https://istio.io/latest/docs/tasks/traffic-management/request-timeouts/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio download documentation: https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- Istio 1.30 release announcement: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kustomize patches reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- kubeconform documentation: https://github.com/yannh/kubeconform
- Datree CRDs catalog documentation: https://github.com/datreeio/CRDs-catalog

## Issues Found
- The services directories were referenced as Kustomize resources but the repository tree did not show `kustomization.yaml` files inside those directories. Added `kustomization.yaml` entries for each service directory in the example tree so the directory references are valid.
- The Kustomize patch example used a partial Istio `VirtualService` manifest as a patch. For arbitrary CRD fields, Kustomize's JSON 6902 patch form with an explicit target is the safer and documented approach. Replaced the partial manifest with a JSON patch that adds `/spec/http/0/timeout`, and added the `target` block in the overlay.
- The kubeconform example validated the overlay directory directly, which would not validate the rendered Kustomize output. Changed the command to pipe `kubectl kustomize overlays/staging` into kubeconform.
- The GitHub Actions example installed Istio 1.22.0, which is no longer supported. Updated the example to Istio 1.30.0, the current Istio release on the validation date.
- The GitHub Actions example ran `istioctl analyze` as if a live cluster were available. Updated it to use `--use-kube=false` for offline manifest analysis in CI.
- The GitHub Actions example installed kubeconform with `go install` but did not add the Go binary directory to `PATH`. Added `$(go env GOPATH)/bin` to `GITHUB_PATH`.
- The drift detection script compared rendered manifests with raw live YAML from selected resource types, which would produce noisy and unreliable diffs because live objects include server-managed fields and might not match the rendered set. Replaced it with `kubectl diff -k` and explicit exit-code handling.
- Clarified that SOPS-encrypted Secret files should be decrypted in the deployment pipeline before applying them to the cluster.

## Review Notes
The remaining examples are intentionally illustrative and assume supporting files such as `gateway.yaml`, service-level Kustomize files, and `scripts/check-vs-gateway-refs.py` exist in the reader's repository. The Istio APIs used in the examples (`security.istio.io/v1` and `networking.istio.io/v1`) are current for Istio 1.30.
