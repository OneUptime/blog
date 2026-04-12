# How to Use OP_MSG for MongoDB Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Wire Protocol, OP_MSG, Driver, Internal

Description: Learn how OP_MSG works as MongoDB's primary message format, including flag bits, section types, and how to construct valid OP_MSG frames for commands and bulk operations.

---

## What is OP_MSG

`OP_MSG` (opCode `2013`) was introduced in MongoDB 3.6 and replaced all previous opcodes (`OP_QUERY`, `OP_INSERT`, `OP_UPDATE`, etc.) as the single unified message format. Every read, write, aggregation, and administrative command now uses `OP_MSG`.

Key advantages over legacy opcodes:
- Bulk payloads are not constrained to a single 16MB BSON document (total message limited by `maxMessageSizeBytes`, default 48MB)
- Enables `moreToCome` pipelining for reduced round trips
- Carries command and payload in separate sections for efficiency

## OP_MSG Flag Bits

The `flagBits` field is a 32-bit integer where each bit controls behavior:

```text
Bit 0  - checksumPresent: message ends with CRC-32C checksum
Bit 1  - moreToCome: sender will send additional messages without awaiting a response
Bit 16 - exhaustAllowed: client requests exhaust cursor mode
```

## Section Types

`OP_MSG` uses two section types:

**Kind 0 - Body Section**: Contains a single BSON document representing the command.

**Kind 1 - Document Sequence**: Contains multiple BSON documents identified by a string label, used for bulk write payloads.

## Constructing a Simple Command (Kind 0 Only)

```python
import struct
import bson

def build_op_msg_command(request_id, db_name, command):
    # Add $db field required by OP_MSG
    command["$db"] = db_name

    # Section 0: kind byte + BSON document
    bson_doc = bson.encode(command)
    section0 = bytes([0]) + bson_doc

    # No checksum - flagBits = 0
    flag_bits = struct.pack("<I", 0)
    msg_body = flag_bits + section0

    total = 16 + len(msg_body)
    header = struct.pack("<iiii", total, request_id, 0, 2013)
    return header + msg_body

# Build a "hello" command
hello_msg = build_op_msg_command(1, "admin", {"hello": 1})
```

## Constructing a Bulk Insert (Kind 0 + Kind 1)

For bulk inserts, the command document goes in section 0 and the documents go in a kind-1 section:

```python
def build_bulk_insert(request_id, db_name, collection, documents):
    # Section 0: insert command
    cmd = bson.encode({
        "insert": collection,
        "$db": db_name,
        "ordered": True
    })
    section0 = bytes([0]) + cmd

    # Section 1: document sequence
    identifier = b"documents\x00"  # null-terminated string
    docs_bson = b"".join(bson.encode(d) for d in documents)
    seq_size = struct.pack("<i", 4 + len(identifier) + len(docs_bson))
    section1 = bytes([1]) + seq_size + identifier + docs_bson

    flag_bits = struct.pack("<I", 0)
    msg_body = flag_bits + section0 + section1

    total = 16 + len(msg_body)
    header = struct.pack("<iiii", total, request_id, 0, 2013)
    return header + msg_body
```

## Parsing an OP_MSG Response

```python
def parse_op_msg_response(data):
    if len(data) < 20:
        raise ValueError("Message too short")

    # Skip header (16 bytes)
    flag_bits = struct.unpack("<I", data[16:20])[0]
    checksum_present = flag_bits & 1

    offset = 20  # After header and flagBits
    sections = []

    end = len(data) - (4 if checksum_present else 0)

    while offset < end:
        kind = data[offset]
        offset += 1

        if kind == 0:
            doc_size = struct.unpack("<i", data[offset:offset+4])[0]
            doc = bson.decode(data[offset:offset+doc_size])
            sections.append({"kind": 0, "document": doc})
            offset += doc_size
        elif kind == 1:
            seq_size = struct.unpack("<i", data[offset:offset+4])[0]
            offset += seq_size  # Skip the sequence

    return sections
```

## Summary

`OP_MSG` is the universal MongoDB message format used for all commands since MongoDB 3.6. It consists of a 16-byte header, a 4-byte `flagBits` field, and one or more typed sections. Kind-0 sections carry BSON command documents; kind-1 sections carry bulk document sequences. Understanding section construction is essential for implementing custom drivers, proxies, or protocol-level testing tools.
