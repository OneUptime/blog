# How to Implement SSL/TLS Over TCP Sockets Using OpenSSL in C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, IPv4, TLS, OpenSSL, SSL, POSIX, Networking

Description: Learn how to add TLS encryption to IPv4 TCP sockets in C using the OpenSSL library, covering TLS server setup, client connections, certificate loading, and secure data transfer.

## OpenSSL Initialization

```c
#include <openssl/ssl.h>
#include <openssl/err.h>
#include <stdio.h>
#include <stdlib.h>

/* OpenSSL 1.1.0+ initializes itself automatically; this is explicit and current. */
void init_openssl(void) {
    if (!OPENSSL_init_ssl(0, NULL)) {
        fprintf(stderr, "OPENSSL_init_ssl failed\n");
        ERR_print_errors_fp(stderr);
        exit(EXIT_FAILURE);
    }
}

/* Print OpenSSL error queue and optionally exit */
void openssl_fatal(const char *msg) {
    fprintf(stderr, "%s\n", msg);
    ERR_print_errors_fp(stderr);
    exit(EXIT_FAILURE);
}
```

## TLS Server

```c
#include <openssl/ssl.h>
#include <openssl/err.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <string.h>
#include <stdio.h>

#define PORT     8443
#define CERTFILE "server.crt"
#define KEYFILE  "server.key"

SSL_CTX *create_server_ctx(void) {
    /* TLS_server_method() uses a version-flexible TLS method */
    SSL_CTX *ctx = SSL_CTX_new(TLS_server_method());
    if (!ctx) openssl_fatal("SSL_CTX_new failed");

    /* Load the server certificate and private key */
    if (SSL_CTX_use_certificate_file(ctx, CERTFILE, SSL_FILETYPE_PEM) <= 0)
        openssl_fatal("Cannot load certificate");

    if (SSL_CTX_use_PrivateKey_file(ctx, KEYFILE, SSL_FILETYPE_PEM) <= 0)
        openssl_fatal("Cannot load private key");

    /* Verify that the private key matches the certificate */
    if (!SSL_CTX_check_private_key(ctx))
        openssl_fatal("Private key does not match certificate");

    return ctx;
}

int main(void) {
    init_openssl();
    SSL_CTX *ctx = create_server_ctx();

    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr = {0};
    addr.sin_family      = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port        = htons(PORT);
    bind(server_fd, (struct sockaddr *)&addr, sizeof(addr));
    listen(server_fd, 10);

    printf("TLS server listening on port %d\n", PORT);

    while (1) {
        int client_fd = accept(server_fd, NULL, NULL);
        if (client_fd < 0) { perror("accept"); continue; }

        /* Wrap the TCP socket in a TLS session */
        SSL *ssl = SSL_new(ctx);
        SSL_set_fd(ssl, client_fd);

        if (SSL_accept(ssl) <= 0) {
            ERR_print_errors_fp(stderr);
            SSL_free(ssl);
            close(client_fd);
            continue;
        }

        printf("TLS handshake OK: %s\n", SSL_get_cipher(ssl));

        char buf[1024];
        int  n = SSL_read(ssl, buf, sizeof(buf) - 1);
        if (n > 0) {
            buf[n] = '\0';
            printf("Received: %s\n", buf);
            SSL_write(ssl, "Hello from TLS server!\n", 23);
        }

        SSL_shutdown(ssl);
        SSL_free(ssl);
        close(client_fd);
    }

    close(server_fd);
    SSL_CTX_free(ctx);
    return 0;
}
```

## TLS Client

```c
#include <openssl/ssl.h>
#include <openssl/err.h>
#include <openssl/x509_vfy.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdio.h>

SSL_CTX *create_client_ctx(void) {
    SSL_CTX *ctx = SSL_CTX_new(TLS_client_method());
    if (!ctx) openssl_fatal("SSL_CTX_new failed");

    /* Load the CA certificate to verify the server's certificate */
    if (SSL_CTX_load_verify_locations(ctx, "ca.crt", NULL) <= 0)
        openssl_fatal("Cannot load CA certificate");

    /* Require certificate verification */
    SSL_CTX_set_verify(ctx, SSL_VERIFY_PEER, NULL);
    return ctx;
}

int main(void) {
    init_openssl();
    SSL_CTX *ctx = create_client_ctx();

    int fd = socket(AF_INET, SOCK_STREAM, 0);

    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_port   = htons(8443);
    inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr);
    connect(fd, (struct sockaddr *)&addr, sizeof(addr));

    SSL *ssl = SSL_new(ctx);
    SSL_set_fd(ssl, fd);

    /* Set SNI and the expected hostname for certificate verification */
    if (!SSL_set_tlsext_host_name(ssl, "localhost"))
        openssl_fatal("Cannot set SNI hostname");

    if (!SSL_set1_host(ssl, "localhost"))
        openssl_fatal("Cannot set verification hostname");

    if (SSL_connect(ssl) <= 0) {
        openssl_fatal("TLS handshake failed");
    }

    long verify_result = SSL_get_verify_result(ssl);
    if (verify_result != X509_V_OK) {
        fprintf(stderr, "Certificate verification failed: %s\n",
                X509_verify_cert_error_string(verify_result));
        exit(EXIT_FAILURE);
    }

    printf("Connected: cipher=%s protocol=%s\n",
           SSL_get_cipher(ssl), SSL_get_version(ssl));

    /* Display the verified server certificate */
    X509 *cert = SSL_get1_peer_certificate(ssl);
    if (!cert) fprintf(stderr, "No server certificate presented\n");
    else {
        char subj[256];
        X509_NAME_oneline(X509_get_subject_name(cert), subj, sizeof(subj));
        printf("Server cert: %s\n", subj);
        X509_free(cert);
    }

    SSL_write(ssl, "Hello, TLS!\n", 12);

    char buf[256];
    int n = SSL_read(ssl, buf, sizeof(buf) - 1);
    if (n > 0) { buf[n] = '\0'; printf("Server: %s", buf); }

    SSL_shutdown(ssl);
    SSL_free(ssl);
    close(fd);
    SSL_CTX_free(ctx);
    return 0;
}
```

## Generate Self-Signed Certificate for Testing

```bash
# Generate a private key and self-signed certificate

openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt \
    -days 365 -noenc -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Use server.crt as the CA certificate on the client side
cp server.crt ca.crt
```

## Compile

```bash
gcc -Wall -o tls_server tls_server.c -lssl -lcrypto
gcc -Wall -o tls_client tls_client.c -lssl -lcrypto
```

## Conclusion

OpenSSL wraps a TCP socket in a TLS session: create an `SSL_CTX` with `TLS_server_method()` or `TLS_client_method()`, load certificate files, create an `SSL` object, bind it to the socket fd with `SSL_set_fd()`, then call `SSL_accept()` (server) or `SSL_connect()` (client) to perform the TLS handshake. Use `SSL_read()`/`SSL_write()` instead of `recv()`/`send()`. After a successful TLS connection, call `SSL_shutdown()` before `close()` to send the TLS close-notify alert. Configure hostname verification with `SSL_set1_host()`, require peer verification, and check `SSL_get_verify_result()` on the client side to prevent MITM attacks.
