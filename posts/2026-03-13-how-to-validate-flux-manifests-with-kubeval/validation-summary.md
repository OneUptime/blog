# Validation Summary: How to Validate Flux Manifests with kubeval

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- kubeval
- Kubernetes manifests and OpenAPI schemas
- Flux custom resources
- Kustomize
- kubeconform
- GitHub Actions CI
- Bash

## Sources Consulted
- kubeval upstream README: https://github.com/instrumenta/kubeval
- kubeval v0.16.1 CLI help from the official release binary: https://github.com/instrumenta/kubeval/releases/latest
- kubeval release assets API: https://api.github.com/repos/instrumenta/kubeval/releases/latest
- yannh/kubernetes-json-schema README: https://github.com/yannh/kubernetes-json-schema
- kubeconform README and CLI help: https://github.com/yannh/kubeconform
- Datree CRDs-catalog repository and Flux schema paths: https://github.com/datreeio/CRDs-catalog

## Issues Found
- The post did not mention that upstream kubeval is no longer maintained. Added that caveat in the introduction and adjusted the conclusion to describe kubeval as useful mainly for existing workflows.
- Several commands relied on kubeval's default schema location. The default host failed TLS verification during validation, and the upstream project is unmaintained. Updated examples to use the maintained yannh Kubernetes schema repository with `--schema-location`.
- The macOS Homebrew installation example was not aligned with the verified upstream release assets. Replaced it with the official Darwin amd64 binary download.
- The directory validation example used a directory path as a positional argument. Verified that kubeval fails on `kubeval manifests/`; changed examples to use `--directories manifests/`.
- The custom schema example used Datree CRDs-catalog directly with kubeval's `--additional-schema-locations`, but kubeval expects kubeval-style schema paths and cannot use kubeconform's templated CRDs-catalog URL directly. Updated the kubeval example to use a local `file://` schema location laid out for kubeval.
- The Bash file iteration split filenames on whitespace. Replaced it with `find ... -print0`, `sort -z`, and a NUL-delimited read loop.
- The GitHub Actions `xargs` pipeline was made safer by using `-print0`, `xargs -0 -r`, and the explicit schema location.
- The best-practice note about caching schema downloads was inaccurate for kubeval's CLI, which has no cache flag. Replaced it with guidance to set `--schema-location` explicitly in CI.

## Review Notes
kubeconform is the better current choice for new work because it supports templated schema locations and validates Flux CRDs against Datree CRDs-catalog directly. kubeval can still validate standard Kubernetes resources when Flux CRDs are skipped or when CRD schemas are converted into kubeval's expected schema layout.
