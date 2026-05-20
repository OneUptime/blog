# Validation Summary: How to Use ApplicationSets in Any Namespace in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Argo CD AppProject
- Kubernetes RBAC
- Kubernetes ConfigMaps and namespaces
- kubectl
- Argo CD CLI

## Sources Consulted
- Argo CD official documentation: ApplicationSet in any namespace: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Appset-Any-Namespace/
- Argo CD official documentation: Applications in any namespace: https://argo-cd.readthedocs.io/en/latest/operator-manual/app-any-namespace/
- Argo CD official documentation: argocd-cmd-params-cm.yaml example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD official documentation: argocd-applicationset-controller command reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/server-commands/argocd-applicationset-controller/

## Issues Found
- The post enabled only `applicationsetcontroller.namespaces`, but official Argo CD documentation states that ApplicationSets in any namespace require Applications in any namespace to be enabled with the same namespace list. Added `application.namespaces` to the configuration examples and updated the text to describe the prerequisite.
- The restart step only restarted `argocd-applicationset-controller`. Because `application.namespaces` is consumed by `argocd-server` and `argocd-application-controller`, added restarts for those workloads.
- The RBAC explanation did not mention that Argo CD API, CLI, and UI management of Applications outside the control-plane namespace may require additional `argocd-server` Kubernetes RBAC. Added a concise note.
- The security example used the invalid key `applicationsetcontroller.allowed-scm-providers`. Replaced it with the documented `applicationsetcontroller.enable.scm.providers: "false"` setting for disabling SCM provider and pull request generators.

## Review Notes
The guide is technically relevant and salvageable. The examples use valid Kubernetes resource shapes and current Argo CD `ApplicationSet` / `AppProject` APIs. The namespace label `argocd.argoproj.io/applicationset-enabled` is illustrative only; Argo CD's documented enablement is controlled by command parameters and AppProject `sourceNamespaces`, not by that label.
