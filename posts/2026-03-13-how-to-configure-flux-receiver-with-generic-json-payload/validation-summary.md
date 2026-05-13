# Validation Summary: How to Configure Flux Receiver with Generic JSON Payload

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux notification-controller Receiver API
- Flux `generic` and `generic-hmac` receiver types
- Kubernetes Secrets and Ingress
- kubectl and flux CLI commands
- Webhook integrations with Jenkins, CircleCI, Tekton, and shell scripts
- HMAC signatures with OpenSSL

## Sources Consulted
- Flux Receivers documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux Notification API reference for `Receiver`: https://v2-0.docs.fluxcd.io/flux/components/notification/api/v1/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux latest install manifest for service names: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The post incorrectly said the `generic` Receiver validates incoming requests with HMAC or a token header. Flux documentation states that `generic` does not validate incoming requests; it responds on the generated webhook path and triggers reconciliation. Updated the explanation, calling section, troubleshooting note, and conclusion.
- The post implied the generic Receiver expects a token in the request body or header. Updated this to clarify that the Secret token is used to generate the webhook path, while `generic-hmac` is the receiver type that validates an `X-Signature` header.
- The HMAC curl example calculated a signature but did not send it, and the text did not mention Flux's required hash-function prefix. Added `-H "X-Signature: sha256=$SIGNATURE"` and clarified the expected `sha256=<hash>` format.
- The Ingress example routed to the `notification-controller` service. Flux's install manifest exposes webhook traffic through the `webhook-receiver` service, so the backend service name was corrected.
- The prerequisite listed Kubernetes v1.25 or later, which is outdated for current Flux documentation. Updated it to require a Kubernetes version supported by the installed Flux release.

## Review Notes
The remaining examples are intentionally generic and assume placeholder resource names, webhook URLs, and CI job definitions. The Flux `resources` entries omit `apiVersion`, which is allowed by the Receiver API, though adding explicit API versions can make manifests clearer in larger clusters.
