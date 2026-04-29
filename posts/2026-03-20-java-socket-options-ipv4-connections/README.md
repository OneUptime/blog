# How to Set Socket Options for IPv4 Connections in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Socket Options, IPv4, TCP, Performance, Networking, Socket

Description: Configure Java Socket and ServerSocket options like SO_TIMEOUT, SO_KEEPALIVE, TCP_NODELAY, SO_REUSEADDR, and buffer sizes for optimized IPv4 TCP connections.

## Introduction

Java's `Socket` and `ServerSocket` classes expose a range of socket options that control connection behavior, performance, and reliability. Properly configuring these options is essential for building production-grade networked applications.

## Common Socket Options

| Option | Socket Method | Description |
|--------|---------------|-------------|
| SO_TIMEOUT | `setSoTimeout(ms)` | Read timeout (0 = infinite) |
| TCP_NODELAY | `setTcpNoDelay(true)` | Disable Nagle's algorithm |
| SO_KEEPALIVE | `setKeepAlive(true)` | Enable TCP keepalive probes |
| SO_REUSEADDR | `setReuseAddress(true)` | Allow rebinding while a prior connection is in `TIME_WAIT` |
| SO_RCVBUF | `setReceiveBufferSize(bytes)` | Receive buffer size |
| SO_SNDBUF | `setSendBufferSize(bytes)` | Send buffer size |
| SO_LINGER | `setSoLinger(true, secs)` | Wait on close for data send |

## Configuring a Client Socket

```java
import java.net.*;
import java.io.*;

public class OptimizedSocketClient {
    
    public static Socket createOptimizedSocket(String host, int port) throws IOException {
        // Create socket with connection timeout (avoid hanging indefinitely)
        Socket socket = new Socket();
        
        // Set socket options BEFORE connecting for some options to take effect
        
        // SO_REUSEADDR: relevant when you bind a specific local address/port
        // and want to rebind while a previous connection is still in TIME_WAIT
        socket.setReuseAddress(true);
        
        // Set buffer size hints before connect; larger receive windows must be
        // requested before connect() if you want values above 64 KB
        socket.setReceiveBufferSize(256 * 1024);  // 256 KB
        socket.setSendBufferSize(256 * 1024);      // 256 KB
        
        // Connect with a 5-second timeout (instead of hanging forever)
        socket.connect(new InetSocketAddress(host, port), 5000);
        
        // Set additional options on the connected socket before I/O begins
        
        // SO_TIMEOUT: blocking read timeout - throw SocketTimeoutException after 30s
        socket.setSoTimeout(30000);
        
        // TCP_NODELAY: disable Nagle's algorithm for low-latency sends
        socket.setTcpNoDelay(true);
        
        // SO_KEEPALIVE: OS sends keepalive probes to detect dead connections
        socket.setKeepAlive(true);
        
        // SO_LINGER: wait up to 5 seconds on close() for data to be sent
        socket.setSoLinger(true, 5);
        
        return socket;
    }
    
    public static void main(String[] args) throws IOException {
        try (Socket socket = createOptimizedSocket("10.0.0.1", 8080)) {
            System.out.println("Connected with optimized socket options:");
            System.out.println("  TCP_NODELAY:    " + socket.getTcpNoDelay());
            System.out.println("  SO_KEEPALIVE:   " + socket.getKeepAlive());
            System.out.println("  SO_TIMEOUT:     " + socket.getSoTimeout() + "ms");
            System.out.println("  SO_RCVBUF:      " + socket.getReceiveBufferSize());
            System.out.println("  SO_SNDBUF:      " + socket.getSendBufferSize());
        }
    }
}
```

## Configuring a ServerSocket

```java
import java.net.*;
import java.io.*;

public class OptimizedServer {
    
    public static ServerSocket createOptimizedServer(int port) throws IOException {
        ServerSocket serverSocket = new ServerSocket();
        
        // SO_REUSEADDR: allows rebinding while a prior connection is in TIME_WAIT
        // Useful to avoid "Address already in use" on quick restarts
        serverSocket.setReuseAddress(true);
        
        // Set receive buffer size hint for accepted sockets
        // Must be set BEFORE bind() for it to apply to accepted sockets
        serverSocket.setReceiveBufferSize(256 * 1024);
        
        // Bind to all IPv4 interfaces with a connection backlog of 100
        serverSocket.bind(new InetSocketAddress("0.0.0.0", port), 100);
        
        return serverSocket;
    }
    
    public static void main(String[] args) throws IOException {
        try (ServerSocket server = createOptimizedServer(8080)) {
            System.out.println("Server listening on port 8080");
            System.out.println("  SO_REUSEADDR: " + server.getReuseAddress());
            System.out.println("  SO_RCVBUF:    " + server.getReceiveBufferSize());
            
            while (true) {
                Socket client = server.accept();
                
                // Configure the accepted socket
                client.setTcpNoDelay(true);
                client.setKeepAlive(true);
                client.setSoTimeout(60000);  // 1-minute read timeout
                
                new Thread(() -> handleClient(client)).start();
            }
        }
    }
    
    private static void handleClient(Socket socket) {
        try (socket;
             BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()));
             PrintWriter writer = new PrintWriter(new BufferedOutputStream(socket.getOutputStream()), true)
        ) {
            String line;
            while ((line = reader.readLine()) != null) {
                writer.println("Echo: " + line);
            }
        } catch (SocketTimeoutException e) {
            System.out.println("Client idle timeout: " + socket.getRemoteSocketAddress());
        } catch (IOException e) {
            System.err.println("Client error: " + e.getMessage());
        }
    }
}
```

## Setting IP-Level Options

For IP-level socket options (e.g., IP_TOS for QoS marking):

```java
// Request IP Type of Service (TOS) for QoS marking.
// Some platforms treat this as a hint and may ignore or cap the value.
// 0x10 = Minimize Delay, 0x08 = Maximize Throughput
socket.setTrafficClass(0x10);
System.out.println("IP TOS set to: 0x" + Integer.toHexString(socket.getTrafficClass()));
```

## Performance Buffer Sizing

For high-throughput file transfer or streaming:

```java
// For a 100 Mbit/s link with 10ms RTT:
// Bandwidth-Delay Product = 100,000,000 bits/s * 0.01s = 1,000,000 bits
// ~= 125,000 bytes (~122 KiB), so start around that size or higher
socket.setReceiveBufferSize(1024 * 1024);   // 1 MB hint
socket.setSendBufferSize(1024 * 1024);      // 1 MB hint
```

## Conclusion

Properly configured socket options are the difference between a performant and a mediocre network application. Set `SO_REUSEADDR` on servers before binding when you want faster restarts, `TCP_NODELAY` for interactive protocols, `SO_TIMEOUT` to prevent indefinite blocking, and tune buffer sizes for your expected throughput requirements.
