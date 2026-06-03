# Validation Summary: How to Implement Efficient Resource Watching with Bookmarks and ResourceVersion

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API watches
- Kubernetes `resourceVersion`
- Kubernetes watch bookmarks
- `client-go`
- Shared informers
- `controller-runtime`
- `kubectl`
- Prometheus Go client metrics

## Sources Consulted
- Kubernetes API concepts: resource versions, watches, bookmarks, streaming lists, and `sendInitialEvents`: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes `metav1.ListOptions` API documentation for `AllowWatchBookmarks`, `ResourceVersion`, `ResourceVersionMatch`, and `TimeoutSeconds`: https://pkg.go.dev/k8s.io/apimachinery/pkg/apis/meta/v1
- Kubernetes `watch` package documentation for watch event types: https://pkg.go.dev/k8s.io/apimachinery/pkg/watch
- Kubernetes `client-go` shared informer API documentation: https://pkg.go.dev/k8s.io/client-go/tools/cache
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `k8s.io/utils/ptr` package documentation: https://pkg.go.dev/k8s.io/utils/ptr

## Issues Found
- Corrected the `resourceVersion` semantics. The post incorrectly stated that `resourceVersion=0` watches from the beginning and that an empty value skips existing resources. Kubernetes documents unset and `0` watch requests as "get state and start" modes that include synthetic `ADDED` events for existing resources, while an exact non-zero resource version watches changes after that version.
- Fixed the basic watch example so it does not cast `ERROR` event objects to `*corev1.Pod`. Watch error events carry error/status objects, not Pod objects.
- Removed unused imports from examples (`tools/cache` in the basic watch example and `labels` in the informer example).
- Updated the resume example to set `AllowWatchBookmarks: true` before handling `BOOKMARK` events.
- Replaced a bookmark-specific `*corev1.Pod` assertion with `metav1.Object` metadata access, which is the correct way to read the bookmark resource version.
- Changed wording that implied bookmarks are periodic. Kubernetes explicitly says bookmark delivery is at the server's discretion and clients should not assume a specific interval.
- Fixed `handleEvent(event.Type, pod)` calls by converting `event.Type` to `string`, matching the helper function signature.
- Updated the informer example for the current `client-go` `AddEventHandler` signature, which returns a registration handle and an error.
- Updated the informer delete handler to account for `cache.DeletedFinalStateUnknown` tombstones.
- Updated the filtered watch example so bookmark events are handled separately instead of being treated as Pod events.
- Fixed the persistent watch example so it handles a closed result channel instead of repeatedly processing the zero-value event.
- Relaxed the best-practice wording from "Always use bookmarks" to "Request bookmarks" and noted that the API server may not send them on a specific interval.

## Review Notes
The examples remain tutorial snippets rather than complete standalone programs; several later snippets rely on imports and helper functions introduced or implied elsewhere in the post. The technical behavior and API usage are now aligned with current Kubernetes documentation.
