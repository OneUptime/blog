# Validation Summary: How to Validate Istio YAML with istioctl analyze

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- istioctl
- Kubernetes YAML
- GitHub Actions
- Git pre-commit hooks
- kube-linter
- Open Policy Agent / Conftest

## Sources Consulted
- Istio `istioctl analyze` diagnostic guide: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Istio `istioctl` command reference and local `istioctl analyze --help` output for Istio 1.30.0: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration analysis message reference: https://istio.io/latest/docs/reference/config/analysis/
- IST0101 ReferencedResourceNotFound: https://istio.io/latest/docs/reference/config/analysis/ist0101/
- IST0109 ConflictingMeshGatewayVirtualServiceHosts: https://istio.io/latest/docs/reference/config/analysis/ist0109/
- IST0118 PortNameIsNotUnderNamingConvention: https://istio.io/latest/docs/reference/config/analysis/ist0118/
- IST0132 VirtualServiceHostNotFoundInGateway: https://istio.io/latest/docs/reference/config/analysis/ist0132/
- IST0161 InvalidGatewayCredential: https://istio.io/latest/docs/reference/config/analysis/ist0161/
- Istio protocol selection / service port naming: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio VirtualService API reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/

## Issues Found
- The introduction claimed `istioctl analyze` can catch "most" issues before apply. Changed this to "many" because several analyzers require live cluster state or complete local context, and the tool does not catch every possible mesh issue.
- The sample output used `Warning [IST0101]` for referenced resources. Updated it to `Error [IST0101]`, which matches the current Istio message severity.
- The sample output used `IST0104` for a missing Gateway credential. Updated it to `IST0161`, the current InvalidGatewayCredential message code.
- The sample output showed port name `http` as violating naming conventions. Changed it to `foo-http`, since `http` is a valid protocol-prefixed port name.
- The referenced-host example used `--use-kube=false` while implying a missing Service would be detected from a single local VirtualService file. Changed the command text to describe running against a cluster where the Service is absent.
- The "Gateway Not Found" section used `IST0132` as the primary missing-Gateway code. Changed it to `IST0101` and noted that `IST0132` may also appear for host mismatch against the referenced Gateway.
- The subset-label section used `IST0107`, which is MisplacedAnnotation. Changed it to `IST0173`, the current DestinationRule subset message for subsets that do not select pods.
- The GitHub Actions example pinned Istio 1.24.0. Updated it to Istio 1.30.0, the current release checked during validation.
- The GitHub Actions example ran `istioctl analyze` twice and relied on manual grep for errors. Replaced that with `--failure-threshold Error`, which is the supported CLI behavior.

## Review Notes
The article is technically relevant and the commands, flags, output formats, YAML API versions, and suppression syntax were checked against Istio 1.30.0 documentation and local `istioctl` help output. Local-file analysis is useful in CI, but checks that depend on Kubernetes Services, pods, secrets, or already-applied resources require either live cluster access or a complete set of local manifests.
