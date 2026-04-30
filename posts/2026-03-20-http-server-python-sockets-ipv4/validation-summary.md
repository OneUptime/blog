# Validation Summary: How to Build a Simple HTTP Server Using Python Sockets and IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python `socket` module
- Python `threading` module
- HTTP/1.1
- IPv4
- `curl`

## Sources Consulted
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Python `http.server` documentation: https://docs.python.org/3/library/http.server.html
- RFC 9112, HTTP/1.1: https://www.rfc-editor.org/rfc/rfc9112.html
- RFC 9110, HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110
- Gunicorn documentation: https://docs.gunicorn.org/en/stable/
- Uvicorn documentation: https://www.uvicorn.org/

## Issues Found
- The request parser returned `("GET", "/", {})` on parse errors, which could turn malformed requests into a false `200 OK` on `/`. I changed it to raise a parse error and return `400 Bad Request`, which matches RFC 9112 guidance for invalid HTTP messages.
- The sample returned `405 Method Not Allowed` without an `Allow` header. I updated the response builder so the sample can send `Allow: GET`, which RFC 9110 requires for `405` responses.
- The routing logic used `405` for any method outside `GET` and `POST`, even when the method was not implemented for the server at all. I changed those cases to `501 Not Implemented`, and limited `405` to `POST` requests against the existing `GET`-only routes.
- The production note described Python's built-in `http.server` as a proper WSGI/ASGI production option. I corrected that line because `http.server` is neither a WSGI/ASGI server nor recommended for production by the Python documentation.
- The startup log printed `http://0.0.0.0:8080` as though `0.0.0.0` were the client-facing URL. I changed it to say the server is listening on that address, which is the accurate meaning of a bind-all-interfaces IPv4 address.

## Review Notes
- No remaining technical issues found after the fixes above.
- The sample is still intentionally simplified and assumes the request fits in a single `recv`, which the post already calls out.
- The example was also verified locally with `python3` and `curl` for `200`, `400`, `405`, `404`, and `501` responses.
