# Validation Summary: How to Handle Cluster-Specific Overrides with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- Kubernetes Ingress
- Kustomize
- Helm
- GitHub Actions
- kubectl

## Sources Consulted
- Argo CD ApplicationSet Cluster Generator documentation: https://argo-cd.readthedocs.io/en/release-2.5/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Git Generator documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Git/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes strategic merge patch documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kustomize API types reference: https://pkg.go.dev/sigs.k8s.io/kustomize/api/types

## Issues Found
- The Kustomize Ingress patch used the deprecated `kubernetes.io/ingress.class` annotation. Kubernetes documentation states that `spec.ingressClassName` replaced this annotation starting with Kubernetes 1.18. Updated the example to use `spec.ingressClassName: alb` while keeping the AWS ALB-specific annotations.

## Review Notes
- The ApplicationSet Cluster generator examples correctly use cluster secret labels and generator `values` with the `values.` template prefix.
- The ApplicationSet Git file generator example correctly uses JSON file content as flattened template parameters such as `cluster.name`, `cluster.server`, and `cluster.namespace`.
- The Helm `valueFiles` example is valid for values files in the same repository, using a path relative to the chart root.
- The Kustomize `patches` examples are valid for Kubernetes built-in resources, where strategic merge behavior is available for fields such as containers and environment variables.
- The `kubectl apply --dry-run=client -f -` validation command uses a current kubectl dry-run value.
