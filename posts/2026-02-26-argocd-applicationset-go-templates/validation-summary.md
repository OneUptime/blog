# Validation Summary: How to Use Go Templates in ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSets
- Go text/template
- Sprig template functions
- Kubernetes custom resources
- kubectl

## Sources Consulted
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Cluster Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Go text/template package documentation: https://pkg.go.dev/text/template
- Sprig template function documentation: https://masterminds.github.io/sprig/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The post implied Go templates can generally use loops and complex logic across ApplicationSet templates. Argo CD applies Go templates per field and only to string fields, so I narrowed the wording to logic within individual string fields.
- The `normalize` description omitted the documented 253-character truncation behavior. I updated the explanation to match Argo CD's documented behavior.
- Two examples attempted to template boolean fields (`selfHeal` and `prune`). Argo CD explicitly does not support templating non-string fields, so I changed those examples to keep boolean fields static and demonstrate conditional templating in string-valued `syncOptions` instead.
- One example used Go template control actions to conditionally emit an annotation key. Because Argo CD evaluates each string field independently, this is not a supported pattern. I changed it to template the annotation value instead.
- The nested cluster label example used dot notation for label lookups in places where `index` is the documented migration pattern for map keys. I changed those lookups to `index`.
- The default-value example used `default` with direct missing-key lookups while also setting `missingkey=error`. Argo CD documents that missing keys still error in this mode, so I changed the missing-parameter fallbacks to use `dig`.
- The comparison-operator examples had incomplete `if` templates for AND, OR, and NOT. I added output and closing `end` actions.
- The debugging section referred to the Argo CD CLI but used `kubectl`, and one command comment said it viewed generated Applications while it fetched the ApplicationSet. I corrected the wording.

## Review Notes
- The examples are illustrative and use placeholder repositories and cluster URLs. They are syntactically aligned with the current ApplicationSet API, but they still depend on the referenced repositories, paths, labels, and notification services existing in a real environment.
- Argo CD notes that signature verification is not supported for a templated `project` field when using the Git generator. The post does not discuss signature verification, so no content change was required.
