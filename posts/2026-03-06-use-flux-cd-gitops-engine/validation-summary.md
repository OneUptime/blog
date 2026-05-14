# Validation Summary: How to Use Flux CD with GitOps Engine

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD source-controller and kustomize-controller APIs
- Flux notification-controller Receiver API
- Flux GitOps Toolkit Go packages
- Kubernetes CustomResourceDefinition API
- Kubernetes controller-runtime
- Go
- kubectl and Flux CLI

## Sources Consulted
- Flux GitOps Toolkit Go packages documentation: https://fluxcd.io/flux/gitops-toolkit/packages/
- Flux source watcher guide: https://fluxcd.io/flux/gitops-toolkit/source-watcher/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Receiver documentation: https://v2-6.docs.fluxcd.io/flux/components/notification/receivers/
- Flux Notification Controller documentation: https://fluxcd.io/flux/components/notification/
- Flux source-controller Go API documentation: https://pkg.go.dev/github.com/fluxcd/source-controller/api/v1
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Argo Project GitOps Engine repository: https://github.com/argoproj/gitops-engine

## Issues Found
- The post described GitOps Engine as a library used with Flux CD. Updated the wording to clarify that Flux does not use the Argo Project GitOps Engine library, and that the post is about GitOps engine reconciliation patterns alongside Flux.
- The dependency list omitted the Flux source-controller API module required by the Go import. Added `go get github.com/fluxcd/source-controller/api@latest`.
- The custom resource allowed `OCIRepository` and `Bucket` source kinds, but the controller example only handled `GitRepository`. Restricted the example CRD to `GitRepository` and clarified that other source kinds would require extending the controller.
- The controller status helper always wrote `Ready=True`, including validation and apply failures. Updated the helper to accept a condition status and set failures to `Ready=False`.
- The controller ignored invalid reconciliation intervals and could requeue with a zero duration. Added a default `10m` requeue interval when parsing fails.
- The GitRepository example used `.spec.include` as a local path filter, but Flux `include` maps artifacts from other GitRepository objects. Replaced it with documented `sparseCheckout` path filtering.
- The Kustomization pipeline used `dependsOn` to depend on a custom resource. Flux `dependsOn` only references other Flux `Kustomization` resources, so the example was changed to report the validation custom resource through `healthChecks` instead.
- The notification section described a Receiver as watching Flux reconciliation events. Updated it to describe the documented Receiver behavior: inbound webhooks trigger reconciliation of listed Flux resources.
- The Receiver example used `name: "*"` without `matchLabels`. Added a label selector, as wildcard names are documented for label matching.
- The webhook handler used an invalid notification-controller service URL. Changed it to a Receiver webhook URL placeholder under `/hook/<receiver-path>`.
- The health check section implied custom Flux health logic could be added directly. Updated the wording to say custom resources can be referenced when they expose Kubernetes-style status conditions.

## Review Notes
The local environment does not have the Go toolchain installed, so the illustrative controller snippet could not be compiled locally. The Flux and Kubernetes API usage was reviewed against current official documentation.
