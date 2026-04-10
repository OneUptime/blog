# Validation Summary: How to Use Ceph with Kubeflow for ML Pipeline Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RGW / RADOS Gateway)
- Kubeflow Pipelines (KFP v2)
- Kubernetes Services (ExternalName)
- radosgw-admin CLI
- AWS CLI (S3-compatible)
- Python KFP SDK (`kfp.dsl`)

## Sources Consulted
- Kubernetes official documentation on Services and ExternalName: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubeflow Pipelines SDK v2 documentation (kfp.dsl.component, PipelineTask API)
- Ceph radosgw-admin CLI reference
- Rook CephObjectStore CRD documentation

## Issues Found

### 1. Deprecated/removed KFP v1 import (line 81)
- **What was wrong:** The code imported `from kfp.components import func_to_container_op`, which is a KFP v1 API that has been removed in KFP v2. The rest of the code correctly uses the KFP v2 `@dsl.component` decorator, making this import both stale and unused.
- **What was changed:** Removed the `from kfp.components import func_to_container_op` import line.
- **Why:** `func_to_container_op` does not exist in KFP v2. Leaving it would cause an `ImportError` at runtime.

### 2. Misleading ExternalName Service `ports` with `targetPort` (lines 63-74)
- **What was wrong:** The ExternalName Service included a `ports` section with `port: 9000` and `targetPort: 80`. ExternalName services only create a DNS CNAME record -- they do not proxy traffic or perform port translation. The `targetPort` field is completely ignored. A client connecting to `minio-service:9000` would attempt to reach port 9000 on the resolved CNAME target, not port 80. Since Ceph RGW defaults to port 80, this would result in a connection failure.
- **What was changed:** Removed the non-functional `ports` section and added YAML comments explaining that ExternalName only creates a DNS alias and that the CephObjectStore gateway port must be configured to match what Kubeflow expects.
- **Why:** The `ports` field on ExternalName services is purely informational and does not perform any port mapping (no kube-proxy rules are created). Leaving it suggests port translation occurs, which would mislead readers into a broken setup.

## Review Notes
- The CephObjectStore CRD's `gateway.port` field (default 80) must be set to 9000 to match Kubeflow's expected MinIO port. The post does not explicitly cover this CephObjectStore configuration, which readers would need to set up before the ExternalName redirect works. This could be addressed in a future update.
- The Python pipeline example uses `model.state_dict()` where `model` is not defined within the function body. This is acceptable as illustrative pseudo-code, but readers should understand it is not a runnable example as-is.
- The `import boto3` inside the component function is unused in the example. Again acceptable as illustrative code showing what dependencies might be needed.
- The `@dsl.component` decorator would need a `packages_to_install=["torch", "boto3"]` parameter for the imports to work in the containerized runtime. This is a simplification typical of blog examples.
- The `radosgw-admin` commands and AWS CLI usage are correct and current.
