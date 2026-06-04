# Validation Summary: How to Validate Kubernetes Manifests Against Schemas Using Kubeconform in CI/CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes manifests and CustomResourceDefinitions
- Kubeconform
- JSON Schema and Kubernetes OpenAPI-derived schemas
- GitHub Actions
- GitLab CI/CD
- Helm
- Git pre-commit hooks
- jq

## Sources Consulted
- Kubeconform official README: https://github.com/yannh/kubeconform
- Kubeconform releases: https://github.com/yannh/kubeconform/releases
- Kubeconform openapi2jsonschema.py converter: https://raw.githubusercontent.com/yannh/kubeconform/master/scripts/openapi2jsonschema.py
- Kubernetes CustomResourceDefinition API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes CustomResourceDefinition guide: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Helm template command reference: https://helm.sh/docs/helm/helm_template/
- GitHub actions/checkout README: https://github.com/actions/checkout
- GitHub actions/upload-artifact README: https://github.com/actions/upload-artifact
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/

## Issues Found
- Corrected the description of Kubeconform schema sources. Kubeconform validates against JSON schemas generated from Kubernetes OpenAPI schemas and uses the default remote Kubernetes schema registry unless schemas are provided locally or cached; it does not use bundled schemas by default.
- Updated Kubeconform installation examples from v0.6.3 to v0.7.0, the latest release checked during review.
- Fixed the basic validation example to use `-verbose`, because valid resources are not printed in default text output.
- Fixed the invalid-field example to use `-strict`, because unknown additional properties are rejected by strict schemas.
- Replaced the CRD "generate schema" command. The original command validated a CRD manifest and did not generate a JSON schema. The corrected command uses Kubeconform's `openapi2jsonschema.py` converter and a schema location that matches the generated `application_v1.json` filename.
- Updated GitHub Actions examples to use current action versions (`actions/checkout@v5` and `actions/upload-artifact@v4`) and adjusted the validation step so JSON results are still checked after Kubeconform returns a non-zero exit code.
- Updated the GitLab CI example from `only: changes` to `rules: changes`, which is the current recommended syntax.
- Corrected JSON parsing examples to use Kubeconform's actual JSON fields: `.summary`, `.status`, `.msg`, and `.validationErrors`.
- Removed an inaccurate Secret-skipping comment. Kubeconform schema validation does not validate Secret data as base64.
- Changed "minimum Kubernetes version" wording to "another exact Kubernetes version" because `-kubernetes-version` validates against the specified version, not a minimum range.

## Review Notes
Kubeconform validates schema-level correctness, but Kubernetes admission, controller, and server-side validation can still reject manifests for constraints not represented in the OpenAPI-derived schemas. The post now preserves that practical CI/CD workflow while making the examples match current Kubeconform behavior.
