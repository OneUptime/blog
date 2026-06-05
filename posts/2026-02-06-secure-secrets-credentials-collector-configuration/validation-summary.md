# Validation Summary: How to Secure Secrets and Credentials in Collector Configuration Files

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector configuration
- OpenTelemetry Collector configuration providers
- Google Secret Manager
- Kubernetes Secrets
- Docker Compose secrets
- Podman secrets
- Bitnami Sealed Secrets
- systemd environment files
- detect-secrets pre-commit hook

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector registry: https://opentelemetry.io/ecosystem/registry/?language=collector
- Google Secret Manager provider package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/confmap/provider/googlesecretmanagerprovider
- OpenTelemetry Collector file provider package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/confmap/provider/fileprovider
- OpenTelemetry Collector Docker installation documentation: https://opentelemetry.io/docs/collector/install/docker/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Docker Compose secrets documentation: https://docs.docker.com/reference/compose-file/secrets/
- Podman secret documentation: https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Bitnami Sealed Secrets repository documentation: https://github.com/bitnami-labs/sealed-secrets
- Yelp detect-secrets repository documentation: https://github.com/Yelp/detect-secrets

## Issues Found
- The post described a HashiCorp Vault config provider and used `config_sources` / `${vault:...}` syntax. Current OpenTelemetry Collector documentation and registry do not list a Vault config provider, while the contrib registry documents Google Secret Manager and AWS Secrets Manager providers. I replaced the Vault section with the documented Google Secret Manager provider syntax.
- The Vault section claimed secrets could be rotated without redeploying the Collector depending on cache settings. The documented Google Secret Manager provider resolves secrets during Collector configuration loading, so I changed the text to say the Collector should be restarted or reloaded to pick up rotated values.
- The Kubernetes Deployment example omitted required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. I added the selector and labels.
- The Docker Compose example used the obsolete top-level `version` field and an entrypoint script that would not work with the official contrib image's single-binary layout. I removed the `version` field, added the Collector config command, and switched the example to use the documented file provider for mounted secrets.
- The Prometheus file-based secret example embedded a file-provider expression inside a prefixed string. I changed it so the mounted secret file supplies the full Authorization header value.
- The detect-secrets pre-commit hook was pinned to `v1.4.0`; `v1.5.0` is available. I updated the hook pin.
- The post description still referenced "vaults" after replacing the unsupported Vault section. I updated it to "secret managers."

## Review Notes
The examples still use `otel/opentelemetry-collector-contrib:latest`, which works as a general example but should normally be pinned to a tested Collector version in production.
