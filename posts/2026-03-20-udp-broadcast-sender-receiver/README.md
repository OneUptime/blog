# How to Create a UDP Broadcast Sender and Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, UDP, Broadcast, SO_BROADCAST, Socket, POSIX, Networking

Description: Learn how to send and receive IPv4 UDP broadcast datagrams in C and Python using SO_BROADCAST, the limited broadcast address 255.255.255.255, and subnet-directed broadcasts.

## Broadcast Address Types

| Address | Scope |
|---------|-------|
| `255.255.255.255` | Limited broadcast - stays on local link (not forwarded) |
| `192.168.1.255` | Directed broadcast - all hosts in `192.168.1.0/24` |
| `10.0.0.255` | Directed broadcast - all hosts in `10.0.0.0/24` |

## UDP Broadcast Sender in C

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>

#define BCAST_ADDR "255.255.255.255"
#define BCAST_PORT 9000

int main(void) {
    int fd = socket(AF_INET, SOCK_DGRAM, 0);

    /* Must enable SO_BROADCAST - the kernel blocks broadcast sends by default */
    int opt = 1;
    if (setsockopt(fd, SOL_SOCKET, SO_BROADCAST, &opt, sizeof(opt)) < 0) {
        perror("SO_BROADCAST"); return 1;
    }

    struct sockaddr_in dest = {0};
    dest.sin_family = AF_INET;
    dest.sin_port   = htons(BCAST_PORT);
    inet_pton(AF_INET, BCAST_ADDR, &dest.sin_addr);

    for (int i = 0; i < 5; i++) {
        char msg[64];
        snprintf(msg, sizeof(msg), "Broadcast message #%d", i + 1);
        ssize_t n = sendto(fd, msg, strlen(msg), 0,
                           (struct sockaddr *)&dest, sizeof(dest));
        if (n < 0) { perror("sendto"); break; }
        printf("Sent: %s\n", msg);
        sleep(1);
    }

    close(fd);
    return 0;
}
```

## UDP Broadcast Receiver in C

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>

#define BCAST_PORT 9000
#define BUFSIZE    1024

int main(void) {
    int fd = socket(AF_INET, SOCK_DGRAM, 0);

    /* Allow multiple receivers on the same port */
    int opt = 1;
    setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    /* Bind to INADDR_ANY to receive both unicast and broadcast */
    struct sockaddr_in addr = {0};
    addr.sin_family      = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_ANY);
    addr.sin_port        = htons(BCAST_PORT);

    if (bind(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("bind"); return 1;
    }

    printf("Waiting for broadcast on port %d...\n", BCAST_PORT);

    char buf[BUFSIZE];
    while (1) {
        struct sockaddr_in sender;
        socklen_t          slen = sizeof(sender);
        ssize_t n = recvfrom(fd, buf, sizeof(buf) - 1, 0,
                             (struct sockaddr *)&sender, &slen);
        if (n < 0) { perror("recvfrom"); break; }
        buf[n] = '\0';

        char ip[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &sender.sin_addr, ip, sizeof(ip));
        printf("[%s:%d] %s\n", ip, ntohs(sender.sin_port), buf);
    }

    close(fd);
    return 0;
}
```

## UDP Broadcast in Python

```python
import socket
import time

BCAST_ADDR = "255.255.255.255"
BCAST_PORT = 9000

# --- Sender ---

def broadcast_sender():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    # Enable SO_BROADCAST - required for broadcast sends
    s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    for i in range(5):
        msg = f"Service available at port 8080 (seq={i})".encode()
        s.sendto(msg, (BCAST_ADDR, BCAST_PORT))
        print(f"Broadcast sent: {msg.decode()}")
        time.sleep(1)
    s.close()

# --- Receiver ---
def broadcast_receiver():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(("", BCAST_PORT))   # bind to all interfaces

    print(f"Listening for broadcasts on port {BCAST_PORT}")
    while True:
        data, addr = s.recvfrom(1024)
        print(f"[{addr[0]}:{addr[1]}] {data.decode()}")
```

## Service Discovery with Broadcast

```python
import socket
import json
import time

SERVICE_PORT = 9001

def announce_service(service_name: str, service_port: int):
    """Periodically broadcast a service announcement."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    payload = json.dumps({"name": service_name, "port": service_port}).encode()
    while True:
        s.sendto(payload, ("255.255.255.255", SERVICE_PORT))
        time.sleep(5)   # announce every 5 seconds

def discover_services(timeout: float = 6.0) -> list[dict]:
    """Listen for service announcements and return discovered services."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.settimeout(timeout)
    s.bind(("", SERVICE_PORT))
    services = []
    try:
        while True:
            data, addr = s.recvfrom(1024)
            info = json.loads(data)
            info["host"] = addr[0]
            services.append(info)
            print(f"Discovered: {info}")
    except socket.timeout:
        pass
    s.close()
    return services
```

## Conclusion

UDP broadcast requires setting `SO_BROADCAST` on the sender socket - the kernel blocks broadcast sends by default as a safety measure. Send to `255.255.255.255` for link-local broadcast or to the subnet's directed broadcast address (e.g., `192.168.1.255`) to reach all hosts in a specific subnet. Receivers bind to `INADDR_ANY` with `SO_REUSEADDR` to accept both unicast and broadcast datagrams on the same port. Broadcast is not routed between subnets - use multicast or a service registry for cross-subnet discovery. Use broadcast for lightweight LAN service discovery, avoiding the need for a central registry on small networks.
