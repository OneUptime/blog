# Validation Summary: How to Use client-go Informers to Watch Kubernetes Resource Changes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- client-go
- Shared informers
- Go modules
- Go

## Sources Consulted
- Kubernetes client-go package documentation: https://pkg.go.dev/k8s.io/client-go
- Kubernetes client-go informers documentation: https://pkg.go.dev/k8s.io/client-go/informers
- Kubernetes client-go cache documentation: https://pkg.go.dev/k8s.io/client-go/tools/cache
- Kubernetes API package documentation: https://pkg.go.dev/k8s.io/api
- Kubernetes apimachinery package documentation: https://pkg.go.dev/k8s.io/apimachinery
- Go module dependency documentation: https://go.dev/doc/modules/managing-dependencies
- Kubernetes client libraries reference: https://kubernetes.io/docs/reference/using-api/client-libraries/

## Issues Found
- The dependency command installed `k8s.io/apimachinery/pkg/apis/meta/v1@latest` as if it were the library dependency and did not explicitly include `k8s.io/api`, even though the examples import Kubernetes API types. Changed the command to add the relevant modules: `k8s.io/client-go`, `k8s.io/api`, and `k8s.io/apimachinery`.
- The basic informer example imported packages that were unused in that snippet, which would cause a Go compile error if copied as shown. Removed the unused imports from that block.
- The delete handler directly asserted `obj.(*corev1.Pod)`. client-go delete handlers can receive `cache.DeletedFinalStateUnknown` when a delete event was missed and discovered during a later relist. Updated the handler to decode tombstones safely.
- The cache-query helper used `informers.PodInformer`, which is not a type in the top-level `k8s.io/client-go/informers` package. Changed it to the generated pod informer type from `k8s.io/client-go/informers/core/v1` and added the needed imports to the snippet.
- The custom indexer example ignored the `AddIndexers` error return. Updated the sample to check the error before starting the informer.
- The resync section incorrectly said resync catches missed events and used `oldObj == newObj` as the resync detector. client-go documents resync as delivering update notifications for objects in the local cache without extra authoritative storage interaction. Updated the explanation and code to treat unchanged `ResourceVersion` as an unchanged resync/relist notification.
- The robust event processing functions used direct type assertions before validation. Updated them to check type assertion success and nil values before processing.
- The conclusion repeated the incorrect "resync catches missed events" guidance. Updated it to describe resync as periodic re-evaluation of cached objects.

## Review Notes
- The later code snippets remain tutorial fragments and assume the surrounding imports from the full example context. In a future pass, the article could provide one complete `main.go` to make copy/paste testing easier.
