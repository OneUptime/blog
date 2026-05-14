# Validation Summary: How to Set Up Flux CD on GKE Autopilot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- GKE Autopilot
- Google Cloud
- Kubernetes
- Kustomize
- Flux image automation
- Artifact Registry
- Workload Identity Federation for GKE

## Sources Consulted
- GKE Autopilot resource requests documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/autopilot-resource-requests
- GKE Autopilot security measures documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/autopilot-security
- GKE Workload Identity Federation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- gcloud `container clusters create-auto` reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/create-auto
- Flux bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux image automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux security documentation: https://fluxcd.io/flux/security/
- Flux vertical scaling documentation: https://fluxcd.io/flux/installation/configuration/vertical-scaling/
- Kustomize patches documentation: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/

## Issues Found
- The prerequisites mentioned GitLab, but the tutorial uses `flux bootstrap github` and GitHub-specific environment variables. Changed the prerequisite to a GitHub repository.
- The Autopilot constraints table said resource requests are required. Autopilot can apply default requests when requests are omitted, so the wording was corrected to describe Autopilot-managed requests and why explicit requests are recommended.
- The table gave a single minimum of 50m CPU and 52Mi memory. GKE documents different minimums for general-purpose Pods depending on bursting support, so the table now includes both bursting and non-bursting minimums.
- The DaemonSet row implied DaemonSets are not available by default. Updated it to state that DaemonSets have separate resource defaults and are not needed by the default Flux controllers.
- The bootstrap command did not install the image automation controllers required by the later ImageRepository and ImagePolicy examples. Added `--components-extra=image-reflector-controller,image-automation-controller`.
- The resource patch used several per-controller documents and a broad Kustomize target. Reworked it into a single strategic merge patch with a Kustomize target regex, matching current Kustomize patch behavior where the metadata name is not used when a target is specified.
- The resource examples used memory requests below the non-bursting Autopilot minimum and ephemeral-storage limits that differed from requests. Updated the examples to use 250m CPU, 512Mi memory, and matching ephemeral storage requests and limits.
- The security patch only targeted `source-controller` and used `fsGroup: 65534`. Updated it to target all Flux controllers and match Flux's documented restricted pod security defaults, including `fsGroup: 1337`.
- The Artifact Registry image automation section set `provider: gcp` but omitted the required IAM and Kubernetes service account configuration. Added Artifact Registry Reader binding, Workload Identity User binding, and the image-reflector-controller service account annotation patch.
- The sample app comment said resource requests are mandatory on Autopilot. Updated it to explain that explicit requests prevent Autopilot from applying defaults.
- The ephemeral storage troubleshooting section said explicit ephemeral storage requests are required. Updated it to state that Autopilot defaults omitted ephemeral storage requests and requires ephemeral storage limits to match requests.
- The Workload Identity troubleshooting command only printed a Kubernetes service account token, which does not test Google Cloud authentication. Replaced it with a short-lived test Pod using the image-reflector-controller service account and `gcloud auth print-access-token`.
- The pending-pod troubleshooting command selected Pods with a likely incorrect `app=source-controller` label. Replaced it with `kubectl describe deployment -n flux-system source-controller`.

## Review Notes
The core `gcloud container clusters create-auto`, `gcloud container clusters get-credentials`, `flux bootstrap github`, Flux Kustomization, GitRepository, ImageRepository, ImagePolicy, Kubernetes Deployment, Service, and Namespace examples are consistent with current official documentation after the corrections. The exact resource requests may still need tuning for larger repositories or high reconciliation concurrency.
