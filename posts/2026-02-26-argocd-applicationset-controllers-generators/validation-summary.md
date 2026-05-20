# Validation Summary: How to Understand ApplicationSet Controllers and Generators in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- ApplicationSet controller
- ApplicationSet generators
- Kubernetes custom resources
- GitOps workflows

## Sources Consulted
- Argo CD ApplicationSet introduction: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/
- Argo CD ApplicationSet generator overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD controlling resource modification documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Controlling-Resource-Modification/
- Argo CD ApplicationSet deletion documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Application-Deletion/
- Argo CD ApplicationSet and Argo CD integration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Argo-CD-Integration/

## Issues Found
- The controller reconciliation example claimed to configure the reconciliation interval but patched the controller with `--policy=sync`, which controls modification policy rather than polling interval. Replaced it with a `requeueAfterSeconds` Git generator example.
- The post described generators as plugins. Changed this to generator implementations, since only the Plugin generator is a plugin-style external generator.
- The `preserveResourcesOnDeletion: true` explanation incorrectly said generated Application objects are left intact when deleting the ApplicationSet. Corrected it to state that deployed resources are preserved, while generated Application objects are still deleted unless a non-cascading delete is used.
- The reconciliation failure discussion overstated safety behavior during generator failures. Replaced it with the documented default behavior: Applications no longer generated can be deleted under the default `sync` policy, and `create-update` can prevent Application deletion when generator output changes.
- The command for listing generated Applications used a non-standard label selector. Updated it to use `argocd.argoproj.io/application-set-name=my-appset`.
- The best-practice note described the ApplicationSet controller as a single point of failure for all generated Applications. Clarified that it is responsible for generation and updates, while existing Applications are still Argo CD Application resources.

## Review Notes
The examples are mostly illustrative partial manifests, so they are not intended to be applied as standalone YAML unless completed with the omitted Application fields. Current Argo CD documentation also recommends Go templates with `goTemplateOptions: ["missingkey=error"]` for many examples, but the existing non-Go template syntax remains supported.
