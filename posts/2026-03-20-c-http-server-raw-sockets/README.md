# How to Implement a Simple HTTP Server Using Raw Sockets in C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, Socket, HTTP, IPv4, Networking, Systems Programming

Description: Build a minimal HTTP/1.0 server in C using raw POSIX sockets that accepts TCP connections on IPv4, parses request lines, and returns HTTP responses.

## Introduction

Understanding how HTTP works at the socket level gives you insight into every web framework and server. Building a minimal HTTP server in C using POSIX sockets strips away the abstraction and shows exactly what happens when a client connects to the server port.

## Complete HTTP Server

```c
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#define PORT 8080
#define BUFFER_SIZE 4096

int send_all(int client_fd, const char *buffer, size_t length) {
    size_t total = 0;

    while (total < length) {
        ssize_t sent = send(client_fd, buffer + total, length - total, 0);
        if (sent < 0) {
            if (errno == EINTR) continue;
            return -1;
        }
        if (sent == 0) return -1;
        total += (size_t)sent;
    }

    return 0;
}

ssize_t recv_request(int client_fd, char *buffer, size_t size) {
    size_t total = 0;

    while (total < size - 1) {
        ssize_t bytes = recv(client_fd, buffer + total, size - 1 - total, 0);
        if (bytes < 0) {
            if (errno == EINTR) continue;
            return -1;
        }
        if (bytes == 0) break;

        total += (size_t)bytes;
        buffer[total] = '\0';

        if (strstr(buffer, "\r\n\r\n") != NULL || strstr(buffer, "\n\n") != NULL) {
            return (ssize_t)total;
        }
    }

    return total == 0 ? 0 : -1;
}

void send_response(int client_fd, const char *status, const char *content_type, const char *body) {
    char response[512];
    int response_len = snprintf(response, sizeof(response),
        "HTTP/1.0 %s\r\n"
        "Content-Type: %s\r\n"
        "Content-Length: %zu\r\n"
        "Connection: close\r\n\r\n%s",
        status, content_type, strlen(body), body);

    if (response_len < 0 || (size_t)response_len >= sizeof(response)) return;
    send_all(client_fd, response, (size_t)response_len);
}

void handle_client(int client_fd) {
    char buffer[BUFFER_SIZE];
    ssize_t bytes = recv_request(client_fd, buffer, sizeof(buffer));
    if (bytes <= 0) { close(client_fd); return; }

    char method[8] = {0}, path[256] = {0}, proto[16] = {0};
    if (sscanf(buffer, "%7s %255s %15s", method, path, proto) != 3) {
        send_response(client_fd, "400 Bad Request", "text/plain", "Bad Request\n");
        close(client_fd);
        return;
    }
    printf("Request: %s %s\n", method, path);

    const char *body = "<html><body><h1>Hello from C!</h1></body></html>";
    send_response(client_fd, "200 OK", "text/html", body);
    close(client_fd);
}

int main(void) {
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("socket");
        return 1;
    }

    int opt = 1;
    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        perror("setsockopt");
        close(server_fd);
        return 1;
    }

    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_addr.s_addr = INADDR_ANY,
        .sin_port = htons(PORT)
    };
    if (bind(server_fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("bind");
        close(server_fd);
        return 1;
    }

    if (listen(server_fd, 10) < 0) {
        perror("listen");
        close(server_fd);
        return 1;
    }

    printf("HTTP server listening on port %d\n", PORT);

    while (1) {
        struct sockaddr_in client_addr;
        socklen_t len = sizeof(client_addr);
        int client_fd = accept(server_fd, (struct sockaddr *)&client_addr, &len);
        if (client_fd < 0) {
            perror("accept");
            continue;
        }
        handle_client(client_fd);
    }
    return 0;
}
```

## Compile and Test

```bash
gcc -o http_server http_server.c
./http_server &
curl http://127.0.0.1:8080/
```

## Serving Static Files

Extend `handle_client` to open local files based on the parsed path and stream their contents with a correct `Content-Length` header. Return a 404 response when the file does not exist.

## Conclusion

A socket-based HTTP server in C demonstrates TCP socket lifecycle, HTTP framing, and response construction without any library magic. While production servers use non-blocking I/O and thread pools, this sequential model is an excellent learning foundation.
