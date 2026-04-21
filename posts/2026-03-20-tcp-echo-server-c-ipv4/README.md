# How to Write a TCP Echo Server in C Using IPv4 Sockets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, IPv4, TCP, Echo Server, Socket, Networking

Description: Learn how to write a TCP echo server in C using POSIX sockets with IPv4, covering socket creation, binding, listening, accepting connections, and echoing data back to clients.

## Complete TCP Echo Server

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>

#define PORT    9000
#define BACKLOG 10
#define BUFSIZE 4096

void handle_client(int client_fd, struct sockaddr_in *client_addr) {
    char   ip[INET_ADDRSTRLEN];
    char   buf[BUFSIZE];
    ssize_t n;

    inet_ntop(AF_INET, &client_addr->sin_addr, ip, sizeof(ip));
    printf("[+] Client: %s:%d\n", ip, ntohs(client_addr->sin_port));

    while ((n = recv(client_fd, buf, sizeof(buf), 0)) > 0) {
        /* Echo all received bytes back */
        ssize_t sent = 0;
        while (sent < n) {
            ssize_t s = send(client_fd, buf + sent, n - sent, 0);
            if (s <= 0) goto done;
            sent += s;
        }
    }

done:
    printf("[-] Client disconnected: %s:%d\n", ip, ntohs(client_addr->sin_port));
    close(client_fd);
}

int main(void) {
    int server_fd;
    struct sockaddr_in server_addr;
    int opt = 1;

    /* 1. Create TCP socket (IPv4) */
    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) < 0) {
        perror("socket");
        return 1;
    }

    /* 2. Allow reuse of address after restart */
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    /* 3. Bind to 0.0.0.0:9000 */
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family      = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;   /* 0.0.0.0 */
    server_addr.sin_port        = htons(PORT);

    if (bind(server_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0) {
        perror("bind");
        return 1;
    }

    /* 4. Listen for incoming connections */
    if (listen(server_fd, BACKLOG) < 0) {
        perror("listen");
        return 1;
    }

    printf("Echo server on 0.0.0.0:%d\n", PORT);

    /* 5. Accept and handle clients (iterative - one at a time) */
    while (1) {
        struct sockaddr_in client_addr;
        socklen_t          client_len = sizeof(client_addr);

        int client_fd = accept(server_fd,
                               (struct sockaddr *)&client_addr,
                               &client_len);
        if (client_fd < 0) {
            perror("accept");
            continue;
        }

        handle_client(client_fd, &client_addr);
    }

    close(server_fd);
    return 0;
}
```

## Compile and Run

```bash
gcc -Wall -Wextra -o echo_server echo_server.c
./echo_server

# Test with netcat

echo "Hello, server!" | nc -N 127.0.0.1 9000

# Or with telnet
telnet 127.0.0.1 9000
```

## Echo Client in C

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>

int main(void) {
    int    fd;
    struct sockaddr_in server;
    char   msg[] = "Hello, echo server!";
    char   buf[256];
    ssize_t n;

    fd = socket(AF_INET, SOCK_STREAM, 0);

    memset(&server, 0, sizeof(server));
    server.sin_family = AF_INET;
    server.sin_port   = htons(9000);
    inet_pton(AF_INET, "127.0.0.1", &server.sin_addr);

    if (connect(fd, (struct sockaddr *)&server, sizeof(server)) < 0) {
        perror("connect");
        return 1;
    }

    send(fd, msg, strlen(msg), 0);
    n = recv(fd, buf, sizeof(buf) - 1, 0);
    if (n > 0) {
        buf[n] = '\0';
        printf("Server: %s\n", buf);
    }

    close(fd);
    return 0;
}
```

## Key POSIX Socket Calls

| Function | Purpose |
|----------|---------|
| `socket(AF_INET, SOCK_STREAM, 0)` | Create TCP/IPv4 socket |
| `setsockopt(...SO_REUSEADDR...)` | Allow port reuse after restart |
| `bind(fd, addr, len)` | Assign local address and port |
| `listen(fd, backlog)` | Mark socket as passive |
| `accept(fd, addr, len)` | Block until a client connects |
| `recv(fd, buf, len, 0)` | Receive data (returns 0 on close) |
| `send(fd, buf, len, 0)` | Send data |
| `close(fd)` | Close socket |

## Conclusion

A C TCP echo server follows five steps: `socket()` → `setsockopt(SO_REUSEADDR)` → `bind()` → `listen()` → `accept()` loop. Always loop on `send()` to handle partial sends - the kernel may send fewer bytes than requested. Check `recv()` return value: `>0` means data received, `0` means connection closed by peer, `<0` means error. Use `inet_ntop()` for IP address formatting and `ntohs()`/`htons()` for port byte-order conversion. This iterative server handles one client at a time - see the multi-threaded post for concurrent handling.
