# Validation Summary: How to Write Validating Admission Webhooks in Go for Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes admission webhooks
- ValidatingWebhookConfiguration
- Go
- Kubernetes Go client API packages
- Docker
- kubectl

## Sources Consulted
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes Admission Controllers documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Go io/ioutil package documentation: https://go.dev/pkg/io/ioutil/
- Go 1.26 release notes: https://go.dev/doc/go1.26

## Issues Found
- The admission-flow explanation said schema validation happens first and then custom admission webhooks run. Kubernetes admission control has mutating and validating phases, with validating admission webhooks running in the validation phase. I changed the wording to describe the mutating and validating admission phases accurately.
- The project setup commands did not include the `k8s.io/api/apps/v1` and `k8s.io/api/core/v1` packages used by the code. I added both `go get` commands.
- The main Go example imported `io/ioutil`, which has been deprecated since Go 1.16. I replaced it with `io.ReadAll`.
- The main Go example imported `strings` but did not use it, referenced `validateService` without defining it, and did not import or register `appsv1` even though deployment validation uses `appsv1.Deployment`. I removed the undefined service branch and added the missing apps/v1 import and scheme registration.
- The main Go example compared the `Content-Type` header directly to `application/json`, which incorrectly rejects valid media-type forms such as `application/json; charset=utf-8`. I changed it to parse the media type before comparison.
- The webhook validation function assumed `AdmissionReview.Request` was always non-nil. I added a defensive denial response for a nil request.
- The Dockerfile used `golang:1.21`, which is outdated for a 2026-dated tutorial. I updated the builder image to `golang:1.26` and used the canonical uppercase `AS` syntax.

## Review Notes
The deployment and webhook configuration snippets are broadly aligned with the Kubernetes admissionregistration.k8s.io/v1 API. The examples still use placeholder certificate material and image registry names, so readers need to replace those with real values for their clusters.
