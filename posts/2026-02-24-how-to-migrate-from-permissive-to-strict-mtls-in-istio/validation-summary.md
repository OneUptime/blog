# Validation Summary: How to Migrate from Permissive to Strict mTLS in Istio

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio
- Istio PeerAuthentication
- Istio automatic mTLS
- Istio sidecar injection
- Kubernetes
- kubectl
- Prometheus / PromQL
- jq

## Sources Consulted
- Istio Mutual TLS Migration: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration guide: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio sidecar injection guide: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio resource labels reference: https://istio.io/latest/docs/reference/config/labels/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/

## Issues Found
- The post described a mesh-wide PeerAuthentication as being in `istio-system`. Istio documents mesh-level PeerAuthentication as living in the configured root namespace, which is commonly but not always `istio-system`. Updated the text to say "Istio's root namespace (commonly `istio-system`)".
- The post stated that all workloads without sidecars would break when switching to strict mode. Narrowed this to workloads calling services in strict mode, because the failure depends on the traffic path and policy scope.
- The post used `sidecar.istio.io/inject` as a pod annotation for Jobs and CronJobs. The annotation is deprecated in favor of the `sidecar.istio.io/inject` label. Updated the checklist and CronJob manifest to use labels.
- The CronJob example only shut down the sidecar when `/app/sync` succeeded. If the job failed, the sidecar could keep the pod running. Updated the shell snippet to preserve the application exit status, call `localhost:15020/quitquitquit`, and exit with the original status.
- The workload-specific `portLevelMtls` exception did not state that the configured port is the workload container port, not the Kubernetes Service port. Added that clarification from the PeerAuthentication reference.
- The rollback section implied that applying mesh-wide PERMISSIVE mode would roll back the whole mesh even after namespace-level STRICT policies were created. Namespace policies override inherited mesh defaults, so added a note that namespace policies must also be deleted or changed.
- The post-migration validation query used `istio_requests_total`, which Istio documents for HTTP, HTTP/2, and gRPC traffic. Updated the surrounding text and snippet comment so they do not overclaim that the query proves every protocol is encrypted.

## Review Notes
The remaining Istio API versions, PeerAuthentication fields, mTLS modes, `istioctl proxy-config clusters` flags, `istioctl analyze --all-namespaces`, namespace injection label, Prometheus metric labels, and kubectl examples are consistent with the official documentation consulted. The guide assumes sidecar mode; ambient mode has different operational behavior and is not covered.
