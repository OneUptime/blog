# Validation Summary: How to Implement a Simple HTTP Server Using Raw Sockets in C

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- C
- POSIX sockets
- TCP over IPv4
- HTTP/1.0
- curl
- GCC

## Sources Consulted
- The Open Group Base Specifications, `socket()`: https://pubs.opengroup.org/onlinepubs/9699919799/functions/socket.html
- The Open Group Base Specifications, `<sys/socket.h>` socket types: https://pubs.opengroup.org/onlinepubs/9799919799.2024edition/basedefs/sys_socket.h.html
- The Open Group Base Specifications, `recv()`: https://pubs.opengroup.org/onlinepubs/9799919799/functions/recv.html
- The Open Group Base Specifications, `send()`: https://pubs.opengroup.org/onlinepubs/000095399/functions/send.html
- The Open Group Base Specifications, `setsockopt()`: https://pubs.opengroup.org/onlinepubs/9699919799/functions/setsockopt.html
- The Open Group Base Specifications, `listen()`: https://pubs.opengroup.org/onlinepubs/009695099/functions/listen.html
- The Open Group Base Specifications, `accept()`: https://pubs.opengroup.org/onlinepubs/009604499/functions/accept.html
- The Open Group Base Specifications, `fscanf()` / `sscanf()`: https://pubs.opengroup.org/onlinepubs/000095399/functions/fscanf.html
- RFC 1945, Hypertext Transfer Protocol -- HTTP/1.0: https://datatracker.ietf.org/doc/html/rfc1945
- RFC 9112, HTTP/1.1: https://datatracker.ietf.org/doc/html/rfc9112
- curl documentation, "The Art Of Scripting HTTP Requests Using curl": https://curl.se/docs/httpscripting.html

## Issues Found
- The post described the example as using "raw sockets", but the code creates a `SOCK_STREAM` socket. I changed the title and surrounding prose to refer to POSIX/TCP sockets, which matches the API actually used.
- The original example assumed a single `recv()` call would contain a complete HTTP request. I changed the example to keep reading until the end of the HTTP headers before parsing, because stream sockets do not preserve message boundaries.
- The original example assumed one `send()` call would transmit the full response. I added a `send_all()` helper so the example handles partial writes correctly.
- The original example did not check the results of `sscanf()`, `socket()`, `setsockopt()`, `bind()`, `listen()`, or `accept()`. I added return-value checks and a `400 Bad Request` path to avoid undefined behavior and silent startup failures.
- The introduction referred to a browser connecting to port 80 even though the sample server listens on port 8080. I aligned the wording with the actual example.

## Review Notes
- The corrected code compiles cleanly with `gcc -std=c11 -Wall -Wextra -pedantic`.
- In this review environment, port `8080` was already in use by another service. The revised example now reports the `bind()` failure clearly instead of continuing without surfacing the error.
- The "Serving Static Files" suggestion is technically reasonable for a follow-up exercise, but any real implementation should sanitize request paths and derive `Content-Type` from the file being served.
