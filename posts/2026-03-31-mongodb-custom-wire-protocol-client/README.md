# How to Implement a Custom MongoDB Wire Protocol Client

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Wire Protocol, Driver, Custom Client, Networking

Description: Build a minimal custom MongoDB wire protocol client from scratch using raw TCP sockets and BSON serialization to execute commands against a MongoDB server.

---

## Why Build a Custom Wire Protocol Client

Building a custom client is useful for:
- Learning how official drivers work internally
- Creating lightweight clients for constrained environments
- Building protocol proxies, analyzers, or test harnesses
- Implementing MongoDB support in languages without official drivers

## Prerequisites

Install the BSON library for your language. For Python:

```bash
pip install pymongo
```

## Step 1: Establish a TCP Connection

```python
import socket
import struct
import bson

class MongoWireClient:
    def __init__(self, host="localhost", port=27017):
        self.sock = socket.create_connection((host, port), timeout=10)
        self.request_id = 0

    def _next_request_id(self):
        self.request_id += 1
        return self.request_id
```

## Step 2: Build OP_MSG Frames

```python
    def _build_op_msg(self, db_name, command):
        rid = self._next_request_id()
        command["$db"] = db_name

        bson_doc = bson.encode(command)
        # Section 0: kind byte (0) + command BSON
        section = bytes([0]) + bson_doc

        flag_bits = struct.pack("<I", 0)
        msg_body = flag_bits + section

        total_len = 16 + len(msg_body)
        header = struct.pack("<iiii", total_len, rid, 0, 2013)
        return header + msg_body, rid
```

## Step 3: Send and Receive Messages

```python
    def _send(self, data):
        self.sock.sendall(data)

    def _recv_message(self):
        # Read 16-byte header
        header = self._recv_exactly(16)
        msg_len, req_id, resp_to, op_code = struct.unpack("<iiii", header)

        body = self._recv_exactly(msg_len - 16)
        return header + body

    def _recv_exactly(self, n):
        data = b""
        while len(data) < n:
            chunk = self.sock.recv(n - len(data))
            if not chunk:
                raise ConnectionError("Connection closed by server")
            data += chunk
        return data
```

## Step 4: Parse the OP_MSG Response

```python
    def _parse_response(self, data):
        # Skip 16-byte header and 4-byte flagBits
        offset = 20
        # Kind byte 0 = body section
        kind = data[offset]
        offset += 1

        if kind == 0:
            doc = bson.decode(data[offset:])
            return doc
        raise ValueError(f"Unexpected section kind: {kind}")
```

## Step 5: Execute Commands

```python
    def run_command(self, db_name, command):
        msg, rid = self._build_op_msg(db_name, command)
        self._send(msg)
        response_data = self._recv_message()
        return self._parse_response(response_data)

    def close(self):
        self.sock.close()
```

## Using the Custom Client

```python
client = MongoWireClient("localhost", 27017)

# Run hello command
result = client.run_command("admin", {"hello": 1})
print(f"Topology version: {result.get('topologyVersion')}")
print(f"Is primary: {result.get('isWritablePrimary')}")

# Run a find command
find_result = client.run_command("mydb", {
    "find": "users",
    "filter": {"active": True},
    "limit": 10
})
print(f"First batch: {find_result.get('cursor', {}).get('firstBatch', [])}")

# Run ping
ping = client.run_command("admin", {"ping": 1})
print(f"Ping OK: {ping.get('ok') == 1}")

client.close()
```

## Adding SCRAM-SHA-256 Authentication

For authenticated connections, implement SASL:

```python
import hashlib, hmac, base64, os

def scram_sha256_auth(client, username, password, db="admin"):
    nonce = base64.b64encode(os.urandom(24)).decode()
    client_first = f"n={username},r={nonce}"
    msg = {"saslStart": 1, "mechanism": "SCRAM-SHA-256",
           "payload": bson.Binary(f"n,,{client_first}".encode()), "$db": db}
    result = client.run_command(db, msg)
    # Continue SCRAM handshake (server-first, client-final steps)...
    return result
```

## Summary

A custom MongoDB wire protocol client requires a TCP socket, the ability to serialize commands as BSON, and logic to frame OP_MSG messages with the correct header and section structure. The implementation consists of building the 16-byte header with opCode 2013, appending flagBits and a kind-0 body section containing the BSON command, sending over TCP, and reading the response by first parsing the length prefix to know how many bytes to receive.
