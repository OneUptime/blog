# Validation Summary: Schema Validation for Helm Charts with values.schema.json

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm charts
- Kubernetes
- JSON Schema draft-07
- values.schema.json
- ajv-cli
- yq
- VS Code YAML extension / yaml-language-server
- GitHub Actions
- pre-commit
- helm-values-schema-json plugin

## Sources Consulted
- Helm chart documentation: https://helm.sh/docs/topics/charts/
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- ajv-cli README: https://github.com/ajv-validator/ajv-cli
- Ajv JSON Schema documentation: https://ajv.js.org/guide/schema-language.html
- JSON Schema draft-07 documentation: https://json-schema.org/draft-07/json-schema-release-notes
- JSON Schema 2019-09 release notes: https://json-schema.org/draft/2019-09/release-notes
- YAML Language Support by Red Hat documentation: https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml
- yaml-language-server README: https://github.com/redhat-developer/yaml-language-server
- helm-values-schema-json plugin README: https://github.com/losisin/helm-values-schema-json
- Kubernetes resource Quantity documentation: https://kubernetes.io/docs/reference/kubernetes-api/definitions/quantity-resource/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found
- The post used `$defs` while declaring JSON Schema draft-07. Draft-07 uses `definitions`; `$defs` is the newer keyword introduced with draft 2019-09. Updated the reusable schema examples, `$ref` paths, best-practice table, and wrap-up text to use `definitions`.
- The `ajv` pipeline converted YAML to JSON but did not pass the converted data to `ajv` with `-d`. Changed it to write `values.json` and validate that file with `ajv validate -s values.schema.json -d values.json`.
- The helm-values-schema-json generation command used outdated/non-documented `-input` and `-output` flags. Updated it to the documented `helm schema --values values.yaml --output values.schema.json`.
- The Kubernetes resource quantity pattern was too narrow for the documented Quantity format. Updated it to cover signed numbers, decimals, exponent notation, DecimalSI suffixes, and BinarySI suffixes.
- The dry-run comment said it "forces" validation even though Helm validates values automatically when schema validation is enabled. Reworded it to say it validates the install path with dry-run.

## Review Notes
Helm was not installed in the local environment, so Helm command behavior was verified against official Helm documentation rather than local `helm --help` output. JSON code blocks were parsed locally after edits.
