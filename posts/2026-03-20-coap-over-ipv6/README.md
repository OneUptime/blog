# How to Understand CoAP (Constrained Application Protocol) over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, CoAP, IoT, UDP, REST, Networking

Description: Understand how CoAP provides RESTful HTTP-like semantics over UDP/IPv6 for constrained IoT devices, including request/response patterns, observe mode, and block transfer.

## Introduction

CoAP (Constrained Application Protocol) is defined in RFC 7252 as a RESTful protocol designed for constrained IoT devices. It provides HTTP-like semantics (GET, POST, PUT, DELETE) and commonly runs over UDP, making it suitable for devices with limited memory and processing power.

## CoAP vs HTTP

| Feature | HTTP | CoAP |
|---|---|---|
| Transport | TCP or QUIC (HTTP/3) | UDP |
| Header size | Variable, often much larger | 4-byte base header |
| Reliability | TCP guarantees | Optional confirmable mode |
| Multicast | No | Yes (UDP multicast) |
| Observe | Long polling/SSE | Native Observe option |
| URI scheme | `http://` | `coap://` or `coaps://` |

## CoAP Message Types

1. **CON (Confirmable)**: Requires an ACK and supports retransmission at the CoAP message layer
2. **NON (Non-Confirmable)**: Best-effort fire-and-forget (for telemetry)
3. **ACK (Acknowledgement)**: Acknowledges a CON and may carry a piggybacked response
4. **RST (Reset)**: Indicates the message was received but could not be processed

```text
CON request:  CLIENT ─── [GET /temp] ──► SERVER
ACK response: CLIENT ◄── [ACK + 2.05 Content: 23°C] ─── SERVER

NON request (telemetry):
              CLIENT ─── [PUT /reading: 23°C] ──► SERVER (no ACK expected)
```

## CoAP URI and Resource Model

CoAP uses URIs similar to HTTP:

```text
coap://[2001:db8::1]/sensor/temperature
coap://[2001:db8::1]:5683/actuator/led?state=on
coaps://[2001:db8::1]:5684/secure/data   (DTLS-secured)
```

## Implementing a CoAP Server with Python (aiocoap)

```python
#!/usr/bin/env python3
# coap_server.py - Simple CoAP server using aiocoap

# pip install aiocoap

import asyncio
import aiocoap
import aiocoap.resource as resource
from aiocoap.numbers.contentformat import ContentFormat

class TemperatureResource(resource.Resource):
    """CoAP resource representing a temperature sensor."""

    def __init__(self):
        super().__init__()
        self.temperature = 23  # Simulated reading

    async def render_get(self, request):
        """Handle GET requests to /sensor/temperature."""
        payload = f"Temperature: {self.temperature}°C".encode()
        return aiocoap.Message(
            payload=payload,
            content_format=ContentFormat.TEXT
        )

    async def render_put(self, request):
        """Handle PUT requests to update temperature."""
        try:
            self.temperature = float(request.payload.decode())
            return aiocoap.Message(code=aiocoap.CHANGED)
        except Exception:
            return aiocoap.Message(code=aiocoap.BAD_REQUEST)

async def main():
    # Create resource tree
    root = resource.Site()
    root.add_resource(["sensor", "temperature"], TemperatureResource())
    root.add_resource([".well-known", "core"], resource.WKCResource(root.get_resources_as_linkheader))

    # Bind to IPv6 address (and port 5683 which is the default CoAP port)
    await aiocoap.Context.create_server_context(root, bind=("::", 5683))
    await asyncio.get_running_loop().create_future()  # Run forever

asyncio.run(main())
```

## Implementing a CoAP Client

```python
#!/usr/bin/env python3
# coap_client.py - CoAP GET request to an IPv6 CoAP server

import asyncio
import aiocoap

async def main():
    protocol = await aiocoap.Context.create_client_context()

    # GET request to IPv6 CoAP server
    # Note: IPv6 addresses in URIs must be enclosed in brackets
    request = aiocoap.Message(
        code=aiocoap.GET,
        uri='coap://[2001:db8::1]/sensor/temperature'
    )

    try:
        response = await protocol.request(request).response
        print(f"Response code: {response.code}")
        print(f"Payload: {response.payload.decode()}")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(main())
```

## CoAP Observe (Server-Sent Updates)

CoAP Observe (RFC 7641) allows clients to subscribe to resource updates:

```python
# CoAP Observe subscription using aiocoap
async def observe_temperature():
    protocol = await aiocoap.Context.create_client_context()

    request = aiocoap.Message(
        code=aiocoap.GET,
        uri='coap://[2001:db8::1]/sensor/temperature',
        observe=0  # 0 = register for observation
    )

    requester = protocol.request(request)
    await requester.response  # Confirms registration when the server accepts Observe

    async for response in requester.observation:
        print(f"Update: {response.payload.decode()}")
```

## CoAP with DTLS (Secure CoAP)

For encrypted IoT communication:

```python
# coaps:// uses DTLS and defaults to port 5684
request = aiocoap.Message(
    code=aiocoap.GET,
    uri='coaps://[2001:db8::1]/secure/data'
)
# DTLS credentials are typically loaded into the context's client_credentials store before sending the request
```

## Conclusion

CoAP brings RESTful semantics to IPv6-based IoT networks with a minimal overhead that is practical for constrained devices. Running over UDP on IPv6, it supports confirmable and non-confirmable message modes, native observe for push updates, block transfer for larger payloads, and DTLS for security. The `coap://[ipv6-address]/resource` URI format follows HTTP conventions, making CoAP intuitive for developers familiar with web APIs.
