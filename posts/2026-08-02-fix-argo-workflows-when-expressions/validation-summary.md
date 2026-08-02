# Validation Summary: Fixing Argo Workflow `when` Expressions, Quoting Errors, and Unresolved Variables

## Status
validated

## Post Type
Technical debugging guide and tutorial

## Technologies Covered
- Argo Workflows
- Kubernetes Workflow custom resources
- Argo `when` conditionals and `govaluate`
- Argo expression tags and the Expr language
- Argo Workflow variables, input parameters, and output parameters
- Steps templates and DAG templates
- Enhanced `depends` logic
- Sprig template functions
- YAML
- Argo CLI
- `kubectl`, `jq`, and shell commands

## Sources Consulted
- Argo Workflows: Conditionals — https://argo-workflows.readthedocs.io/en/latest/walk-through/conditionals/
- Argo Workflows: Workflow Variables and Expression Tags — https://argo-workflows.readthedocs.io/en/latest/variables/
- Argo Workflows: Enhanced Depends Logic — https://argo-workflows.readthedocs.io/en/latest/enhanced-depends-logic/
- Argo Workflows: Output Parameters — https://argo-workflows.readthedocs.io/en/latest/walk-through/output-parameters/
- Argo Workflows: Lifecycle Hooks — https://argo-workflows.readthedocs.io/en/latest/lifecyclehook/
- Argo Workflows: Field Reference — https://argo-workflows.readthedocs.io/en/latest/fields/
- Argo Workflows: Upgrading Guide, including the v3.7.16/v4.0.7 skipped-output changes — https://argo-workflows.readthedocs.io/en/latest/upgrading/
- Argo Workflows official skipped-output default examples — https://github.com/argoproj/argo-workflows/tree/main/examples/skipped-output-defaults
- Argo Workflows CLI: `argo lint` — https://argo-workflows.readthedocs.io/en/latest/cli/argo_lint/
- Argo Workflows CLI: `argo submit` — https://argo-workflows.readthedocs.io/en/latest/cli/argo_submit/
- Argo Workflows CLI: `argo get` — https://argo-workflows.readthedocs.io/en/latest/cli/argo_get/
- Argo Workflows releases — https://github.com/argoproj/argo-workflows/releases
- Expr language definition — https://expr-lang.org/docs/language-definition
- Sprig string functions — https://masterminds.github.io/sprig/strings.html
- Sprig type-conversion functions — https://masterminds.github.io/sprig/conversion.html
- Kubernetes `kubectl get` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl logs` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- jq manual — https://jqlang.org/manual/

## Issues Found
No technical issues found.

## Review Notes
- Reviewed against the current stable Argo Workflows v4.0.8 CLI. The complete minimal workflow and a composite workflow covering expression tags, bracket notation, `jsonpath`, enhanced `depends`, producer and consumer defaults, and `??` fallback passed `argo lint --offline` with no errors.
- Every YAML code block parses as intended. The only YAML parser failure is the deliberately invalid `when: {{inputs.parameters.message}} == status: ready` example, which correctly demonstrates the need to quote or block the entire scalar.
- The absent-output behavior described in the post requires Argo Workflows v3.7.16, v4.0.7, or later. The post correctly warns readers with older releases to consult versioned documentation and test their release's behavior.
- The Enhanced Depends documentation still contains an older empty-string description for skipped outputs, while the current Workflow Variables page and Upgrading Guide document the v3.7.16/v4.0.7-and-later `nil`/terminal-error semantics used by the post.
- All referenced documentation and author links resolve successfully. No changes to the post were necessary.
