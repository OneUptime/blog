# Validation Summary: How to Use the Kubernetes Watch API with HTTP Streaming

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Watch API
- Kubernetes API resourceVersion semantics
- kubectl
- Go
- client-go
- Kubernetes informers

## Sources Consulted
- Kubernetes API Concepts: https://kubernetes.io/docs/reference/using-api/api-concepts/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- client-go informers package documentation: https://pkg.go.dev/k8s.io/client-go/informers
- client-go cache package documentation: https://pkg.go.dev/k8s.io/client-go/tools/cache
- apimachinery watch package documentation: https://pkg.go.dev/k8s.io/apimachinery/pkg/watch

## Issues Found
- The watch event stream example was marked as `json` while using multiple documents and ellipses, which is not valid JSON. Changed the fence to `text` and described it as a stream of JSON documents, matching the Kubernetes API documentation.
- The post described every watch event object as a full resource object. Updated this to note that BOOKMARK events contain a metadata-only object and ERROR events use a status object.
- Several client-go examples asserted every watch event object was a Pod before checking the event type. Updated the examples to handle `watch.Error` before Pod assertions, preventing incorrect handling or panics.
- The resourceVersion resume example implied simple retrying always avoids missed events. Updated the text and code to handle the documented `410 Gone` case, where clients must relist and restart from a fresh resourceVersion.
- The bookmark section said bookmarks are sent periodically. Updated it to say clients can request bookmarks but must not assume any specific interval or that bookmarks will be returned.
- The multiple-resource watch example ignored watcher creation errors. Updated it to log and return when watcher creation fails.
- The raw controller loop could spin immediately when a watch closed without returning an error. Added a retry delay on normal watch closure.
- The informer example used the current `AddEventHandler` API without checking its returned error and assumed delete events always contain a Pod. Updated it to check the registration error and handle `cache.DeletedFinalStateUnknown` tombstones.

## Review Notes
The post remains a raw-watch tutorial, but production controllers should continue to prefer informers or controller-runtime because they implement list-watch recovery and cache management more completely than hand-written watch loops.
