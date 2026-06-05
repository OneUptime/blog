# Validation Summary: How to Troubleshoot Collector CrashLoopBackOff in K8s Caused by Persistent

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector persistent sending queues
- OpenTelemetry Collector `file_storage` extension
- Kubernetes Pods, Deployments, and PersistentVolumeClaims
- `kubectl`
- BusyBox shell commands

## Sources Consulted
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector exporterhelper package documentation for persistent queues: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Collector Contrib `file_storage` extension documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage/filestorage
- OpenTelemetry Collector official releases repository: https://github.com/open-telemetry/opentelemetry-collector-releases
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The debug PVC inspection example created a pod but then ran `ls` and `du` as local commands. I changed the example to create a long-running debug pod, wait for it to be Ready, and run the inspection commands with `kubectl exec`.
- The `kubectl run --overrides` examples omitted `apiVersion`, which the Kubernetes reference requires for inline overrides. I added `apiVersion: v1` to both override payloads.
- The cleanup pod used `["rm", "-rf", "/queue/*"]`, which does not expand the wildcard because Kubernetes passes the command directly without a shell. I changed it to run through `sh -c` and remove regular and hidden entries.
- The cleanup example waited for `condition=ready` on a one-shot cleanup pod. I changed it to wait for `.status.phase` to become `Succeeded`.
- The prevention snippet configured `file_storage` but did not enable it in `service.extensions`. I added `service: extensions: [file_storage]`.
- The `file_storage` directory guidance did not account for directories needing to exist unless configured otherwise. I added `create_directory: true`.
- The upgrade section described `otel/opentelemetry-collector-contrib:0.121.0` as the latest version, but the official releases repository lists `v0.153.0` as latest on May 26, 2026. I changed the example to `0.153.0`.
- The newer-version corruption handling claim was too vague. I changed it to the documented `file_storage.recreate` behavior, including the caveat that it only handles certain bbolt corruption failures and manual cleanup may still be required.
- The init container and summary wording claimed queue integrity validation, but the snippet only performs a simple directory/size check. I adjusted the wording to match the actual behavior.
- The queue-upgrade cause was worded as queue serialization corruption. I softened it to a compatibility/read behavior issue to avoid overstating the cause.

## Review Notes
The post is technically relevant and validated after corrections. I could not run `kubectl` locally because it is not installed in this workspace, so Kubernetes command validation was done against the official generated Kubernetes CLI reference instead of local `--help` output.
