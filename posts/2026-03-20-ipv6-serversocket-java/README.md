# How to Use IPv6 with Java ServerSocket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, IPv6, ServerSocket, TCP, Networking, NIO

Description: Create IPv6 TCP servers in Java using ServerSocket, handle dual-stack connections, and use NIO ServerSocketChannel for non-blocking IPv6 servers.

## Basic IPv6 ServerSocket

```java
import java.io.*;
import java.net.*;

public class IPv6TCPServer {

    public static void main(String[] args) throws IOException {
        // Bind to [::]:8080 - on dual-stack systems this can accept both IPv4 and IPv6
        InetAddress bindAddr = InetAddress.getByName("::");
        ServerSocket server = new ServerSocket(8080, 50, bindAddr);

        System.out.println("Listening on: " + server.getLocalSocketAddress());

        while (true) {
            Socket client = server.accept();
            new Thread(() -> handleClient(client)).start();
        }
    }

    static void handleClient(Socket socket) {
        try (socket) {
            InetAddress clientAddr = socket.getInetAddress();
            System.out.println("Client: " + clientAddr.getHostAddress());

            BufferedReader in = new BufferedReader(
                new InputStreamReader(socket.getInputStream()));
            PrintWriter out = new PrintWriter(socket.getOutputStream(), true);

            String line;
            while ((line = in.readLine()) != null) {
                out.println("Echo: " + line);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

## IPv6-Only Server (Disable Dual-Stack)

On dual-stack systems, binding to `[::]` may also accept IPv4. Java SE does not currently expose `IPV6_V6ONLY`, so the portable way to avoid dual-stack wildcard behavior is to bind to a specific IPv6 address instead of `::`:

```java
import java.io.IOException;
import java.net.*;

public class IPv6OnlyServer {

    public static void main(String[] args) throws IOException {
        // Replace ::1 with your server's assigned IPv6 address for a non-loopback server
        InetAddress bindAddr = InetAddress.getByName("::1");
        ServerSocket server = new ServerSocket(8080, 50, bindAddr);

        System.out.println("IPv6 server on " + server.getLocalSocketAddress());

        while (true) {
            Socket client = server.accept();
            System.out.println("Client: " + client.getInetAddress().getHostAddress());
            client.close();
        }
    }
}
```

## Getting the Client IP on Dual-Stack

At the native socket layer, dual-stack sockets may use IPv4-mapped IPv6 addresses internally. Java does not return those mapped addresses to application code, so `socket.getInetAddress()` is usually the value you want to log directly:

```java
import java.net.*;

public class ClientIPExtractor {

    public static InetAddress getClientIP(Socket socket) {
        return socket.getInetAddress();
    }

    public static void main(String[] args) throws Exception {
        InetAddress addr = InetAddress.getByName("::ffff:192.168.1.1");
        System.out.println(addr.getClass().getSimpleName());
        System.out.println(addr.getHostAddress());
        // Prints Inet4Address and 192.168.1.1
    }
}
```

## NIO Non-Blocking IPv6 Server

This uses the same binding behavior as `ServerSocket`: on a dual-stack system, binding to `::` may also accept IPv4 clients.

```java
import java.io.IOException;
import java.net.*;
import java.nio.*;
import java.nio.channels.*;
import java.util.Iterator;

public class NIOIPv6Server {

    public static void main(String[] args) throws IOException {
        Selector selector = Selector.open();

        ServerSocketChannel serverChannel = ServerSocketChannel.open();
        serverChannel.configureBlocking(false);
        serverChannel.bind(new InetSocketAddress("::", 8080));
        serverChannel.register(selector, SelectionKey.OP_ACCEPT);

        System.out.println("NIO IPv6 server on port 8080");

        while (true) {
            selector.select();
            Iterator<SelectionKey> keys = selector.selectedKeys().iterator();

            while (keys.hasNext()) {
                SelectionKey key = keys.next();
                keys.remove();

                if (key.isAcceptable()) {
                    SocketChannel client = serverChannel.accept();
                    if (client != null) {
                        InetSocketAddress peer = (InetSocketAddress) client.getRemoteAddress();
                        System.out.println("Accept: " + peer.getAddress().getHostAddress());
                        client.configureBlocking(false);
                        client.register(selector, SelectionKey.OP_READ);
                    }
                } else if (key.isReadable()) {
                    SocketChannel client = (SocketChannel) key.channel();
                    ByteBuffer buf = ByteBuffer.allocate(1024);
                    int n = client.read(buf);
                    if (n == -1) {
                        client.close();
                    } else {
                        buf.flip();
                        client.write(buf);  // Echo
                    }
                }
            }
        }
    }
}
```

## Conclusion

Java's `ServerSocket` supports IPv6 by binding to `InetAddress.getByName("::")`. On dual-stack systems, that wildcard bind can also accept IPv4 unless you bind to a specific IPv6 address or change socket behavior outside the Java SE API. Java also normalizes IPv4-mapped addresses before returning them to application code, so `socket.getInetAddress()` is usually the correct client IP to log. NIO's `Selector` provides event-driven I/O for high-concurrency IPv6 servers without one thread per connection.
