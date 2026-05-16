# Validation Summary: How to Set Up Image Pull Policies in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes image pull policies
- Kubernetes Pod, Deployment, DaemonSet, ServiceAccount, and Secret manifests
- kubectl
- Talos Linux machine registry configuration
- talosctl
- Kyverno ClusterPolicy validation

## Sources Consulted
- Kubernetes documentation: Images, image pull policies, defaults, digests, image pull backoff, and imagePullSecrets: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes kubectl reference: `kubectl create secret docker-registry`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes service account administration documentation for automatic `imagePullSecrets`: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Talos Linux CLI reference for `talosctl image list` and `talosctl image pull`: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux machine configuration reference for `machine.registries`: https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config
- Kyverno validate rules documentation for `failureAction` and deprecated `validationFailureAction`: https://kyverno.io/docs/policy-types/cluster-policy/validate/

## Issues Found
- The post said Talos users cannot manually pull images onto nodes. Current Talos provides `talosctl image pull`, so the wording was changed to explain that users typically do not SSH into nodes and run runtime commands manually.
- The `Always` image pull policy was described as always pulling the image even when a local copy exists. Kubernetes resolves the image name on every start, but cached layers for the exact digest can be reused, so the explanation was corrected.
- The default pull policy explanation did not mention digest references. Kubernetes defaults digest references to `IfNotPresent`, so that was added.
- The production guidance implied version tags are exact guarantees. Tags can be overwritten, so the text now says specific, non-overwritten tags indicate the intended version.
- The Talos cached image command used `talosctl images --nodes`, which is outdated for current Talos CLI docs. It was changed to `talosctl image list --nodes`.
- The pre-puller DaemonSet comment said the DaemonSet exits, but the pause container keeps a pod running on each node. The comment and explanation were corrected, and the current `talosctl image pull` option was noted.
- The Kyverno example used deprecated top-level `spec.validationFailureAction`. It was updated to the current per-rule `validate.failureAction`.

## Review Notes
The remaining examples are syntactically consistent with Kubernetes and Talos documentation. The Kyverno example validates regular containers only; clusters that also want to enforce init containers or ephemeral containers should extend the policy in the future.
