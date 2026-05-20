# Validation Summary: How to Use List Generator in ApplicationSets

## Status
validated

## Post Type
Technical guide / Tutorial

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- ApplicationSet List generator
- ApplicationSet Matrix and Cluster generators
- Helm values and parameters
- Kubernetes `kubectl apply` and `kubectl patch`
- Bash and `yq`

## Sources Consulted
- Argo CD ApplicationSet List Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-List/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet Controlling Resource Modification documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Controlling-Resource-Modification/
- Argo CD ApplicationSet Application Pruning & Resource Deletion documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/

## Issues Found
- The description and introduction promised advanced element merging and conditional values, but the post did not cover those patterns. Updated the wording to match the actual content about dynamic list updates and generator integration.
- The multi-cluster List generator example did not mention that destination cluster URLs must already be registered in Argo CD. Added that requirement because the ApplicationSet controller does not create cluster registrations.
- The "Dynamic List Elements from ConfigMaps" heading was inaccurate because the example patches elements from a JSON config file, not a Kubernetes ConfigMap. Renamed the heading to "Dynamic List Elements from Config Files."
- The Matrix generator explanation said the example combines a list of environments with clusters, but the YAML combines a list of applications with clusters. Updated the explanation to match the snippet.
- The deletion section said ApplicationSet sync policy protects against accidental deletions too broadly. Clarified that `preserveResourcesOnDeletion: true` preserves child Kubernetes resources when generated Applications are deleted; it does not keep the generated Application from being removed.

## Review Notes
- The `argoproj.io/v1alpha1` ApplicationSet examples use current documented fields for the List generator, Matrix generator, Cluster generator, Helm parameters, automated sync policy, and `preserveResourcesOnDeletion`.
- The examples use the default ApplicationSet templating style (`{{name}}`), so Go template dot-prefix syntax is not required unless `goTemplate: true` is enabled.
- The `yq` validation command assumes the commonly used Mike Farah `yq` v4 expression syntax.
