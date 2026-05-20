# Validation Summary: How to Use Git File Generator in ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- ApplicationSet Git file generator
- Go templates and Sprig template functions
- JSON and YAML configuration files
- Kubernetes kubectl commands
- Git and jq validation commands

## Sources Consulted
- Argo CD ApplicationSet Git Generator documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD List Generator documentation for dynamic list handling: https://argo-cd.readthedocs.io/en/release-2.7/operator-manual/applicationset/Generators-List/

## Issues Found
- The introduction said the Git file generator produces one parameter set per element within a file if the file contains a list. Official Argo CD documentation describes the Git file generator as producing parameters from matched JSON/YAML files, while dynamic list expansion from file contents is handled through the List generator with `elementsYaml`. Changed the wording to one parameter set per matched file.
- Two JSON examples included `//` filename comments inside `json` code fences. JSON does not support comments, and the validation script later uses `jq`, which would reject those examples. Removed the comment lines.
- The per-environment file pattern used `environments/*//*.json`, which does not match the shown directory structure cleanly. Changed it to `environments/*/*.json`.
- The Go template example used `{{ default "standard" .tier }}` with `goTemplateOptions: ["missingkey=error"]`. Argo CD documentation notes that unset parameters are errors with this option and recommends functions like `dig` to avoid looking up missing properties directly. Changed the example to `{{ dig "tier" "standard" . }}` and updated the following sentence to mention `dig`.

## Review Notes
The remaining ApplicationSet fields, Git file generator `files.path` and `exclude` usage, nested key access, Go template syntax, and debugging commands are consistent with current Argo CD documentation. The post does not pin an Argo CD version; behavior was checked against current stable/release documentation.
