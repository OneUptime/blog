# Validation Summary: How to Troubleshoot OpenTelemetry Operator Auto-Instrumentation Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Operator
- Kubernetes mutating admission webhooks
- OpenTelemetry Instrumentation custom resources
- OpenTelemetry auto-instrumentation for Java, Node.js, Python, .NET, and Go
- OpenTelemetry Collector OTLP endpoints
- kubectl commands

## Sources Consulted
- OpenTelemetry documentation: Injecting Auto-instrumentation, https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry documentation: Operator auto-instrumentation troubleshooting, https://opentelemetry.io/uk/docs/platforms/kubernetes/operator/troubleshooting/automatic/
- OpenTelemetry Operator GitHub README, https://github.com/open-telemetry/opentelemetry-operator

## Issues Found
- The Instrumentation CR and connectivity examples used port `4317` as a general default. Current OpenTelemetry Operator documentation lists language-specific defaults: Java, Python, .NET, and Go use OTLP/HTTP protobuf on `4318`, while Node.js uses OTLP/gRPC on `4317`. I changed the Java-oriented examples to `4318` and added protocol-specific guidance.
- The init-container log command hard-coded `opentelemetry-auto-instrumentation`. Current examples often show language-suffixed init-container names such as `opentelemetry-auto-instrumentation-python`. I changed the command to use a placeholder and added a short note.
- The post said the operator appends to existing `JAVA_TOOL_OPTIONS`. Official troubleshooting guidance says auto-instrumentation currently overrides `JAVA_TOOL_OPTIONS` when it is set in the image or through a ConfigMap. I corrected that bullet.

## Review Notes
The post remains technically relevant and useful. `kubectl` is not installed in this workspace, so command syntax was reviewed against documented Kubernetes/OpenTelemetry usage rather than local `kubectl --help` output.
