# How to Create a UDP Broadcast Sender and Receiver in C

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: C, UDP, Broadcast, IPv4, Socket, Networking

Description: Create a UDP broadcast sender and receiver in C using the SO_BROADCAST socket option to send datagrams to all hosts on the local subnet.

## Introduction

UDP broadcast allows a single packet to reach every host on a subnet simultaneously. This is a common building block for bootstrap and discovery mechanisms like DHCP and many IoT discovery mechanisms.

## UDP Broadcast Sender

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#define BROADCAST_IP "192.168.1.255"
#define PORT 9999
#define MESSAGE "HELLO BROADCAST"

int main(void) {
    int fd = socket(AF_INET, SOCK_DGRAM, 0);

    /* Enable broadcast */
    int enable = 1;
    setsockopt(fd, SOL_SOCKET, SO_BROADCAST, &enable, sizeof(enable));

    struct sockaddr_in dest = {
        .sin_family = AF_INET,
        .sin_port = htons(PORT)
    };
    inet_pton(AF_INET, BROADCAST_IP, &dest.sin_addr);

    for (int i = 0; i < 5; i++) {
        sendto(fd, MESSAGE, strlen(MESSAGE), 0,
               (struct sockaddr *)&dest, sizeof(dest));
        printf("Broadcast sent: %s\n", MESSAGE);
        sleep(1);
    }
    close(fd);
    return 0;
}
```

## UDP Broadcast Receiver

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#define PORT 9999
#define BUFFER_SIZE 256

int main(void) {
    int fd = socket(AF_INET, SOCK_DGRAM, 0);

    int reuse = 1;
    setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_addr.s_addr = INADDR_ANY,
        .sin_port = htons(PORT)
    };
    bind(fd, (struct sockaddr *)&addr, sizeof(addr));
    printf("Listening for broadcasts on port %d\n", PORT);

    while (1) {
        char buf[BUFFER_SIZE];
        struct sockaddr_in sender;
        socklen_t len = sizeof(sender);
        ssize_t n = recvfrom(fd, buf, sizeof(buf) - 1, 0,
                             (struct sockaddr *)&sender, &len);
        if (n > 0) {
            buf[n] = '\0';
            printf("From %s:%d - %s\n",
                   inet_ntoa(sender.sin_addr),
                   ntohs(sender.sin_port), buf);
        }
    }
    close(fd);
    return 0;
}
```

## Compile and Test

```bash
gcc -o sender sender.c
gcc -o receiver receiver.c

# Terminal 1

./receiver

# Terminal 2
./sender
```

## Finding the Broadcast Address

```bash
# Show broadcast address for each interface
ip addr show | grep "brd"

# Or use ipcalc
ipcalc 192.168.1.100/24 | grep Broadcast
```

## Conclusion

UDP broadcast in C requires only the `SO_BROADCAST` socket option on the sender side. The receiver binds to `INADDR_ANY` on the same port. This pattern underpins service-discovery and network-announcement protocols across IPv4 LANs.
