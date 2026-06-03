# Validation Summary: How to Test Kubernetes Admission Webhooks Locally Before Deploying to Clusters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes admission webhooks
- ValidatingWebhookConfiguration
- AdmissionReview API
- kind
- kubectl
- Go HTTP servers
- Docker
- TLS certificates for Kubernetes webhooks

## Sources Consulted
- Kubernetes Dynamic Admission Control: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kind Quick Start and image loading documentation: https://kind.sigs.k8s.io/docs/user/quick-start/
- Go io/ioutil package documentation: https://pkg.go.dev/io/ioutil

## Issues Found
- The Go webhook sample referenced `corev1.Pod` without importing `k8s.io/api/core/v1`, so the example would not compile. Added the missing import.
- The Go webhook sample used the deprecated `io/ioutil` package. Replaced `ioutil.ReadAll` with `io.ReadAll`, matching current Go guidance.
- The Go test sample imported `net/http` without using it, causing a compile error. Removed the unused import.
- The AdmissionReview response left the request populated. Updated the sample to return only the response stanza after copying the request UID, matching Kubernetes webhook response examples.
- The JSON fixture included a JavaScript-style comment inside a `json` code block, making it invalid JSON. Removed the comment.
- The post mentioned `webhook-tester` in the description but did not use or explain it. Reworded the description to match the actual examples.
- The kind binary install command used an outdated `v0.20.0` URL. Updated it to the current stable kind release shown in the official quick start.
- The Deployment used `localhost/admission-webhook:latest`, while the Docker build and `kind load` commands used `admission-webhook:latest`. Updated all related snippets to use the same `admission-webhook:local` tag.
- The webhook server expected local certificate paths, but the Kubernetes Deployment mounted certificates under `/certs`. Added `TLS_CERT_FILE` and `TLS_KEY_FILE` environment variables so the same code works locally and in the cluster.
- The Deployment referenced a `webhook-certs` Secret without showing how to create it. Added `kubectl create secret tls` commands after certificate generation.
- The webhook certificate guidance did not mention the required service DNS subject alternative name. Added a note that the server certificate should include `admission-webhook.default.svc`.
- The debug pod example would be rejected by the webhook because it lacked the required `app` label. Added `--labels=app=debug` to the command.

## Review Notes
The post now validates as a technically relevant tutorial. The examples still depend on a user-provided `generate-certs.sh`; that script should create a CA certificate and a server certificate valid for the webhook service DNS name. Local execution was not performed because `go`, `kubectl`, and `kind` are not installed in the review environment.
