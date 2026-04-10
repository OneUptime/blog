# Validation Summary: How to Configure Load Balancing for Rook-Ceph Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (RADOS Gateway / RGW, Dashboard, Manager)
- Kubernetes (Services, LoadBalancer, selectors, labels)
- MetalLB (IPAddressPool, L2Advertisement, service annotations)

## Sources Consulted
- Rook CephObjectStore CRD reference: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook API specification (types.go): https://rook.io/docs/rook/latest/CRDs/specification/
- Rook Object Storage overview: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook Ceph Dashboard documentation: https://rook.io/docs/rook/v1.14/Storage-Configuration/Monitoring/ceph-dashboard/
- Rook GitHub source (RGWServiceSpec): https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- MetalLB usage documentation: https://metallb.universe.tf/usage/
- MetalLB release notes (annotation prefix changes): https://metallb.universe.tf/release-notes/

## Issues Found

### 1. Incorrect `type: LoadBalancer` in CephObjectStore CRD (Critical)
**What was wrong:** The original YAML placed `type: LoadBalancer` at `spec.gateway.type` in the CephObjectStore resource. The `spec.gateway.type` field controls the gateway protocol type (e.g., "s3"), NOT the Kubernetes Service type. The `RGWServiceSpec` (`spec.gateway.service`) only supports `annotations` and `labels` — it has no `type` field. The CephObjectStore CRD does not support setting the Kubernetes Service type directly.

**What was changed:** Replaced the single CephObjectStore YAML with a two-document YAML: the CephObjectStore resource (without the invalid `type` field) followed by a separate Kubernetes Service of type LoadBalancer that targets the RGW pods using `app: rook-ceph-rgw` and `rook_object_store: my-store` label selectors. Updated the verification command to reference the new LoadBalancer service name (`rook-ceph-rgw-my-store-lb`).

**Why:** Without this fix, applying the original YAML would either fail CRD validation or silently ignore the `type` field, leaving the RGW accessible only via ClusterIP — the opposite of the post's stated goal.

### 2. Misleading Health Checks section description
**What was wrong:** The section was titled "Health Checks for Load Balanced Services" and described "Configure readiness probes to remove unhealthy RGW instances from rotation." However, the section content only showed manual health check commands (`curl` and `aws s3 ls`), not Kubernetes readiness probe configuration.

**What was changed:** Changed the description to "Verify RGW health by testing the service endpoints" to accurately reflect the section content.

**Why:** The original description claimed the section would show readiness probe configuration, which it did not. This could mislead readers expecting actual probe YAML.

### 3. Misleading Monitoring section description
**What was wrong:** The text stated "Check request distribution across RGW instances using Prometheus" but the command shown was `ceph osd pool stats .rgw.root`, which shows OSD pool I/O statistics — not Prometheus metrics and not request distribution across RGW instances.

**What was changed:** Changed the description to "Check RGW pool I/O statistics to monitor storage activity" to accurately describe what the command does.

**Why:** The `ceph osd pool stats` command has nothing to do with Prometheus and does not show request distribution across RGW instances.

## Review Notes
- The `metallb.universe.tf/allow-shared-ip` annotation in the "Multiple RGW Instances" section is unnecessary for its stated purpose. Multiple RGW pods behind a single Kubernetes Service are already load-balanced by Kubernetes natively. The `allow-shared-ip` annotation is designed for sharing an IP between multiple different Services, not for multiple pods behind one Service. The annotation is not harmful, but readers may be confused about its purpose.
- The MetalLB annotations use the `metallb.universe.tf/` prefix, which is correct for MetalLB v0.13 but deprecated starting with v0.14.9 in favor of the `metallb.io/` prefix. Both prefixes work in v0.14.9+ for backward compatibility. Since the blog uses `metallb.io/v1beta1` CRDs (v0.13+), the annotations are acceptable but readers targeting newer MetalLB versions may want to use the `metallb.io/` prefix.
- The dashboard LoadBalancer Service selector (`app: rook-ceph-mgr`) is correct but minimal. For multi-cluster environments, adding `rook_cluster: rook-ceph` to the selector would be more precise.
- The `targetPort: 80` in the corrected RGW LoadBalancer Service assumes the RGW daemon listens on port 80 inside the container (matching `spec.gateway.port`). Users should verify this matches their Rook configuration.
