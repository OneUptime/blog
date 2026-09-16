# How to Evolve Proto3 Scalar Fields to `optional` Without Breaking Older gRPC Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Protobuf, Go, Backward Compatibility, Schema Evolution

Description: Migrate proto3 scalars to optional while preserving field numbers, handling explicit zero values, and testing old-client round trips.

---

An API originally uses `int32 quota_limit = 1` and treats zero as the default policy. Later, a product requirement distinguishes an omitted limit from an explicit zero that disables access. Adding `optional` enables presence tracking, but old clients still cannot express that distinction reliably.

The migration therefore has two parts: keep the serialized field compatible, and introduce new behavior only where the sender can express it. A protobuf compiler accepting the schema is not enough to establish application compatibility.

## Preserve the Existing Field Identity

The old definition is:

```protobuf
syntax = "proto3";
package acme.quotas.v1;

message Policy {
  int32 quota_limit = 1;
}
```

The new definition adds one label:

```protobuf
syntax = "proto3";
package acme.quotas.v1;

message Policy {
  optional int32 quota_limit = 1;
}
```

Keep the field number, scalar type, message name, and package unchanged. Do not replace the scalar with a wrapper message at the same field number: that changes its wire representation. Add a separate field if the replacement has a different type. [Proto3 schema evolution rules](https://protobuf.dev/programming-guides/proto3/#updating).

The presence change is binary compatible, but explicit default values can disappear when an old implementation parses and reserializes them. The official field-presence guide calls out this round-trip behavior. [Protocol Buffers field presence](https://protobuf.dev/programming-guides/field_presence/#change-compatibility).

## Separate Three Business Cases

Write down the behavior before changing handlers:

| New request state | Possible intended behavior |
| --- | --- |
| Absent limit | Use the existing default policy |
| Present zero | Disable allocation |
| Present nonzero limit | Apply the requested limit |

An old client can send a nonzero limit. Its ordinary generated serializer omits a zero-valued implicit scalar, so zero and absence arrive alike. A new server cannot recover intent that was never serialized.

If the old API interpreted omitted zero as “use default,” preserve that behavior for absence. Enable the new explicit-zero behavior for upgraded clients. If the old API interpreted zero as an actual update, switching absence to “leave unchanged” would break those callers. Introduce a new method, a versioned request, or a separately documented update mechanism instead.

## Update Generated-Code Usage

With Go's Open Struct API, the scalar changes from `int32` to `*int32`. Generated getters remain convenient for retrieving a value, but a getter returning zero does not tell you whether the field is present. [Go generated scalar fields](https://protobuf.dev/reference/go/go-generated/#singular-explicit).

The following handler fragment assumes `req` is the regenerated `Policy` message and `applyDefault` and `applyLimit` return application errors:

```go
if req.QuotaLimit == nil {
    return applyDefault()
}
return applyLimit(req.GetQuotaLimit())
```

An upgraded Go caller can explicitly request zero:

```go
policy := &quotapb.Policy{
    QuotaLimit: proto.Int32(0),
}
```

These examples use the Open Struct API. A project selecting the Opaque API should use its generated presence and setter methods rather than accessing fields directly. Compile all regenerated consumers; source compatibility can change even when deployed old binaries remain wire compatible.

Check constructors, equality assertions, configuration mapping, database adapters, and JSON conversions. These are common places where a pointer is flattened back into a scalar and presence is lost.

## Test the Old-Reader Round Trip

Build two isolated test fixtures from the old and new schemas. Keep their descriptors in separate processes or separate descriptor pools so the same fully qualified message name does not conflict in a shared registry.

Run this matrix:

| Input | Receiver or route | Expected observation |
| --- | --- | --- |
| Old nonzero | New reader | Same value, present |
| Old zero | New reader | Zero value, absent |
| New absent | Old reader | Zero value |
| New explicit zero | New reader | Zero value, present |
| New explicit zero | Old parse and serialize, then new reader | Zero value, presence lost |
| New nonzero | Old parse and serialize, then new reader | Same value, present |

Test the actual legacy binary or generated library, not just two copies of the new schema. Include message relays, caches that deserialize and reserialize, stored payload migrations, and event consumers. Byte-preserving transport relays are different from components that reconstruct messages.

A wire fixture for field 1 explicitly set to integer zero is the two bytes `08 00`. An old implicit-presence serializer normally produces an empty message after reading that fixture. A new explicit-presence reader then sees no field.

## Keep Patch Semantics Deliberate

An `optional` scalar can express “present zero,” but it does not automatically define a patch API. Specify what absence means for create, replace, and update operations separately.

For an update API using `FieldMask`, a masked field can be reset to its default value according to the API contract. That can provide a path for existing clients that already support masks. Do not silently add mask requirements to callers that previously sent full replacements. [FieldMask update semantics](https://pkg.go.dev/google.golang.org/protobuf/types/known/fieldmaskpb).

Test binary gRPC and every JSON gateway independently. The same request passing through a map-based adapter may no longer preserve absence, even if the protobuf runtime does.

## Roll Out Readers Before New Semantics

First deploy servers that understand the new schema while retaining the old absent-field behavior. Next update any relays that must preserve explicit defaults. Then release clients that send presence-aware values and enable the new business behavior only on supported routes.

During rollout, count absent, present-zero, and present-nonzero requests without logging sensitive payloads. Alert on unexpected changes in defaults or allocation behavior. A rollback plan should also acknowledge that an older server may interpret an explicit zero using its former semantics.

The migration succeeds when both values and caller intent survive every required route. Treat binary parsing, generated source compatibility, and business meaning as separate checks.
