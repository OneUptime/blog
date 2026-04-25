# How to Build a Port Scanner in Python Using IPv4 Sockets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Port Scanner, Socket, IPv4, Security, Networking

Description: Learn how to build a multi-threaded TCP port scanner in Python using IPv4 sockets to discover open ports on a target host.

## How Port Scanning Works

A TCP port scanner attempts a TCP connection to each port. If the connection succeeds, the port is open. If the OS refuses the connection, the port is closed. A timeout often means traffic is being dropped or filtered, though other network issues can also cause it.

## Simple Sequential Port Scanner

```python
import socket

def scan_port(host: str, port: int, timeout: float = 1.0) -> bool:
    """Return True if the port is open, False otherwise."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        # connect_ex returns 0 on success, error code on failure
        return result == 0


# Scan common ports on localhost

target = "127.0.0.1"
common_ports = [22, 80, 443, 3000, 3306, 5432, 6379, 8080, 8443, 27017]

print(f"Scanning {target}...")
for port in common_ports:
    status = "OPEN" if scan_port(target, port) else "closed"
    if status == "OPEN":
        print(f"  Port {port}: {status}")
```

## Multi-Threaded Port Scanner

Sequential scanning is slow. Threading dramatically speeds it up:

```python
import socket
import threading
from queue import Queue

def worker(host: str, port_queue: Queue, open_ports: list, timeout: float) -> None:
    """Thread worker: pull ports from queue and scan them."""
    while True:
        port = port_queue.get()
        if port is None:
            port_queue.task_done()
            break   # Poison pill to stop the thread

        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(timeout)
                if sock.connect_ex((host, port)) == 0:
                    open_ports.append(port)
        except OSError:
            pass
        finally:
            port_queue.task_done()


def scan_host(host: str, start_port: int = 1, end_port: int = 1024,
              num_threads: int = 200, timeout: float = 0.5) -> list[int]:
    """Scan a range of ports using multiple threads."""
    port_queue: Queue = Queue()
    open_ports: list = []
    lock = threading.Lock()
    thread_safe_open_ports: list = []

    def safe_worker():
        while True:
            port = port_queue.get()
            if port is None:
                port_queue.task_done()
                break
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                    sock.settimeout(timeout)
                    if sock.connect_ex((host, port)) == 0:
                        with lock:
                            thread_safe_open_ports.append(port)
            except OSError:
                pass
            finally:
                port_queue.task_done()

    # Start worker threads
    threads = []
    for _ in range(num_threads):
        t = threading.Thread(target=safe_worker, daemon=True)
        t.start()
        threads.append(t)

    # Enqueue all ports to scan
    for port in range(start_port, end_port + 1):
        port_queue.put(port)

    # Wait for all ports to be processed
    port_queue.join()

    # Send poison pills to stop threads
    for _ in threads:
        port_queue.put(None)
    for t in threads:
        t.join()

    return sorted(thread_safe_open_ports)


# Example usage
if __name__ == "__main__":
    import sys

    target = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"
    print(f"Scanning {target} (ports 1-1024)...")

    open_ports = scan_host(target, 1, 1024, num_threads=200)

    print(f"\nOpen ports on {target}:")
    for port in open_ports:
        try:
            service = socket.getservbyport(port, "tcp")
        except OSError:
            service = "unknown"
        print(f"  {port}/tcp  {service}")
```

## Banner Grabbing

Identify services by reading their greeting banner:

```python
def grab_banner(host: str, port: int, timeout: float = 2.0) -> str:
    """Attempt to read the service banner on an open port."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(timeout)
            sock.connect((host, port))
            # Send a newline to trigger a response from some services
            sock.sendall(b"\r\n")
            banner = sock.recv(1024)
            return banner.decode("utf-8", errors="replace").strip()
    except (socket.timeout, ConnectionRefusedError, OSError):
        return ""
```

## Responsible Use

Port scanning your own systems or systems you have explicit permission to test is legal and valuable. Scanning systems without authorization may violate computer crime laws. Always obtain written permission before scanning production or third-party hosts.

## Conclusion

A Python port scanner uses `connect_ex()` with socket timeouts to test whether a TCP port accepts connections. Threading and a work queue dramatically reduce scan time. For production security work, use dedicated tools like `nmap` which offer SYN scanning, OS fingerprinting, and many other capabilities.
