# Validation Summary: How to Use Informer Cache to Reduce API Server Load

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API watches and resource caching
- Kubernetes client-go informers and shared informer factories
- Kubernetes client-go listers
- Kubernetes client-go workqueues
- Go

## Sources Consulted
- Kubernetes API Concepts: https://kubernetes.io/docs/reference/using-api/api-concepts/
- client-go cache package documentation: https://pkg.go.dev/k8s.io/client-go/tools/cache
- client-go informers package documentation: https://pkg.go.dev/k8s.io/client-go/informers
- client-go core/v1 informer documentation: https://pkg.go.dev/k8s.io/client-go/informers/core/v1
- client-go core/v1 lister documentation: https://pkg.go.dev/k8s.io/client-go/listers/core/v1
- client-go workqueue package documentation: https://pkg.go.dev/k8s.io/client-go/util/workqueue

## Issues Found
- The post described informer resync as periodically re-listing resources to catch missed events. In client-go, resync re-delivers update notifications from the local cache and does not add API server interactions. I corrected the resync explanation, the custom resync section, and the related best-practice wording.
- The delete handler in the basic informer example directly cast deleted objects to `*corev1.Pod`. Delete handlers can receive `cache.DeletedFinalStateUnknown` tombstones, so I updated the example to handle tombstones before logging deleted pods.
- The label-selector example imported unused `metav1` and used an undefined `v1.PodLister` alias. I changed it to import and use `corev1listers.PodLister`.
- The controller example accepted `cache.SharedIndexInformer` but called typed informer methods such as `Lister()`, which do not exist on `cache.SharedIndexInformer`. I updated the example to accept `coreinformers.PodInformer`, use its typed lister, and call `Informer()` where needed.
- The controller example used deprecated untyped workqueue APIs in current client-go documentation. I updated it to use `workqueue.TypedRateLimitingInterface[string]`, `NewTypedRateLimitingQueue`, and `DefaultTypedControllerRateLimiter[string]()`.
- The controller enqueue path used `cache.MetaNamespaceKeyFunc`, which does not handle delete tombstones. I changed it to `cache.DeletionHandlingMetaNamespaceKeyFunc`.
- The performance comparison said 10 list queries per second over 1000 pods equals 10,000 API calls per second. That is 10 API list calls per second, potentially transferring or decoding up to 10,000 pod objects per second. I corrected the arithmetic and softened the over-specific reduction percentage.

## Review Notes
The corrected snippets are accurate for current client-go documentation. Some examples are still illustrative snippets rather than complete standalone programs because surrounding imports and setup are intentionally omitted in later sections.
