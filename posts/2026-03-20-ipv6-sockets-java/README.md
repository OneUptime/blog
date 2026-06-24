# How to Create IPv6 Sockets in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, IPv6, Socket, Networking, ServerSocket, NIO, Socket Programming

Description: Create IPv6 TCP and UDP sockets in Java using ServerSocket, Socket, DatagramSocket, and NIO channels for both synchronous and asynchronous IPv6 networking.

## Introduction

Java supports IPv6 through `java.net.Inet6Address`, `java.net.ServerSocket`, and `java.nio` channels. The JVM can be configured to prefer IPv6 via system properties, and all standard socket types support IPv6 binding and connection with minimal code changes from IPv4 equivalents.

## IPv6 TCP Server (Classic Java)

```java
import java.io.*;
import java.net.*;

public class IPv6TCPServer {

    public static void main(String[] args) throws IOException {
        // Bind to IPv6 wildcard address "::"
        InetAddress bindAddr = InetAddress.getByName("::");

        // Create server socket on IPv6
        // ServerSocket(port, backlog, bindAddr)
        ServerSocket server = new ServerSocket(8080, 50, bindAddr);

        System.out.println("IPv6 TCP server on [::]:8080");

        while (true) {
            Socket client = server.accept();
            new Thread(() -> handleClient(client)).start();
        }
    }

    static void handleClient(Socket client) {
        try {
            InetAddress remoteAddr = client.getInetAddress();
            boolean isIPv6 = remoteAddr instanceof Inet6Address;

            System.out.printf("Client: [%s]:%d (IPv6=%b)%n",
                remoteAddr.getHostAddress(),
                client.getPort(),
                isIPv6);

            try (PrintWriter out = new PrintWriter(client.getOutputStream(), true)) {
                out.println("Hello IPv6 client!");
            }
        } catch (IOException e) {
            System.err.println("Client error: " + e.getMessage());
        }
    }
}
```

## IPv6 TCP Client

```java
import java.io.*;
import java.net.*;

public class IPv6TCPClient {

    public static void main(String[] args) throws IOException {
        String serverAddr = "::1";   // IPv6 loopback
        int port = 8080;

        // Connect to IPv6 server
        InetAddress addr = InetAddress.getByName(serverAddr);
        Socket socket = new Socket(addr, port);

        System.out.printf("Connected to [%s]:%d%n",
            socket.getInetAddress().getHostAddress(),
            socket.getPort());

        // Read response
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(socket.getInputStream()))) {
            System.out.println("Server: " + reader.readLine());
        }

        socket.close();
    }
}
```

## IPv6 UDP Socket

```java
import java.net.*;

public class IPv6UDP {

    public static void startServer(int port) throws Exception {
        // DatagramSocket on IPv6 wildcard
        DatagramSocket server = new DatagramSocket(
            new InetSocketAddress(
                InetAddress.getByName("::"),
                port
            )
        );

        System.out.println("UDP server on [::]: " + port);

        byte[] buf = new byte[4096];
        DatagramPacket packet = new DatagramPacket(buf, buf.length);

        while (true) {
            server.receive(packet);

            String msg = new String(packet.getData(), 0, packet.getLength());
            InetAddress senderAddr = packet.getAddress();
            boolean isIPv6 = senderAddr instanceof Inet6Address;

            System.out.printf("From [%s]:%d (IPv6=%b): %s%n",
                senderAddr.getHostAddress(),
                packet.getPort(),
                isIPv6,
                msg);

            // Send reply
            byte[] reply = "ACK".getBytes();
            DatagramPacket response = new DatagramPacket(
                reply, reply.length,
                packet.getAddress(), packet.getPort()
            );
            server.send(response);

            // Reset the receive length before reusing the packet.
            packet.setLength(buf.length);
        }
    }

    public static void sendUDP(String host, int port, String message) throws Exception {
        DatagramSocket client = new DatagramSocket();
        InetAddress addr = InetAddress.getByName(host);

        byte[] data = message.getBytes();
        DatagramPacket packet = new DatagramPacket(data, data.length, addr, port);
        client.send(packet);

        // Receive reply
        byte[] buf = new byte[1024];
        DatagramPacket reply = new DatagramPacket(buf, buf.length);
        client.setSoTimeout(5000);
        client.receive(reply);
        System.out.println("Reply: " + new String(reply.getData(), 0, reply.getLength()));
        client.close();
    }
}
```

## IPv6 with Java NIO (Non-Blocking)

```java
import java.io.IOException;
import java.net.*;
import java.nio.*;
import java.nio.channels.*;

public class IPv6NIOServer {

    public static void main(String[] args) throws IOException {
        // NIO ServerSocketChannel with IPv6
        ServerSocketChannel serverChannel = ServerSocketChannel.open();
        serverChannel.configureBlocking(false);

        // Bind to IPv6 wildcard
        InetSocketAddress bindAddr = new InetSocketAddress(
            InetAddress.getByName("::"), 8080);
        serverChannel.bind(bindAddr, 50);

        System.out.println("NIO IPv6 server on [::]:8080");

        // Create selector
        Selector selector = Selector.open();
        serverChannel.register(selector, SelectionKey.OP_ACCEPT);

        while (true) {
            selector.select();
            for (SelectionKey key : selector.selectedKeys()) {
                if (key.isAcceptable()) {
                    SocketChannel client = serverChannel.accept();
                    if (client != null) {
                        client.configureBlocking(false);

                        InetSocketAddress remote =
                            (InetSocketAddress) client.getRemoteAddress();
                        System.out.printf("Client: [%s]:%d%n",
                            remote.getHostString(), remote.getPort());

                        client.register(selector, SelectionKey.OP_READ);
                    }
                }
            }
            selector.selectedKeys().clear();
        }
    }
}
```

## System Property for IPv6 Preference

```bash
# These properties are checked at JVM startup.
# Prefer IPv6 addresses when resolving hostnames

java -Djava.net.preferIPv6Addresses=true YourApp

# Force IPv4 stack (disables IPv6)
java -Djava.net.preferIPv4Stack=true YourApp
```

## Checking IPv6 Support at Runtime

```java
import java.net.*;
import java.util.*;

public class IPv6Check {
    public static void main(String[] args) throws Exception {
        // List configured IPv6 addresses on local interfaces

        Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
        while (interfaces.hasMoreElements()) {
            NetworkInterface ni = interfaces.nextElement();
            Enumeration<InetAddress> addrs = ni.getInetAddresses();
            while (addrs.hasMoreElements()) {
                InetAddress addr = addrs.nextElement();
                if (addr instanceof Inet6Address) {
                    System.out.printf("%s: %s%n", ni.getName(), addr.getHostAddress());
                }
            }
        }
    }
}
```

## Conclusion

Java IPv6 sockets can explicitly bind to `InetAddress.getByName("::")` for IPv6 wildcard binding, and connections can use `InetAddress.getByName(ipv6addr)` directly. Use `instanceof Inet6Address` to check if a connected client used IPv6. NIO channels also support IPv6 with `InetSocketAddress` constructed from an `InetAddress`. Set `java.net.preferIPv6Addresses=true` at JVM startup to prefer IPv6 addresses when a hostname resolves to both IPv4 and IPv6.
