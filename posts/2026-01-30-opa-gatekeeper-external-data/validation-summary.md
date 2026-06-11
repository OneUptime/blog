# Validation Summary: How to Build OPA Gatekeeper External Data

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OPA Gatekeeper External Data
- Kubernetes admission control, ConstraintTemplates, Constraints, Deployments, Services, and Secrets
- Rego policy authoring
- Go HTTP/TLS services
- Python Flask HTTP services
- Helm and kubectl
- OpenSSL TLS certificate generation
- Prometheus metrics

## Sources Consulted
- Gatekeeper External Data documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/externaldata/
- Gatekeeper external data provider template repository: https://github.com/open-policy-agent/gatekeeper-external-data-provider
- Gatekeeper dummy external data provider template: https://github.com/open-policy-agent/gatekeeper/blob/master/test/externaldata/dummy-provider/policy/template.yaml
- OPA Constraint Framework externaldata Provider API source: https://github.com/open-policy-agent/frameworks/tree/master/constraint/pkg/apis/externaldata
- Gatekeeper Helm chart metadata on Artifact Hub: https://artifacthub.io/packages/helm/gatekeeper/gatekeeper
- Go net/http TLS server documentation: https://pkg.go.dev/net/http#ListenAndServeTLS
- Flask API documentation: https://flask.palletsprojects.com/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The post said External Data requires Gatekeeper v3.7.0 or later. Updated this to describe the current beta state in Gatekeeper v3.11.0 and later, matching current Gatekeeper documentation.
- The Provider YAML used `spec.timeout: 5s` and `10s`. The Provider API defines `timeout` as an integer number of seconds, so these were changed to `5` and `10`.
- The Provider YAML included `failurePolicy` and `insecureTLSSkipVerify`, which are not current `Provider` spec fields. Removed those fields and moved validation fail-open/fail-closed behavior into Rego examples.
- The Provider URL example did not match the Service deployed later in the post. Updated it to `https://image-validator.gatekeeper-system.svc:8443/validate`.
- The mTLS Provider example implied client certificate configuration belongs in the Provider resource. Updated the comment to clarify that mTLS client verification is configured in the provider server using Gatekeeper's webhook CA.
- The Go provider example used `strings.Split` and `strings.Contains` without importing `strings`. Added the missing import.
- The Rego examples treated `external_data` results as `response.systemError` and `response.responses[image]`. Gatekeeper's Rego built-in returns normalized fields such as `system_error`, `responses`, and `errors`, with responses as key/value tuples. Updated all Rego examples accordingly.
- The structured logging snippet used `log.WithFields`, which is not available on Go's standard `log` package. Replaced it with a standard-library `slog.Info` example.

## Review Notes
No local `go` or `opa` binary was available in the workspace, so code snippets were reviewed statically against official documentation and upstream source rather than compiled locally. The provider implementations remain simplified examples; production deployments should use bounded request timeouts, TLS 1.3-capable server configuration, real image reference parsing, and real scanner/signature integrations.
