# Validation Summary: How to Fix Certificate Rotation Breaking the Collector mTLS Connection Until

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- Collector TLS and mTLS configuration
- cert-manager
- Kubernetes Secrets and projected volumes
- stakater/Reloader
- OpenSSL CLI

## Sources Consulted
- OpenTelemetry Collector configtls package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configtls
- OpenTelemetry Collector configtls README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Collector v0.90.0 configtls source: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/v0.90.0/config/configtls/configtls.go
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- cert-manager kubectl plugin documentation: https://cert-manager.io/docs/usage/kubectl-plugin/
- stakater/Reloader annotation reference: https://docs.stakater.com/reloader/main/reference/annotations.html
- OpenSSL s_client documentation: https://docs.openssl.org/master/man1/openssl-s_client/
- OpenTelemetry Collector configuration reload discussion: https://github.com/open-telemetry/opentelemetry-collector/issues/10264

## Issues Found
- The Collector mTLS example used `reload_interval` but did not include `client_ca_file_reload: true`. The Collector documentation defines `reload_interval` for certificate/key reloading and `client_ca_file_reload` separately for server-side client CA reloads, so I added the missing setting and adjusted the explanation.
- The Kubernetes Deployment snippet for projected Secret volumes was presented as a full `apps/v1` Deployment but omitted required `selector`, pod template labels, and the container image. I added those fields so the manifest shape is valid.
- The Reloader snippet was also presented like a full Deployment while only showing metadata. I narrowed it to the annotation block so it is clearly something to add to an existing Deployment.
- The sidecar section implied a generic sidecar marker file could reload the Collector. I clarified that the marker only works with a custom extension or supervisor, and noted that recent Collector versions can reload full configuration on `SIGHUP` while TLS certificate rotation is better handled through the documented TLS settings.
- The OpenSSL verification command did not specify a CA file, SNI name, or hostname verification, so it would not properly verify the server certificate chain and hostname. I added `-CAfile`, `-servername`, `-verify_return_error`, `-verify_hostname`, and the full Kubernetes service DNS name.
- The short-lived certificate guidance mentioned only `reload_interval`. I added the mTLS receiver caveat for `client_ca_file_reload: true` when the client CA file may rotate.

## Review Notes
The cert-manager renewal command and Reloader Secret annotation are valid. Kubernetes Secret volume updates are eventually consistent, and Secret mounts that use `subPath` would not receive automated updates; this post uses normal projected volume paths, so that caveat does not invalidate the example.
