# Validation Summary: How to Use argocd.argoproj.io/managed-by Annotation

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Argo CD Operator
- Kubernetes namespaces and RBAC
- Argo CD Application and AppProject resources
- Argo CD Applications in any namespace

## Sources Consulted
- Argo CD Applications in any namespace documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/
- Argo CD annotations and labels reference: https://argo-cd.readthedocs.io/en/latest/user-guide/annotations-and-labels/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD sync options and managedNamespaceMetadata documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Operator deploy resources to a different namespace documentation: https://argocd-operator.readthedocs.io/en/stable/usage/deploy-to-different-namespaces/
- Argo CD upstream RBAC examples for Applications in any namespace: https://github.com/argoproj/argo-cd/tree/stable/examples/k8s-rbac/argocd-server-applications

## Issues Found
- The post described `argocd.argoproj.io/managed-by` as an annotation on Application resources. Upstream Argo CD does not list this as an Application annotation, and Argo CD Operator documentation describes it as a namespace label. Updated the title, description, tags, examples, verification commands, and summary to use "label" instead of "annotation."
- The post claimed the label tells an Argo CD instance to pick up and reconcile Application resources from other namespaces. Argo CD's Applications in any namespace feature is controlled by `application.namespaces` and AppProject `sourceNamespaces`. Updated the explanation to separate Application source namespaces from operator-managed namespace access.
- The namespace examples used `metadata.annotations`. Updated them to `metadata.labels`, matching Argo CD Operator documentation.
- The Application example placed `argocd.argoproj.io/managed-by` directly on an Application resource. Replaced it with a `managedNamespaceMetadata.labels` example using `CreateNamespace=true`, which is the documented way to have Argo CD create or manage labels on a destination namespace.
- The RBAC example used `<project>/*` while claiming to grant access based on the Application namespace. Updated the object pattern to `<project>/<namespace>/*`, matching Argo CD's Applications in any namespace RBAC format.
- The Kubernetes RBAC troubleshooting snippet referenced an incomplete/incorrect ClusterRoleBinding for `argocd-application-controller`. Updated it to show the documented `argocd-server-cluster-apps` ClusterRole and ClusterRoleBinding pattern for API, CLI, and UI access to Applications outside the control plane namespace.
- The troubleshooting and verification text checked annotations and Application metadata for `managed-by`. Updated it to check namespace labels and to troubleshoot `application.namespaces` plus AppProject `sourceNamespaces` for Applications in any namespace.

## Review Notes
The corrected post now mixes two related but distinct topics: Argo CD Operator namespace access via `argocd.argoproj.io/managed-by` labels, and upstream Argo CD Applications in any namespace via `application.namespaces` and `sourceNamespaces`. This is technically valid after the edits, but a future content pass could split them into separate guides for clarity.
