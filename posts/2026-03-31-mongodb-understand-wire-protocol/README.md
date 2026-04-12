# How to Understand the MongoDB Wire Protocol

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Wire Protocol, Networking, Driver, Internal

Description: Understand the MongoDB wire protocol structure, message types, and how drivers communicate with mongod to execute commands and transfer data.

---

## What is the MongoDB Wire Protocol

The MongoDB wire protocol is a binary TCP protocol that defines how clients (drivers) communicate with mongod (the server). All MongoDB drivers implement this protocol. Understanding it helps you:
- Debug driver-level issues with packet capture
- Build custom integrations or proxies
- Optimize driver configuration based on how messages work

## Protocol Structure

Every message in the wire protocol consists of:

```text
+------------------+
| MsgHeader (16B)  |  messageLength (int32) + requestID (int32) + responseTo (int32) + opCode (int32)
+------------------+
| Message Body     |  Variable length payload
+------------------+
```

The `opCode` field determines the message type. `OP_MSG` (opCode `2013`) was introduced in MongoDB 3.6 and became the exclusive wire protocol message format in MongoDB 5.1+, after all legacy opcodes were removed.

## OP_MSG Structure

`OP_MSG` is the primary message format:

```text
+----------------------------+
| flagBits (uint32)          |  0 = checksumPresent, 1 = moreToCome, 16 = exhaustAllowed
+----------------------------+
| Section 0 (Body)           |  Kind byte (0) + BSON document (command)
+----------------------------+
| Section 1+ (DocumentSeq)   |  Kind byte (1) + identifier + BSON documents (optional)
+----------------------------+
| CRC-32C checksum (opt)     |  Present if checksumPresent flag set
+----------------------------+
```

## Reading a Wire Protocol Message with Python

```python
import socket
import struct
import bson

def read_message(sock):
    # Read the 16-byte header
    header_data = sock.recv(16)
    if len(header_data) < 16:
        raise ConnectionError("Incomplete header")

    msg_length, request_id, response_to, op_code = struct.unpack("<iiii", header_data)

    # Read remaining message body
    body_length = msg_length - 16
    body = b""
    while len(body) < body_length:
        chunk = sock.recv(body_length - len(body))
        if not chunk:
            raise ConnectionError("Connection closed")
        body += chunk

    return {
        "length": msg_length,
        "requestId": request_id,
        "responseTo": response_to,
        "opCode": op_code,
        "body": body
    }
```

## Building a Minimal OP_MSG Request

```python
def build_op_msg(request_id, command_doc):
    # Serialize the command to BSON
    body_bson = bson.encode(command_doc)

    # Section 0: kind byte (0) + BSON command
    section = bytes([0]) + body_bson

    # OP_MSG body: flagBits (4 bytes) + sections
    flag_bits = struct.pack("<I", 0)
    msg_body = flag_bits + section

    # Wire protocol header: total length + requestId + responseTo + opCode (2013)
    total_length = 16 + len(msg_body)
    header = struct.pack("<iiii", total_length, request_id, 0, 2013)

    return header + msg_body

# Example: build a "ping" command
ping_msg = build_op_msg(1, {"ping": 1, "$db": "admin"})
```

## Capturing Wire Protocol with tcpdump

```bash
sudo tcpdump -i eth0 -w mongo.pcap tcp port 27017
```

Decode with Wireshark, which has a built-in MongoDB dissector that can parse OP_MSG frames and display BSON payloads.

## Summary

The MongoDB wire protocol is a binary TCP protocol where all modern operations use the `OP_MSG` format (opCode 2013). Each message begins with a 16-byte header containing the total length, request ID, response correlation ID, and opCode, followed by flag bits and one or more BSON sections. Understanding this protocol enables building custom drivers, proxies, and debugging tools that inspect raw MongoDB communication at the network level.
