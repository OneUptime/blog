# How to Prefer NETCONF, RESTCONF, or gNMI While Keeping a Safe CLI Fallback

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Automation, NETCONF, RESTCONF, Networking

Description: Choose network APIs by supported operations and transaction semantics, and permit CLI fallback only when it cannot hide failures or duplicate uncertain writes.

A structured network API usually gives automation a better contract than scraped CLI text. It provides typed data, explicit operations, and machine-readable errors. However, support varies by device, software release, model, and operation.

The reliable design chooses a backend for each operation before changing a device. It does not try an API write and then blindly issue equivalent CLI commands whenever an exception appears.

## Compare the transaction you actually need

NETCONF, RESTCONF, and gNMI are not interchangeable wrappers around the same command. Determine what the workflow needs to read, modify, validate, commit, and recover.

| Interface | Useful mechanism | What to establish before writing |
| --- | --- | --- |
| NETCONF | Capability exchange, configuration datastores, optional validation and confirmed commit | Advertised capabilities and target datastore behavior |
| RESTCONF | YANG data over HTTP with resource-oriented operations | Supported models, HTTP operation semantics, and concurrency controls |
| gNMI | Capabilities, Get, Set, and Subscribe | Models, encodings, paths, and actual read/write support |
| CLI | Platform commands and device-native features | Driver behavior, prompt handling, command errors, and rollback procedure |

NETCONF's candidate, validate, rollback-on-error, and confirmed-commit features are capabilities, not universal assumptions. A server accepting a NETCONF connection does not establish that it supports the transaction your workflow requires. [NETCONF RFC 6241](https://datatracker.ietf.org/doc/html/rfc6241)

RESTCONF defines HTTP operations on YANG resources. An available entity tag can be used with `If-Match` to reject a stale edit. Do not assume that several separate HTTP requests form one transaction, or that a RESTCONF edit automatically provides NETCONF's confirmed-commit behavior. [RESTCONF RFC 8040](https://datatracker.ietf.org/doc/html/rfc8040)

gNMI defines an individual `SetRequest` as a transaction. Put related changes into the same request when they must succeed together, and verify the target's implementation. This does not make a sequence of Set requests, or a change across multiple devices, atomic. [OpenConfig gNMI specification](https://github.com/openconfig/reference/blob/master/rpc/gnmi/gnmi-specification.md)

## Keep a tested capability profile

Maintain a versioned profile for each supported platform and release family. Include model revisions, supported paths, operation types, authorization requirements, and recovery support. Back the profile with integration tests rather than a statement such as “this vendor supports gNMI.”

For example, your own policy file could contain:

```yaml
# Application policy, not a vendor or protocol schema.
operation: set_interface_description
preferred_backend: netconf
required_features:
  - supported_interface_model
  - writable_description
  - tested_readback
fallback:
  backend: cli
  allowed_reason: feature_confirmed_unsupported
  driver_profile: iosxe-tested-description-v1
```

Discovery and profile checks are complementary. A capabilities response establishes what a device advertises; a read-only probe tests a specific path and identity; the integration profile establishes behavior you have actually qualified.

Refresh this evidence after operating system upgrades. A cached profile from before an upgrade should not silently authorize a different schema or driver behavior.

## Separate unsupported from broken

Classify preflight failures explicitly:

| Result | Appropriate next step |
| --- | --- |
| Operation positively identified as unsupported | Use an approved, tested fallback before any write |
| Authentication or authorization failed | Stop and resolve access |
| Certificate or SSH host-key validation failed | Stop and investigate identity |
| API timed out during discovery | Record unavailable or unknown; do not infer unsupported |
| Schema, path, or encoding mismatch | Fix the client/profile and review compatibility |
| Write sent but response lost | Reconcile current state before any further write |

An HTTP `404` alone is not sufficient proof that a feature is unsupported. It may indicate a wrong path, an absent resource, or an access-control policy. Likewise, a gRPC error should be interpreted in the context of the operation, not reduced to “use SSH instead.”

An explicit fallback policy can allow read-only CLI diagnostics when an API is unavailable. Record that the evidence came from a different collector and parser. Do not automatically promote that permission into authority to modify configuration.

## Do not retry an uncertain write through another backend

Suppose a RESTCONF PATCH updates an interface but the response is lost. Sending the CLI version next can duplicate work, obscure the original result, or apply an operation with different semantics.

After a transport failure, mark the operation as outcome unknown. Reconnect using a trusted channel, inspect the owned fields and any available transaction state, and decide whether the intended change is present. If reads remain unavailable, stop and escalate recovery rather than treating the network timeout as an instruction to use a more powerful channel.

The same rule applies to confirmation and rollback requests. A timed-out confirmation can have succeeded. A failed API response does not prove that the old configuration is still active.

## Normalize results, not command semantics

Expose a small application-level result shape to the rest of your pipeline:

```json
{
  "device_id": "access-01",
  "operation": "set_interface_description",
  "backend": "netconf",
  "status": "verified",
  "changed": true,
  "evidence_id": "change-184-device-1"
}
```

Give unknown outcomes their own status rather than overloading `changed: false`. Attach the actual backend and profile version so incident review can reconstruct what happened.

Translate each requested operation through a backend-specific adapter. Do not pretend that CLI merge, NETCONF replace, RESTCONF PUT, and gNMI update have identical ownership or deletion rules. Verify that the adapter modifies only the intended fields and preserves unrelated configuration.

## Make CLI fallback earn its place

A qualified CLI adapter needs trusted host keys, limited privileges, bounded timeouts, reliable pagination handling, explicit command-error detection, and structured readback. Empty parser output should fail a required assertion. A prompt returning successfully does not prove that every command was accepted.

Run API and CLI adapters against the same fixture intent in a lab. Verify resulting configuration, no-op behavior, failed operations, partial failures, and recovery. Where rollback guarantees differ, reflect that difference in the risk policy and approval requirements.

Over time, track fallback frequency by operation and release. High fallback use can identify a missing model, an old device release, or a client bug. Keeping that evidence visible lets the API path improve while the fallback remains a deliberate, bounded compatibility mechanism.
