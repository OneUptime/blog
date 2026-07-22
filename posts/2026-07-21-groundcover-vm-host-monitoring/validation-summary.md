# Validation Summary: Can Groundcover Monitor VMs and Standalone Hosts Outside Kubernetes?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Groundcover Linux host sensor
- Linux virtual machines and standalone hosts
- eBPF, CO-RE, and BTF
- AMD64 and ARM64 systems
- Docker
- systemd and JournalD
- Static-file log collection
- OpenTelemetry and Prometheus ingestion
- BYOC and on-premises observability backends

## Sources Consulted

- [Connect Linux hosts](https://docs.groundcover.com/getting-started/installation-and-updating/connect-linux-hosts)
- [Kernel requirements for eBPF sensor](https://docs.groundcover.com/getting-started/requirements/kernel-requirements-for-ebpf-sensor)
- [Groundcover architecture overview](https://docs.groundcover.com/architecture/overview)
- [Sensitive data obfuscation](https://docs.groundcover.com/customization/customize-usage/sensitive-data-obfuscation)
- [Obfuscate Logs](https://docs.groundcover.com/use-groundcover/data-pipelines/log-pipelines/obfuscate-logs)
- [Custom logs collection](https://docs.groundcover.com/customization/customize-usage/custom-logs-collection)
- [Customize tracing payload size](https://docs.groundcover.com/customization/customize-usage/customize-tracing-payload-size)
- [Create Ingestion Key](https://docs.groundcover.com/use-groundcover/remote-access-and-apis/api-examples/create-ingestion-key)
- [Official Linux host sensor installer](https://groundcover.com/install-groundcover-sensor.sh)

## Issues Found

- The post instructed operators to pin a sensor version, but Groundcover's documented Linux installer pulls the latest sensor release and does not document a version-selection option. Changed the guidance to record the deployed version and confirm a supported pinning workflow with Groundcover when required. Related package-manager terminology was changed to describe the integration accurately as an installer-managed system service.
- The backend-connectivity section did not specify that the Linux host installer requires a dedicated ingestion key of type `Sensor`. Added the documented key type.
- The post treated trace truncation as ordinary prefix-preserving truncation and claimed that a secret at the start of a request could still be captured. Groundcover's documentation says truncated data is shown as `scrubbed`. Corrected the explanation and clarified that payload obfuscation is disabled by default except for Groundcover's default sensitive HTTP and gRPC header list.

## Review Notes

The post contains no code blocks, terminal commands, or configuration snippets, but it is a technical deployment and security guide with implementation-specific claims, so it received a full technical review. The documented Linux host support matrix, telemetry capabilities, cloud metadata providers, kernel/BTF requirements, architectures, service model, log sources, Kubernetes feature-parity limitations, and BYOC/on-premises restriction were otherwise accurate as of the validation date.
