# Validation Summary: How to Create ArgoCD List Generator

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD ApplicationSet
- ApplicationSet List generator
- ApplicationSet Matrix generator
- ApplicationSet Merge generator
- Kubernetes manifests
- Helm parameters and value files in Argo CD Applications
- Argo CD CLI and kubectl debugging commands

## Sources Consulted
- Argo CD ApplicationSet List generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-List/
- Argo CD ApplicationSet template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD ApplicationSet Matrix generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Matrix/
- Argo CD ApplicationSet Merge generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Merge/
- Argo CD ApplicationSet resource deletion documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Argo CD controlling resource modification documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Controlling-Resource-Modification/
- Argo CD CLI command reference for `argocd appset create`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_appset_create/
- Argo CD v2.2 to v2.3 upgrade notes for bundled ApplicationSet controller: https://argo-cd.readthedocs.io/en/latest/operator-manual/upgrading/2.2-2.3/

## Issues Found
- The post described default `{{env}}` style ApplicationSet placeholders as Go templating syntax. Argo CD supports Go templates only when `goTemplate: true` is enabled, and Go-template parameters use forms such as `{{.env}}`. I changed the wording to "ApplicationSet template placeholders" so it matches the examples.
- The sync policy example included an `auto_sync` value for each list element, including `auto_sync: "false"` for production, but the template never used that parameter. Because the hard-coded `syncPolicy.automated` would apply to every generated Application, I removed the unused values.
- The debugging command for viewing generated Applications filtered on `app.kubernetes.io/instance=myapp-environments`, but the examples do not add that label to generated Applications and ApplicationSet does not rely on that label for ownership. I changed the command to list Applications and filter by the generated name prefix.

## Review Notes
- The ApplicationSet API version, List generator `elements` shape, Matrix generator Cartesian-product behavior, Merge generator `mergeKeys` behavior, Helm source fields, sync options, retry fields, and `preserveResourcesOnDeletion` placement are consistent with the Argo CD documentation consulted.
- The examples use default ApplicationSet templating syntax. Argo CD also supports `goTemplate: true`; future updates could migrate the examples to Go templates with dotted parameter references and `goTemplateOptions`.
