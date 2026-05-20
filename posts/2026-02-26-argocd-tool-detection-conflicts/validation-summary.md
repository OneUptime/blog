# Validation Summary: How to Handle Tool Detection Conflicts in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- Helm
- Kustomize
- Jsonnet
- Argo CD Config Management Plugins
- argocd CLI
- kubectl
- Bash

## Sources Consulted
- Argo CD Tool Detection documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/tool_detection/
- Argo CD Directory source documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD command parameters documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD source type definitions: https://github.com/argoproj/argo-cd/blob/stable/pkg/apis/application/v1alpha1/types.go
- Argo CD discovery implementation: https://github.com/argoproj/argo-cd/blob/stable/util/app/discovery/discovery.go
- Argo CD repository source type implementation: https://github.com/argoproj/argo-cd/blob/stable/reposerver/repository/repository.go

## Issues Found
- The post described a fixed priority order of `Helm > Kustomize > Jsonnet > CMP > Directory`. Current Argo CD documentation only documents implicit detection for Helm and Kustomize, with Directory as the fallback, and the current source type enum does not include a separate Jsonnet source type. Updated the explanation and summary to avoid the incorrect priority order.
- The Helm and Kustomize conflict example claimed Argo CD picks Helm because Helm has higher priority. Current discovery implementation does not support that blanket claim. Updated the example to describe both files as conflicting markers without asserting Helm wins.
- The Kustomize and Jsonnet section treated Jsonnet as a separately detected source type and suggested `directory.exclude` while using Kustomize. Argo CD handles Jsonnet through Directory sources, and Directory options do not control Kustomize rendering. Updated the section to describe Jsonnet as Directory handling and removed the `directory.exclude` recommendation.
- The built-in tool and CMP plugin section claimed CMP plugins are always checked after built-in tools. Current discovery checks matching CMP sidecars before falling back to built-in marker discovery. Updated the section to say CMP discovery can match directories that also have built-in markers and to recommend explicit source configuration.

## Review Notes
The CLI and Kubernetes commands use valid flags and fields. The repo-server log-level key `reposerver.log.level` is documented in `argocd-cmd-params-cm`; debug logs may still vary by Argo CD version and installation method.
