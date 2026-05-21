# Validation Summary: How to Set Up Istio on Red Hat OpenShift Service Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat OpenShift Service Mesh
- Istio / Maistra APIs
- OpenShift Container Platform
- OpenShift Operators and OLM Subscriptions
- Kiali
- Red Hat OpenShift distributed tracing platform (Jaeger)
- OpenShift Elasticsearch Operator
- OpenShift Routes
- Security Context Constraints
- Istio mTLS and authorization policies

## Sources Consulted
- Red Hat OpenShift Container Platform 4.15 Service Mesh documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.15/html-single/service_mesh/service_mesh
- Red Hat OpenShift Container Platform 4.13 Service Mesh documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.13/html-single/service_mesh/index
- Red Hat OpenShift Container Platform 4.16 Service Mesh documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.16/observability/service_mesh/index
- Red Hat OpenShift Container Platform 4.15 Distributed Tracing documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.15/html-single/distributed_tracing/distributed_tracing
- Maistra custom resources reference: https://maistra.io/docs/ossm-custom-resources.html

## Issues Found
- The prerequisites listed OpenShift 4.12 or newer while the post uses OpenShift Service Mesh 2.6. Updated the prerequisite to OpenShift 4.14 or newer, matching the supported OpenShift baseline documented for current OSSM 2.6 releases.
- The operators section described Jaeger and Elasticsearch as generally required. Updated the wording to clarify that the example uses Kiali and Jaeger, and that Jaeger and Elasticsearch are deprecated starting with OSSM 2.5. Also clarified that Elasticsearch is only needed for Elasticsearch-backed Jaeger storage.
- The CSV verification command checked only `openshift-operators`, but the Jaeger and Elasticsearch operators install into different namespaces in Red Hat's documented default layout. Split the check across `openshift-operators`, `openshift-distributed-tracing`, and `openshift-operators-redhat`.
- The main ServiceMeshControlPlane and multi-tenant examples used `v2.5`, which is outdated for a current OSSM 2.x example. Updated them to `v2.6`.
- The Jaeger add-on example omitted the `name` field used in Red Hat's ServiceMeshControlPlane examples. Added `name: jaeger`.
- The deployment comment implied namespace membership alone caused injection. Updated it to clarify that the workload also opts in with the `sidecar.istio.io/inject: "true"` annotation.
- The Gateway and VirtualService examples used `networking.istio.io/v1`, while Red Hat OSSM 2.x documentation uses `networking.istio.io/v1alpha3` for those APIs. Updated both examples.
- The PeerAuthentication and AuthorizationPolicy examples used `security.istio.io/v1`, while Red Hat OSSM 2.x documentation uses `security.istio.io/v1beta1`. Updated both examples.
- The Routes section described Istio OpenShift Routing without its current caveat. Added that the feature is deprecated and disabled by default for new ServiceMeshControlPlane resources starting with OSSM 2.5.
- The upgrade section was worded as a general upgrade from the same version used in the updated setup. Reworded it to describe upgrading an older OSSM 2.x control plane to `v2.6`.

## Review Notes
The post remains technically relevant as an OSSM 2.x tutorial, but Red Hat OpenShift Service Mesh 3.x is now generally available and uses a different installation model based on the newer Service Mesh 3 Operator and Istio resources rather than the OSSM 2.x ServiceMeshControlPlane flow. A future rewrite could cover OSSM 3.x separately.
