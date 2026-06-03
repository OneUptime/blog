# Validation Summary: How to Build Tekton Pipelines with Custom Task Results and When Expressions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tekton Pipelines
- Tekton Tasks and Task results
- Tekton when expressions
- Tekton matrix fanout
- Kubernetes custom resources
- kubectl
- Tekton CLI (`tkn`)
- YAML

## Sources Consulted
- Tekton Tasks documentation: https://tekton.dev/docs/pipelines/tasks/
- Tekton Pipelines documentation: https://tekton.dev/docs/pipelines/pipelines/
- Tekton Pipeline API reference: https://tekton.dev/docs/pipelines/pipeline-api/
- Tekton Matrix documentation: https://tekton.dev/vault/Pipelines-main/matrix/
- Tekton Variables documentation: https://tekton.dev/docs/pipelines/variables/
- Tekton Getting Started with Pipelines documentation: https://tekton.dev/docs/getting-started/pipelines/

## Issues Found
- The examples used `apiVersion: tekton.dev/v1beta1`. Updated them to `apiVersion: tekton.dev/v1` to use the current stable Tekton API in new examples.
- The "When Expression Operators" section listed `exists` and `notexists` as standard Tekton `when` operators. Tekton documents the standard `when` operators as `in` and `notin`, with CEL available separately, so the invalid examples were replaced with an empty-value check using `notin`.
- Two PipelineTask examples combined `taskRef` and `taskSpec`. Tekton permits no more than one of `taskRef` and `taskSpec`, so the inline `taskSpec` result declarations were removed and comments were added to clarify that the referenced Tasks must declare the consumed results.
- The dynamic task example wrote a JSON array but did not declare the result as `type: array`, and the follow-up example passed the array result as a regular param rather than using Tekton fanout. The result was changed to `type: array`, the script now installs the required `git` and `jq` tools in the Alpine image, and the consumer example was changed to use `matrix` with beta API fields enabled.

## Review Notes
- The examples assume referenced catalog or local Tasks such as `go-test`, `trivy-scan`, `kaniko-build`, and `deploy` exist and declare the params, workspaces, and results shown.
- The `git diff HEAD~1` examples require the cloned repository to have enough history for `HEAD~1`; shallow clones may need an adjusted clone depth.
