# How to Preserve Unknown Protobuf Fields When Relaying gRPC Messages Through Older Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Protobuf, Python, Debugging

Description: Preserve newly added protobuf fields through older gRPC relays, and test where JSON conversion or manual message rebuilding loses them.

A newer producer adds a field, an older relay successfully parses the message, and the final consumer receives the field's default value. Successful parsing does not prove that the relay preserved data it did not understand.

Current proto3 runtimes preserve unknown fields through binary parse and serialization. The [proto3 guide](https://protobuf.dev/programming-guides/proto3/#unknown-fields) identifies two common loss points: converting to JSON and rebuilding a message one known field at a time.

## Make the compatibility boundary visible

Use two small schemas to reproduce the relay behavior. Different package names let both generated Python modules coexist in one test process; the message shapes model old and new versions of the same wire contract.

Save `old.proto`:

```protobuf
syntax = "proto3";
package relay_old;
message Order {
  string id = 1;
}
```

Save `new.proto`:

```protobuf
syntax = "proto3";
package relay_new;
message Order {
  string id = 1;
  string region = 2;
}
```

Generate the modules in an environment with compatible `grpcio-tools` and protobuf packages:

```bash
python -m grpc_tools.protoc -I . --python_out=. old.proto new.proto
```

No gRPC server is needed for this serialization test. Keep your compiler and runtime dependencies compatible with the [protobuf version guarantees](https://protobuf.dev/support/cross-version-runtime-guarantee/).

## Compare preservation with reconstruction

```python
import old_pb2
import new_pb2
from google.protobuf import json_format

original = new_pb2.Order(id="order-42", region="eu-west")
relay = old_pb2.Order.FromString(original.SerializeToString())

# Binary forwarding preserves the unrecognized field.
forwarded = new_pb2.Order.FromString(relay.SerializeToString())
assert forwarded.region == "eu-west"

# Rebuilding only fields known to the old code loses it.
rebuilt = old_pb2.Order(id=relay.id)
assert new_pb2.Order.FromString(rebuilt.SerializeToString()).region == ""

# An old-schema JSON round trip also loses the unknown field.
text = json_format.MessageToJson(relay)
from_json = json_format.Parse(text, old_pb2.Order())
assert new_pb2.Order.FromString(from_json.SerializeToString()).region == ""

# A message-level copy preserves the unknown field set.
copied = old_pb2.Order()
copied.CopyFrom(relay)
assert new_pb2.Order.FromString(copied.SerializeToString()).region == "eu-west"
```

These assertions check semantic field preservation. They do not require identical serialized bytes, because serialization ordering is not a canonical representation of message identity.

## Inspect every conversion in the relay

Look beyond the gRPC handler. A relay might parse protobuf, convert to an internal data class, serialize a JSON queue message, then rebuild protobuf for the next service. The unknown field disappears at the conversion even though both gRPC endpoints use compatible runtimes.

If the relay is intended to forward the same contract, retain the parsed message and use message-level copying before changing known fields. If it intentionally transforms between different business contracts, document what is preserved and what is dropped. Blind preservation is not always the correct policy at a trust boundary.

Do not use `ignore_unknown_fields` in a JSON parser as a preservation feature. Ignoring an unrecognized JSON key discards it; it does not turn that key into protobuf's binary unknown-field storage. The [ProtoJSON guide](https://protobuf.dev/programming-guides/json/) explains its different evolution constraints.

## Keep schema evolution safe

Do not reuse a removed field number for a different meaning. Reserve deleted numbers and names where appropriate. Unknown-field preservation cannot repair a schema change that interprets old bytes as a different field.

Test the actual language runtimes and versions in the path, including gateways and storage serializers. Historical releases and alternate implementations can differ, so a current Python demonstration is a reference behavior rather than proof about every deployed relay.

## Add the missing rollout test

Before deploying a new field, send a message containing it through the oldest supported relay and read it with the new schema. Repeat through the real queue or persistence layer and after any field-editing operation. Assert the new value survives and known fields still change as intended.

## Conclusion

Preserve the binary message or use message-level copying when an older service must relay newer fields. Test every conversion boundary, because a successful parse and a successful RPC can still hide silent data loss.

## Official Documentation

- [Proto3 unknown-field retention](https://protobuf.dev/programming-guides/proto3/#unknown-fields)
- [ProtoJSON compatibility](https://protobuf.dev/programming-guides/json/)
- [Protobuf compiler/runtime compatibility](https://protobuf.dev/support/cross-version-runtime-guarantee/)
