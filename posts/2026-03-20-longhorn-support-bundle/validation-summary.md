# Validation Summary: How to Configure Longhorn Support Bundle Manager - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Longhorn
- Kubernetes
- `kubectl`
- `curl`

## Sources Consulted
- Longhorn Support Bundle documentation: https://longhorn.io/docs/1.10.2/troubleshoot/support-bundle/
- Longhorn troubleshooting wiki, including support bundle archive paths: https://github.com/longhorn/longhorn/wiki/Troubleshooting
- Longhorn knowledge base article for support bundle API usage: https://longhorn.io/kb/troubleshooting-create-support-bundle-with-curl/
- Longhorn v1.10.2 CRD manifest (`supportbundles.longhorn.io`): https://raw.githubusercontent.com/longhorn/longhorn/v1.10.2/deploy/longhorn.yaml
- Longhorn manager v1.10.2 `SupportBundle` API type: https://raw.githubusercontent.com/longhorn/longhorn-manager/v1.10.2/k8s/pkg/apis/longhorn/v1beta2/supportbundle.go
- Longhorn manager v1.10.2 support bundle API routes: https://raw.githubusercontent.com/longhorn/longhorn-manager/v1.10.2/api/router.go
- Longhorn manager v1.10.2 support bundle handlers: https://raw.githubusercontent.com/longhorn/longhorn-manager/v1.10.2/api/supportbundle.go
- Longhorn manager v1.10.2 support bundle manager logic: https://raw.githubusercontent.com/longhorn/longhorn-manager/v1.10.2/manager/supportbundle.go
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The post said to navigate to a **Support** page in the UI. Longhorn’s official documentation says the **Generate Support Bundle** action is at the bottom of the Longhorn UI, so the UI steps were corrected.
- The `kubectl` examples used `lhsupportbundle`, but the Longhorn CRD defines the resource as `supportbundle`/`supportbundles` with short name `lhbundle`. The commands were updated to use the correct resource name.
- The post used `.status.fileLocation`, but the current `SupportBundle` status does not expose that field. The example was corrected to use `.status.ownerID`, which is required for the download API route.
- The download example targeted `svc/longhorn-frontend` and `/v1/supportbundles/${BUNDLE_NAME}/download`, which does not match the current Longhorn API. It was corrected to use `svc/longhorn-backend` on port `9500` and the current route format `/v1/supportbundles/{nodeID}/{bundleName}/download`.
- The bundle inspection paths were incorrect. Longhorn support bundles store logs under `bundle/logs/...` and resource manifests under `bundle/yamls/...`, so the archive inspection commands were updated to match the actual bundle layout.
- The cleanup section implied manual deletion is always required. In current Longhorn manager code, a successful download through the support bundle API deletes the `SupportBundle` resource automatically, so the cleanup note was corrected.
- The introduction overstated that the support bundle collects all diagnostic information. Official Longhorn troubleshooting documentation notes that `dmesg` must still be retrieved separately from each node, so the wording was corrected.

## Review Notes
The corrected examples were validated against Longhorn v1.10.2 documentation and Longhorn manager v1.10.2 source code, which uses `longhorn.io/v1beta2` for `SupportBundle`. Longhorn documentation also notes that concurrent support bundle generation is not supported; the post does not mention this limitation, but it is not required for correctness.
