# Validation Summary: How to Implement SSL/TLS Over TCP Sockets Using OpenSSL in C

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- C
- POSIX IPv4 TCP sockets
- OpenSSL libssl/libcrypto
- TLS 1.2 and TLS 1.3
- X.509 certificates
- OpenSSL command-line tooling

## Sources Consulted
- OpenSSL `OPENSSL_init_ssl(3)` documentation: https://docs.openssl.org/3.6/man3/OPENSSL_init_ssl/
- OpenSSL `SSL_CTX_new(3)` documentation: https://docs.openssl.org/3.6/man3/SSL_CTX_new/
- OpenSSL `SSL_CTX_set_verify(3)` documentation: https://docs.openssl.org/3.6/man3/SSL_CTX_set_verify/
- OpenSSL `SSL_set1_host(3)` documentation: https://docs.openssl.org/3.6/man3/SSL_set1_host/
- OpenSSL SNI documentation for `SSL_set_tlsext_host_name()`: https://docs.openssl.org/3.6/man3/SSL_CTX_set_tlsext_servername_callback/
- OpenSSL `SSL_get_peer_certificate(3)` documentation: https://docs.openssl.org/3.6/man3/SSL_get_peer_certificate/
- OpenSSL `SSL_get_verify_result(3)` documentation: https://docs.openssl.org/3.6/man3/SSL_get_verify_result/
- OpenSSL `SSL_set_fd(3)` documentation: https://docs.openssl.org/3.6/man3/SSL_set_fd/
- OpenSSL `SSL_shutdown(3)` documentation: https://docs.openssl.org/3.6/man3/SSL_shutdown/
- OpenSSL `openssl-req(1)` documentation: https://docs.openssl.org/3.6/man1/openssl-req/
- Local verification with OpenSSL 3.0.13 `openssl version -a`, `openssl req -help`, and GCC 13.3.0 syntax checks.

## Issues Found
- The initialization snippet used `SSL_library_init()`, `SSL_load_error_strings()`, and `OpenSSL_add_all_algorithms()`, which are deprecated in modern OpenSSL. Replaced them with `OPENSSL_init_ssl(0, NULL)` and added the missing standard C headers used by the helper functions.
- The server comment said `TLS_server_method()` supports TLS 1.2 and 1.3. Updated it to describe the method as version-flexible, matching the OpenSSL documentation.
- The server called `SSL_shutdown()` even after `SSL_accept()` failed. Updated the failure path to free the `SSL` object, close the client socket, and continue without attempting TLS shutdown on a failed handshake.
- The client set SNI but did not configure hostname verification. Added `SSL_set1_host(ssl, "localhost")` so certificate verification checks the expected hostname.
- The client retrieved and printed the server certificate as if that verified it. Added an explicit `SSL_get_verify_result()` check and changed certificate retrieval to `SSL_get1_peer_certificate()`, the current OpenSSL 3.x API.
- The test certificate command used deprecated `openssl req -nodes` and generated a certificate without a subjectAltName extension. Replaced `-nodes` with `-noenc` and added `-addext "subjectAltName=DNS:localhost,IP:127.0.0.1"`.
- The conclusion advised `SSL_get_peer_certificate()` and `SSL_get_verify_result()` for MITM protection. Updated it to emphasize hostname verification with `SSL_set1_host()`, peer verification, and `SSL_get_verify_result()`.

## Review Notes
The updated C snippets were extracted from the Markdown and checked with `gcc -Wall -Wextra -Werror=deprecated-declarations -fsyntax-only` against the local OpenSSL 3.0 headers. The updated certificate command was run in a temporary directory and produced the expected SAN extension. The example remains intentionally minimal; production code should also check all socket syscall return values and handle `SSL_read()`/`SSL_write()` errors with `SSL_get_error()`.
