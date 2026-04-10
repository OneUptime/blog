# Validation Summary: How to Compare Ceph vs Swift (Standalone) for Object Storage

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- OpenStack Swift
- Rook (Ceph operator for Kubernetes)
- AWS CLI (S3 API)
- python-swiftclient CLI
- Keystone (OpenStack identity)
- Glance (OpenStack image service)
- swift-ring-builder

## Sources Consulted
- Ceph RGW documentation: https://docs.ceph.com/en/latest/radosgw/
- OpenStack Swift documentation: https://docs.openstack.org/swift/latest/
- python-swiftclient CLI reference: https://docs.openstack.org/python-swiftclient/latest/cli/index.html
- Keystone v3 authentication: https://docs.openstack.org/keystone/latest/user/supported_clients.html
- Swift ring builder documentation: https://docs.openstack.org/swift/latest/overview_ring.html
- Glance configuration with Ceph: https://docs.openstack.org/glance/latest/configuration/configuring.html
- AWS CLI S3 reference: https://docs.aws.amazon.com/cli/latest/reference/s3/

## Issues Found

### 1. Incomplete Swift CLI command for Keystone v3 authentication
**What was wrong:** The `swift` CLI example used a Keystone v3 auth URL (`/v3`) but omitted required v3 authentication parameters: `--os-project-name`, `--os-user-domain-name`, and `--os-project-domain-name`. Without these, Keystone v3 scoped token authentication fails.
**What was changed:** Added `--os-project-name admin`, `--os-user-domain-name Default`, and `--os-project-domain-name Default` to the swift CLI command.
**Why:** Keystone v3 requires a project scope and domain qualifiers for both user and project to issue a scoped token.

### 2. Swift replication section showed unrelated configuration
**What was wrong:** The Swift replication section described "configurable replica count" but showed a `swift_hash_path_suffix` configuration from `swift.conf`. This parameter controls consistent hashing for partition assignment, not replication. It has no relation to replica count.
**What was changed:** Replaced the `swift.conf` snippet with the correct `swift-ring-builder create` command that demonstrates how to configure the replica count (e.g., `swift-ring-builder /etc/swift/object.builder create 10 3 1` where `3` is the replica count).
**Why:** The ring builder is the actual mechanism for configuring replica count in Swift. Showing `swift_hash_path_suffix` was misleading in the context of replication.

## Review Notes
- The "Metadata" row in the Architecture Comparison table lists "Object ring" for Swift. More precisely, Swift stores metadata as extended attributes (xattrs) on the local filesystem, with the ring determining placement. This is a reasonable simplification for a comparison table but could be clarified in a future revision.
- The Glance configuration snippet uses the `[glance_store]` section format. In newer OpenStack releases (Stein+), `enabled_backends` in `[DEFAULT]` is the preferred multi-store configuration approach. The shown format still works but may be worth updating if the post targets recent OpenStack releases.
- The performance comparison table uses qualitative terms (High, Moderate, Excellent) without benchmarks or citations. This is acceptable for a general comparison but readers should be aware these are general characterizations, not measured values.
