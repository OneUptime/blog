# Validation Summary: How to Implement CRD Conversion Webhooks for Multi-Version Support

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes CustomResourceDefinitions
- Kubernetes CRD conversion webhooks
- Kubernetes ConversionReview API
- kubectl
- Go
- OpenSSL TLS certificates

## Sources Consulted
- Kubernetes documentation: Versions in CustomResourceDefinitions - https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Kubernetes API reference: CustomResourceDefinition v1 - https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes kubectl get reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: Manage TLS Certificates in a Cluster - https://kubernetes.io/docs/tasks/tls/managing-tls-in-a-cluster/
- Go package documentation: io/ioutil deprecation - https://pkg.go.dev/io/ioutil
- OpenSSL req manual - https://docs.openssl.org/3.4/man1/openssl-req/

## Issues Found
- The introduction overstated that conversion webhooks are the only alternative to a single API version. Updated the wording to clarify that schema-changing API evolution is the case that needs webhook conversion.
- The Go webhook used the deprecated `io/ioutil` package. Replaced it with `io.ReadAll`.
- The Go webhook did not check for a missing `ConversionReview.request`, ignored JSON errors, and ignored marshal errors. Added request validation and failure responses for conversion and encoding errors.
- The no-conversion path attempted to return `obj.Object`, which is typically nil after JSON unmarshalling a `runtime.RawExtension`. Changed it to return the original raw object bytes.
- The webhook response reused the request object. Changed it to return a response-focused `ConversionReview` with the original `TypeMeta` and a populated `response`.
- The TLS certificate commands generated a certificate with only a Common Name. Added subject alternative names for the webhook Service DNS names, which are required for modern TLS verification.
- The testing examples used `kubectl get --output-version`, which is not in the current `kubectl get` reference. Replaced those examples with the documented `TYPE.VERSION.GROUP` resource form.
- The logging snippet read `Object.GetObjectKind()` from a raw extension object that can be nil. Updated it to parse `apiVersion` from the raw object before logging.

## Review Notes
The Go snippet was reviewed statically because Go is not installed in this local environment. The current `kubectl` help available locally was checked and matched the official reference for the removed `--output-version` usage.
