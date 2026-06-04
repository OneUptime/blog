# Validation Summary: How to Implement Immutable Audit Trails for Kubernetes API Server Events

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes API server audit logging
- Kubernetes audit policies and webhook audit backend
- Go HTTP services
- AWS SDK for Go v2
- Amazon S3 Object Lock
- Python cryptographic verification
- PrometheusRule alerting

## Sources Consulted
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes API server audit configuration reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Amazon S3 Object Lock documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
- Amazon S3 CLI getting started and Object Lock examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/GettingStartedS3CLI.html
- AWS CLI create-bucket command reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html
- AWS SDK for Go v1 end-of-support announcement: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-go-v1-on-july-31-2025/
- AWS SDK for Go v2 S3 examples: https://docs.aws.amazon.com/sdk-for-go/v2/developer-guide/go_s3_code_examples.html
- Amazon S3 PutObject API reference: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html

## Issues Found
- The receiver unmarshaled a single audit event, but the Kubernetes webhook backend sends batched audit data as an `audit.k8s.io/v1` `EventList`. Added an `AuditEventList` wrapper and processed each item.
- The Go receiver signed and hashed normal `encoding/json` struct output while the Python verifier used sorted-key JSON with default spaces, so signatures and hashes would not verify. Added deterministic JSON serialization on both sides.
- The hash chain used shared in-memory state with three Deployment replicas, which would create divergent chains. Changed the example Deployment to one replica and added a mutex around hash-chain updates.
- The receiver advanced `lastHash` before S3 storage succeeded, which could break the chain after a failed write. Updated the code to advance the hash only after a successful `PutObject`.
- The Go example used AWS SDK for Go v1, which reached end-of-support on July 31, 2025. Updated the sample to AWS SDK for Go v2 imports and client calls.
- The S3 Object Lock examples used Governance mode, which privileged users can bypass. Changed the examples to Compliance mode to match the post's immutable audit trail and compliance claims.
- The receiver mounted TLS files at `/etc/tls` but called `ListenAndServeTLS` with relative paths. Updated the code to use `/etc/tls/tls.crt` and `/etc/tls/tls.key`.
- The `S3_BUCKET` environment variable in the Deployment was not used by the Go code. Updated the receiver to read `S3_BUCKET`.
- The S3 object key used only `auditID`, which can collide across multiple audit stages for the same request. Added a timestamp component to the key.
- The Pod Security Admission audit policy rule only matched namespaces, but PSA audit annotations are added to audit events for pod admission violations. Updated the rule to include pods.
- Removed unused Python imports and modernized `serialization.load_der_public_key` usage.

## Review Notes
- Python syntax validation passed with `python3 -m py_compile`.
- Go compilation could not be run because the `go` toolchain is not installed in the workspace.
- The single-replica in-memory hash-chain example is technically consistent for the tutorial, but a production highly available implementation should store chain state durably or use an external sequencer.
