# Validation Summary: How to configure Kustomize generators for custom resource generation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kustomize
- ConfigMaps
- Secrets
- Kustomize generator plugins
- Bash

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize, https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Kustomize API reference: configMapGenerator, https://github.com/kubernetes-sigs/kustomize/blob/master/site/content/en/docs/Reference/API/Kustomization%20File/configMapGenerator.md
- Kustomize API reference: secretGenerator, https://github.com/kubernetes-sigs/kustomize/blob/master/site/content/en/docs/Reference/API/Kustomization%20File/secretGenerator.md
- Kustomize API reference: generatorOptions, https://github.com/kubernetes-sigs/kustomize/blob/master/site/content/en/docs/Reference/API/Kustomization%20File/generatorOptions.md
- Kustomize API reference: generator args, https://github.com/kubernetes-sigs/kustomize/blob/master/site/content/en/docs/Reference/API/included/generatorargs.md
- Kustomize API reference: Kustomization fields, https://github.com/kubernetes-sigs/kustomize/blob/master/site/content/en/docs/Reference/API/Kustomization%20File/kustomization.md
- Kustomize plugin documentation, https://github.com/kubernetes-sigs/kustomize/blob/master/plugin/README.md
- Kustomize exec plugin implementation, https://github.com/kubernetes-sigs/kustomize/blob/master/api/internal/plugins/execplugin/execplugin.go
- Kustomize generator source validation, https://github.com/kubernetes-sigs/kustomize/blob/master/api/internal/generators/utils.go
- Kustomize bases deprecation note, https://github.com/kubernetes-sigs/kustomize/blob/master/site/content/en/docs/Reference/API/Kustomization%20File/bases.md

## Issues Found
- The post described generatorOptions as a built-in generator. Kustomize documents configMapGenerator and secretGenerator as generators, while generatorOptions modifies generated ConfigMaps and Secrets. Updated the wording accordingly.
- The post implied generator literals can directly reference environment variables and shell command substitutions. Kustomize treats literals as literal key=value strings and does not expand shell expressions there. Replaced the example with an env-file based workflow.
- The custom generator example put inline YAML directly under generators, but Kustomize defines generators as a list of files containing custom generator configs. Changed the example to reference my-generator.yaml and added the separate config file snippet.
- The shell plugin example read generator configuration from stdin. Kustomize exec generator plugins receive their configuration in a temporary file path passed as the first argument; stdin is used for resource input during transforms and is empty for generators. Updated the script to read `cat "$1"`.
- The plugin section omitted the need to enable plugins during build. Added a note using `kustomize build --enable-alpha-plugins`.
- The post stated duplicate keys from multiple generator sources are overridden by later sources. Kustomize returns an error for repeated generated ConfigMap keys. Updated the text to require unique keys.
- The overlay example used the deprecated bases field. Replaced it with resources, which is the documented replacement.
- The directory-loading example claimed directory input but listed individual files. Updated the snippet and explanation to show a directory under files.

## Review Notes
Kustomize `bases` remains supported in the v1beta1 API but is deprecated in favor of `resources`. The custom plugin material is accurate for exec plugins, but users should also be aware that plugin behavior and enablement can vary between standalone `kustomize` and versions embedded in `kubectl`.
