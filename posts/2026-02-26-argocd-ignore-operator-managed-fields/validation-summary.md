# Validation Summary: How to Ignore Operator-Managed Fields in ArgoCD Diff

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD diff customization
- Argo CD sync options
- Kubernetes managedFields and server-side apply
- Horizontal Pod Autoscaler
- Vertical Pod Autoscaler
- cert-manager
- ExternalDNS
- Kyverno and Gatekeeper admission mutation

## Sources Consulted
- Argo CD Diff Customization: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/diffing/
- Argo CD Diff Strategies / Server-Side Diff: https://argo-cd.readthedocs.io/en/stable/user-guide/diff-strategies/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app get-resource` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get-resource/
- Kubernetes Server-Side Apply: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- cert-manager Ingress usage: https://cert-manager.io/docs/usage/ingress/
- ExternalDNS annotations: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- Kyverno mutate rules: https://kyverno.io/docs/policy-types/cluster-policy/mutate/
- Gatekeeper mutation: https://open-policy-agent.github.io/gatekeeper/website/docs/mutation/

## Issues Found
- `kubectl get ... -o json/jsonpath` examples did not request managed fields. Kubernetes omits `metadata.managedFields` from `kubectl get` output unless `--show-managed-fields` is used, so the commands were updated.
- The Argo CD resource inspection command used `argocd app get my-app --resource-name ...`, but `--resource-name` is not a flag for `argocd app get`. It was changed to `argocd app get-resource`.
- The Mermaid diagram used `Note over`, which is sequence diagram syntax, inside a flowchart. It was replaced with a regular flowchart node.
- The VPA section implied VPA modifies Deployment pod templates. It was corrected to explain that VPA normally applies recommendations to Pods and that Deployment template ignore rules only apply when another mutating controller writes those values into workload manifests.
- The cert-manager section implied cert-manager generally adds Ingress annotations and used an invalid `cert-manager.io/issuer-name` annotation. It was changed to describe ingress-shim and HTTP-01 edit-in-place behavior, and to use `managedFieldsManagers` for cert-manager-owned Ingress fields.
- The ExternalDNS section said ExternalDNS adds Kubernetes annotations for ownership. It was corrected to state that ExternalDNS reads annotations from resources; ignore rules are only appropriate when another automation layer injects those annotations live.
- The examples referred to OPA mutation generally. This was narrowed to Gatekeeper mutation, which is the Kubernetes admission component with documented mutation support.
- Server-side diff and server-side apply were described as eliminating most conflict scenarios. This was softened to reflect that they help with predicted live state and field management but do not replace explicit ignore rules.

## Review Notes
The remaining examples are version-neutral for current Argo CD and Kubernetes behavior. `managedFieldsManagers` should still be scoped carefully because ignoring an entire manager can hide unrelated changes owned by that manager.
