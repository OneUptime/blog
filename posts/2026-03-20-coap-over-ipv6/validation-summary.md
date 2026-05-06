# Validation Summary: How to Understand CoAP (Constrained Application Protocol) over IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- CoAP
- IPv6
- UDP
- DTLS
- Python
- aiocoap
- HTTP/REST semantics

## Sources Consulted
- RFC 7252: The Constrained Application Protocol (CoAP) - https://www.rfc-editor.org/rfc/rfc7252.html
- RFC 7641: Observing Resources in the Constrained Application Protocol (CoAP) - https://www.rfc-editor.org/rfc/rfc7641.html
- RFC 7959: Block-Wise Transfers in the Constrained Application Protocol (CoAP) - https://www.rfc-editor.org/rfc/rfc7959.html
- RFC 8323: CoAP over TCP, TLS, and WebSockets - https://www.rfc-editor.org/rfc/rfc8323.html
- RFC 9114: HTTP/3 - https://www.rfc-editor.org/rfc/rfc9114
- aiocoap Usage Examples - https://aiocoap.readthedocs.io/en/latest/examples.html
- aiocoap protocol module - https://aiocoap.readthedocs.io/en/latest/module/aiocoap.protocol.html
- aiocoap message module - https://aiocoap.readthedocs.io/en/latest/module/aiocoap.message.html
- aiocoap tinydtls transport module - https://aiocoap.readthedocs.io/en/latest/module/aiocoap.transports.tinydtls.html
- aiocoap tinydtls server module - https://aiocoap.readthedocs.io/en/latest/module/aiocoap.transports.tinydtls_server.html
- Python asyncio event loop documentation - https://docs.python.org/3/library/asyncio-eventloop.html

## Issues Found
- The HTTP transport comparison said HTTP uses TCP only. I corrected this to mention QUIC for HTTP/3, which is standardized in RFC 9114.
- The CoAP header-size row implied the entire header is always 4 bytes. I corrected this to "4-byte base header" because the fixed 4-byte header can be followed by token and options in RFC 7252.
- The message-type descriptions overstated CoAP reliability, treated ACK as the response itself, and described RST as a generic error response. I corrected these to match RFC 7252 semantics: CON uses ACK/retransmission at the message layer, ACK may carry a piggybacked response, and RST indicates missing context or inability to process the received message.
- The server example used `content_format=0` and `asyncio.get_event_loop()` in the long-running server loop. I updated the snippet to use `ContentFormat.TEXT` from current aiocoap examples and `asyncio.get_running_loop()` per current Python asyncio guidance.
- The Observe example used `requester.observation.register_callback(...)`, which is deprecated in current aiocoap. I replaced it with the current pattern of awaiting the initial response and iterating over `requester.observation`.
- The secure CoAP note implied DTLS setup happens during context creation. I corrected it to note that aiocoap typically loads DTLS credentials into the context's `client_credentials` store before sending the request.

## Review Notes
- The post is technically relevant and code-centric, so it was reviewed as a guide rather than marked `not-code-blog`.
- `aiocoap` was not installed in the local environment, so I could not run the snippets against a live CoAP endpoint here. I did validate the edited Python snippets for syntax with `python3` and verified API usage against the official aiocoap documentation.
- Current aiocoap documentation notes that CoAPS/DTLS support is still experimental and incomplete. The post's secure CoAP section is now accurate, but readers should not assume the DTLS path is as mature as the plain UDP examples.
