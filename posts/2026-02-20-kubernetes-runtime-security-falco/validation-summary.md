# Validation Summary: How to Use Falco for Kubernetes Runtime Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Falco
- Falco Helm chart
- Falcosidekick
- Falco rules
- YAML
- Python Flask
- Mermaid

## Sources Consulted
- Falco Helm chart README: https://github.com/falcosecurity/charts/tree/master/charts/falco
- Falco Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falco/values.yaml
- Falcosidekick Helm chart values: https://github.com/falcosecurity/charts/blob/master/charts/falcosidekick/values.yaml
- Falcosidekick webhook output documentation: https://github.com/falcosecurity/falcosidekick/blob/master/docs/outputs/webhook.md
- Falcosidekick README webhook payload example: https://github.com/falcosecurity/falcosidekick
- Falco kernel event source documentation: https://falco.org/docs/concepts/event-sources/kernel/
- Falco rule condition syntax: https://falco.org/docs/concepts/rules/conditions/
- Falco supported fields reference: https://falco.org/docs/reference/rules/supported-fields/
- Official Falco rules repository: https://github.com/falcosecurity/rules

## Issues Found
- The Helm examples used `driver.kind=ebpf`, but the current Falco Helm chart documents `driver.kind=modern_ebpf` for the modern eBPF probe. Updated both the install command and values file example.
- The eBPF driver comment claimed eBPF "works on more kernel versions." Falco's documentation says the modern eBPF probe needs modern eBPF features such as BPF ring buffer and BTF, while the kernel module supports older kernels. Reworded the comment to say it avoids building or loading a kernel module but requires modern eBPF features.
- Two custom rules used `evt.dir=<`. Falco's condition documentation marks `evt.dir` and syscall direction as deprecated as of Falco 0.42.0, so the custom rule conditions were updated to avoid the deprecated field.

## Review Notes
- The Falco Helm chart defaults to `driver.kind=auto`, which attempts modern eBPF and can fall back to the kernel module. The post intentionally forces modern eBPF, so users should verify their node kernels expose the required eBPF features.
- The Flask alert processor is a simplified example and stores alerts in memory. That is acceptable for a blog example, but production use should use durable storage and authentication on the webhook endpoint.
