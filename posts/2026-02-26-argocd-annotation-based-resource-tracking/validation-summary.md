# Validation Summary: How to Use Annotation-Based Resource Tracking in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD resource tracking
- Argo CD CLI
- Argo CD Helm chart
- Kubernetes annotations and labels
- Kubernetes kubectl JSONPath

## Sources Consulted
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_tracking/
- Argo CD argocd-cm example documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD app resources command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD app manifests command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_manifests/
- Argo CD 2.14 to 3.0 upgrade notes for annotation tracking defaults and cluster-scoped tracking annotation format: https://argocd.website.cncfstack.com/operator-manual/upgrading/2.14-3.0/
- Official Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Kubernetes annotations documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Argo CD orphaned resources monitoring documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/orphaned-resources/

## Issues Found
- The post described annotation-based tracking as an alternative to the default label-based method. Current Argo CD documentation identifies `annotation` as the default, so the introduction was updated.
- The Helm values example used `server.config`, which is not the current official Argo CD Helm chart path for `argocd-cm` data. It was corrected to `configs.cm.application.resourceTrackingMethod`.
- The instructions said to restart the application controller after changing `application.resourceTrackingMethod`. Official docs require applications to be synced again, or to wait for reconciliation, so the restart command was replaced.
- The cluster-scoped tracking ID format omitted the namespace segment. Argo CD upgrade notes document that cluster-scoped resources use the Application destination namespace in that position, so the format and ClusterRole example were corrected.
- The shared resource section implied annotation tracking gracefully handles multiple applications referencing the same resource. That was narrowed to similar resource names across groups or namespaces, with a note that one Kubernetes resource should still be managed by one Argo CD application.
- The resource tree description implied direct annotation querying and did not account for self-referencing tracking annotations. It was corrected to describe resources Argo CD determines are tracked by the application.
- The comparison command used `argocd app manifests --source live -o json`, but `argocd app manifests` does not support that `-o json` pattern in the official command reference. It was replaced with a shell comparison between the expected tracking ID and the live Kubernetes annotation.
- The orphaned resource detection wording was tightened to match Argo CD's definition of orphaned resources as top-level namespaced resources that do not belong to any Argo CD Application.
- The multiple Argo CD instances recommendation now mentions setting a unique `installationID`, as required by the official resource tracking documentation.

## Review Notes
The post does not specify an Argo CD version. The validation uses current stable Argo CD documentation and Argo CD 3.0 upgrade notes, where annotation-based resource tracking is the default.
