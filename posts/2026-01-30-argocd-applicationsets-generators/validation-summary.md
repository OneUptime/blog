# Validation Summary: How to Build ArgoCD Application Sets Generators

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- ApplicationSet List, Git, Cluster, Matrix, and Merge generators
- ApplicationSet Progressive Syncs / RollingSync
- Go templating in ApplicationSets
- Argo CD CLI cluster registration
- Kubernetes YAML manifests
- Helm parameter values in Argo CD Applications

## Sources Consulted
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/applicationset-specification/
- Argo CD ApplicationSet generators overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/
- Argo CD List generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-List/
- Argo CD Git generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Git/
- Argo CD Cluster generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD Matrix generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD Merge generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Merge/
- Argo CD Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD Progressive Syncs documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Argo CD ApplicationSet deletion / preserveResourcesOnDeletion documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_add/

## Issues Found
- The Progressive Sync section showed `RollingSync` without mentioning that progressive syncs must first be enabled on the ApplicationSet controller. Added a short note before the manifest because the official docs say progressive syncs must be explicitly enabled.
- The Progressive Sync manifest included `syncPolicy.automated`, but the official RollingSync behavior forces generated Applications to have autosync disabled. Removed the automated sync policy from that example so it matches RollingSync behavior.
- The Go template tip used template control statements as standalone YAML fields under `annotations`. ApplicationSet Go templates are applied per string field and do not support control keywords across fields. Replaced it with a valid per-field conditional annotation value.

## Review Notes
- The post uses the default ApplicationSet fasttemplate-style syntax (`{{env}}`, `{{path.basename}}`) for most examples. This is still documented, but Argo CD recommends Go Template for newer manifests and notes that fasttemplate is expected to be deprecated in favor of Go Template.
- The examples use placeholder repositories, projects, clusters, namespaces, and Helm values. These are structurally valid examples, but they depend on matching repositories, Argo CD Projects, cluster registrations, and chart values existing in a real environment.
