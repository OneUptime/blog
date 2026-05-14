# Validation Summary: How to Configure Flux CD Source Watcher for Custom Controllers

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Flux CD source-controller
- Flux CD notification-controller
- Kubernetes custom controllers
- controller-runtime
- Kubebuilder
- Go
- Kubernetes RBAC, Deployments, Services, and ServiceMonitor resources

## Sources Consulted
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux GitOps Toolkit Go API documentation: https://fluxcd.io/flux/gitops-toolkit/packages/
- Flux Notification Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification Events documentation: https://fluxcd.io/flux/components/notification/events/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- controller-runtime predicate package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/predicate
- Flux source-controller API Go package documentation: https://pkg.go.dev/github.com/fluxcd/source-controller/api/v1
- Kubebuilder quick start: https://go.kubebuilder.io/quick-start.html

## Issues Found
- The setup commands initialized `go.mod` before `kubebuilder init`, while Kubebuilder's init command creates the Go module when `--repo` is supplied. Updated the command comments to let Kubebuilder initialize the project and module.
- The controller sample used `sourcev1.Artifact`, but Flux source-controller v1 returns `*meta.Artifact` from `GitRepository.GetArtifact()`. Updated the sample to import `github.com/fluxcd/pkg/apis/meta` and accept `*meta.Artifact`.
- The artifact download function claimed to extract the tarball but only wrote `artifact.tar.gz` to disk. Added gzip/tar extraction with path traversal protection so `processArtifact` receives extracted contents.
- The artifact download function could panic when `HttpClient` was nil and could leak the temp directory on download failures. Added a fallback to `http.DefaultClient` and cleanup on error paths.
- The event predicate claimed to reconcile when artifact revisions changed, but `GenerationChangedPredicate` ignores status-only updates where Flux writes `.status.artifact`. Replaced it with an update predicate that compares old and new artifact revisions.
- The post did not mention registering Flux API types with the controller manager scheme. Added the required `sourcev1.AddToScheme(scheme)` reminder.
- The validator example could panic on malformed container entries and only checked for a `resources` block despite reporting missing resource limits. Updated it to type-check container entries and check `resources.limits`.
- The notification examples used `notification.toolkit.fluxcd.io/v1` for Alert and Provider, but those resources are `v1beta3`; `v1` is for Receiver. Updated both API versions.
- The notification section described `eventMetadata` as a filter. Updated the comment to describe it as metadata added to forwarded events.
- The notification section implied an Alert alone sends custom controller notifications. Clarified that notification-controller forwards Flux events emitted by the watcher, such as events sent with `fluxcd/pkg/runtime/events`.

## Review Notes
Go was not installed in the local environment, so I could not compile the snippets locally. The changes were verified against official Flux and controller-runtime documentation instead.
