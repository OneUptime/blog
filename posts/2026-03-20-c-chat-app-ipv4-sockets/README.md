# How to Implement a Chat Application Using IPv4 Sockets in C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, Socket, IPv4, TCP, Chat, POSIX, Select(), Networking

Description: Build a multi-client chat server and terminal client in C using POSIX TCP sockets and select() for multiplexing multiple IPv4 connections.

## Introduction

Building a chat application in C using POSIX sockets teaches the fundamentals of TCP socket programming, I/O multiplexing with `select()`, and the client-server model. This implementation handles multiple clients simultaneously using `select()` to monitor multiple file descriptors.

## Chat Server (C)

```c
/* chat_server.c */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/select.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#define PORT 3000
#define MAX_CLIENTS 30
#define BUFFER_SIZE 1024

int send_all(int fd, const char *buffer, size_t length) {
    size_t total = 0;

    while (total < length) {
        ssize_t sent = send(fd, buffer + total, length - total, 0);
        if (sent <= 0) return -1;
        total += (size_t) sent;
    }

    return 0;
}

int main() {
    int server_fd;
    int client_fds[MAX_CLIENTS];
    fd_set read_fds;
    char buffer[BUFFER_SIZE];
    int max_fd;
    struct sockaddr_in server_addr, client_addr;
    socklen_t client_len = sizeof(client_addr);
    
    /* Initialize client array */
    for (int i = 0; i < MAX_CLIENTS; i++) client_fds[i] = 0;

    /* Prevent a disconnected client from terminating the server on send() */
    if (signal(SIGPIPE, SIG_IGN) == SIG_ERR) {
        perror("signal"); exit(1);
    }
    
    /* Create server socket */
    server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) { perror("socket"); exit(1); }
    
    /* Allow port reuse */
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    
    /* Bind to IPv4 port */
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family      = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port        = htons(PORT);
    
    if (bind(server_fd, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        perror("bind"); exit(1);
    }
    
    if (listen(server_fd, 10) < 0) { perror("listen"); exit(1); }
    
    printf("Chat server listening on port %d\n", PORT);
    
    while (1) {
        FD_ZERO(&read_fds);
        FD_SET(server_fd, &read_fds);
        max_fd = server_fd;
        
        /* Add all active client sockets to the select set */
        for (int i = 0; i < MAX_CLIENTS; i++) {
            if (client_fds[i] > 0) {
                FD_SET(client_fds[i], &read_fds);
                if (client_fds[i] > max_fd) max_fd = client_fds[i];
            }
        }
        
        /* Wait for activity on any socket */
        if (select(max_fd + 1, &read_fds, NULL, NULL, NULL) < 0) {
            perror("select"); break;
        }
        
        /* New connection on the server socket */
        if (FD_ISSET(server_fd, &read_fds)) {
            int new_fd = accept(server_fd, (struct sockaddr*)&client_addr, &client_len);
            if (new_fd < 0) { perror("accept"); continue; }
            
            printf("New connection: %s:%d\n",
                   inet_ntoa(client_addr.sin_addr),
                   ntohs(client_addr.sin_port));
            
            /* Add to client array */
            for (int i = 0; i < MAX_CLIENTS; i++) {
                if (client_fds[i] == 0) {
                    client_fds[i] = new_fd;
                    char welcome[] = "Welcome to the chat!\n";
                    if (send_all(new_fd, welcome, strlen(welcome)) < 0) {
                        close(new_fd);
                        client_fds[i] = 0;
                    }
                    break;
                }
            }
        }
        
        /* Check each client for activity */
        for (int i = 0; i < MAX_CLIENTS; i++) {
            int fd = client_fds[i];
            if (fd == 0 || !FD_ISSET(fd, &read_fds)) continue;
            
            int n = recv(fd, buffer, BUFFER_SIZE - 1, 0);
            
            if (n <= 0) {
                /* Client disconnected */
                getpeername(fd, (struct sockaddr*)&client_addr, &client_len);
                printf("Client %s:%d disconnected\n",
                       inet_ntoa(client_addr.sin_addr),
                       ntohs(client_addr.sin_port));
                close(fd);
                client_fds[i] = 0;
            } else {
                /* Broadcast to all other clients */
                buffer[n] = '\0';
                for (int j = 0; j < MAX_CLIENTS; j++) {
                    if (client_fds[j] != 0 && client_fds[j] != fd) {
                        if (send_all(client_fds[j], buffer, (size_t) n) < 0) {
                            close(client_fds[j]);
                            client_fds[j] = 0;
                        }
                    }
                }
            }
        }
    }
    
    close(server_fd);
    return 0;
}
```

## Chat Client (C)

```c
/* chat_client.c */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/select.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#define PORT 3000
#define BUFFER_SIZE 1024

int send_all(int fd, const char *buffer, size_t length) {
    size_t total = 0;

    while (total < length) {
        ssize_t sent = send(fd, buffer + total, length - total, 0);
        if (sent <= 0) return -1;
        total += (size_t) sent;
    }

    return 0;
}

int main(int argc, char *argv[]) {
    int sock_fd;
    struct sockaddr_in server_addr;
    char buffer[BUFFER_SIZE];
    fd_set fds;
    
    if (argc != 2) {
        fprintf(stderr, "Usage: %s <server-ip>\n", argv[0]);
        return 1;
    }
    
    /* Create socket */
    sock_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (sock_fd < 0) { perror("socket"); return 1; }
    
    /* Connect to server */
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_port   = htons(PORT);
    
    if (inet_pton(AF_INET, argv[1], &server_addr.sin_addr) <= 0) {
        fprintf(stderr, "Invalid address: %s\n", argv[1]);
        return 1;
    }
    
    if (connect(sock_fd, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        perror("connect"); return 1;
    }
    
    printf("Connected to %s:%d\n", argv[1], PORT);
    
    while (1) {
        FD_ZERO(&fds);
        FD_SET(STDIN_FILENO, &fds);   /* Watch stdin */
        FD_SET(sock_fd, &fds);         /* Watch socket */
        
        if (select(sock_fd + 1, &fds, NULL, NULL, NULL) < 0) {
            perror("select"); break;
        }
        
        /* Data from server */
        if (FD_ISSET(sock_fd, &fds)) {
            int n = recv(sock_fd, buffer, BUFFER_SIZE - 1, 0);
            if (n <= 0) { printf("Server disconnected\n"); break; }
            buffer[n] = '\0';
            printf("%s", buffer);
            fflush(stdout);
        }
        
        /* Data from stdin (user typed something) */
        if (FD_ISSET(STDIN_FILENO, &fds)) {
            if (!fgets(buffer, BUFFER_SIZE, stdin)) break;
            if (send_all(sock_fd, buffer, strlen(buffer)) < 0) {
                perror("send"); break;
            }
        }
    }
    
    close(sock_fd);
    return 0;
}
```

## Compiling and Running

```bash
# Compile server and client

gcc -o chat_server chat_server.c
gcc -o chat_client chat_client.c

# Start the server
./chat_server

# Connect clients (in separate terminals)
./chat_client 127.0.0.1
./chat_client 127.0.0.1
```

## Conclusion

This C chat server demonstrates the classic `select()`-based I/O multiplexing pattern for handling multiple TCP connections in a single thread. It is the foundation for understanding event-driven servers, and the same pattern (adapted) underlies most production network servers.
