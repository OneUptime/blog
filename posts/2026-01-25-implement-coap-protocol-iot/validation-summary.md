# Validation Summary: How to Implement CoAP Protocol for IoT

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CoAP
- IoT protocols
- UDP
- DTLS / CoAPS
- Python
- aiocoap
- FastAPI
- Pydantic
- CoAP Observe
- CoAP block-wise transfers

## Sources Consulted
- RFC 7252, The Constrained Application Protocol (CoAP): https://datatracker.ietf.org/doc/html/rfc7252
- RFC 7959, Block-Wise Transfers in CoAP: https://datatracker.ietf.org/doc/html/rfc7959
- IANA Constrained RESTful Environments (CoRE) Parameters registry: https://www.iana.org/assignments/core-parameters/core-parameters.xhtml
- aiocoap 0.4.17 documentation, examples: https://aiocoap.readthedocs.io/en/latest/examples.html
- aiocoap 0.4.17 protocol API documentation: https://aiocoap.readthedocs.io/en/latest/module/aiocoap.protocol.html
- aiocoap 0.4.17 credentials documentation: https://aiocoap.readthedocs.io/en/latest/module/aiocoap.credentials.html
- aiocoap TinyDTLS transport documentation/source notes: https://aiocoap.readthedocs.io/en/latest/module/aiocoap.transports.tinydtls.html
- aiocoap TinyDTLS server documentation: https://aiocoap.readthedocs.io/en/latest/module/aiocoap.transports.tinydtls_server.html
- FastAPI lifespan events documentation: https://fastapi.tiangolo.com/advanced/events/
- Local syntax and API checks using Python 3 with aiocoap 0.4.17 installed in `/tmp/coap-review-aiocoap`.

## Issues Found
- The `TemperatureResource.render_put()` method returned no CoAP response when the JSON body omitted `value`. Added an explicit `4.00 Bad Request` response for the missing field.
- The client `discover()` method could return `None` for a non-successful discovery response despite being documented as returning a list. Added an empty-list return for that path.
- The observe client had a `stop_observation()` method but never stored the observation object, so cancellation would not work. Stored `observation_request.observation` and iterated over that stored object.
- The DTLS client credentials used a dictionary shape that aiocoap 0.4.17 rejects. Replaced it with the documented `psk` and `client-identity` fields using bytes values.
- The DTLS server example only returned a credentials map and used an invalid PSK identity mapping shape. Updated it to create a secure server context on port 5684 with `server_credentials` and the `tinydtls_server` transport.
- The FastAPI gateway used `@app.on_event("startup")`, which FastAPI now documents as deprecated in favor of lifespan handlers. Replaced it with an `asynccontextmanager` lifespan and added shutdown of the aiocoap context.
- The Pydantic model used `None` defaults for non-optional fields. Changed those fields to `Optional[...]` to match the values accepted by the model.

## Review Notes
The core CoAP protocol descriptions, message header layout, default ports, content-format numbers for `application/link-format` and `application/json`, observe discussion, and block-wise transfer explanation align with RFC 7252, RFC 7959, IANA registrations, and aiocoap 0.4.17 behavior. aiocoap's CoAPS server support is documented as experimental and requires the DTLS server transport to be enabled explicitly, so production deployments should test that path carefully.
