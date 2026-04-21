# How to Build a TCP Client in Java Using java.net.Socket for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, TCP, Client, IPv4, Socket, Networking

Description: Learn how to build a TCP client in Java that connects to an IPv4 server using java.net.Socket, sends data, and handles responses.

## Basic TCP Client

```java
import java.io.*;
import java.net.*;

public class TcpClient {
    private static final String SERVER_HOST = "127.0.0.1";
    private static final int SERVER_PORT = 9000;
    private static final int CONNECT_TIMEOUT_MS = 5000;
    private static final int READ_TIMEOUT_MS = 30000;

    public static void main(String[] args) {
        // try-with-resources automatically closes the socket
        try (Socket socket = new Socket()) {
            // Set connect timeout before connecting
            socket.connect(
                new InetSocketAddress(SERVER_HOST, SERVER_PORT),
                CONNECT_TIMEOUT_MS
            );

            // Set read timeout for all subsequent reads
            socket.setSoTimeout(READ_TIMEOUT_MS);

            System.out.printf("Connected to %s%n", socket.getRemoteSocketAddress());

            BufferedReader in = new BufferedReader(
                new InputStreamReader(socket.getInputStream()));
            PrintWriter out = new PrintWriter(socket.getOutputStream(), true);

            // Send a message
            out.println("Hello, Java TCP server!");

            // Read response
            String response = in.readLine();
            System.out.println("Server response: " + response);

        } catch (ConnectException e) {
            System.err.println("Connection refused: server not running");
        } catch (SocketTimeoutException e) {
            System.err.println("Timed out: " + e.getMessage());
        } catch (IOException e) {
            System.err.println("IO error: " + e.getMessage());
        }
    }
}
```

## Forcing IPv4 Connection

```java
import java.io.*;
import java.net.*;

public class IPv4TcpClient {
    // Resolve hostname to IPv4 only
    public static InetAddress resolveIPv4(String hostname) throws UnknownHostException {
        InetAddress[] addresses = InetAddress.getAllByName(hostname);
        for (InetAddress addr : addresses) {
            if (addr instanceof Inet4Address) {
                return addr;
            }
        }
        throw new UnknownHostException("No IPv4 address found for " + hostname);
    }

    public static void main(String[] args) throws IOException {
        // Usage
        InetAddress ipv4 = resolveIPv4("example.com");
        try (Socket socket = new Socket(ipv4, 443)) {
            System.out.printf("Connected to %s%n", socket.getRemoteSocketAddress());
        }
    }
}
```

## Sending and Receiving Binary Data

```java
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;

public class BinaryTcpClient {
    public static void main(String[] args) throws IOException {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress("127.0.0.1", 9009), 5000);
            socket.setSoTimeout(30000);

            DataOutputStream out = new DataOutputStream(
                new BufferedOutputStream(socket.getOutputStream()));
            DataInputStream in = new DataInputStream(
                new BufferedInputStream(socket.getInputStream()));

            // Send message with 4-byte length prefix
            String message = "{\"action\":\"ping\",\"id\":\"client-1\"}";
            byte[] payload = message.getBytes(StandardCharsets.UTF_8);

            out.writeInt(payload.length);   // Length header (4 bytes, big-endian)
            out.write(payload);             // Payload
            out.flush();

            // Read response
            int responseLen = in.readInt();
            byte[] responseBytes = new byte[responseLen];
            in.readFully(responseBytes);    // Blocks until all bytes are read

            System.out.println("Response: " + new String(responseBytes, StandardCharsets.UTF_8));
        }
    }
}
```

## Reusable TCP Client Wrapper

```java
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;

public class TcpClientWrapper implements Closeable {
    private final Socket socket;
    private final DataInputStream in;
    private final DataOutputStream out;

    public TcpClientWrapper(String host, int port, int timeoutMs) throws IOException {
        socket = new Socket();
        socket.connect(new InetSocketAddress(host, port), timeoutMs);
        socket.setSoTimeout(timeoutMs);
        in = new DataInputStream(new BufferedInputStream(socket.getInputStream()));
        out = new DataOutputStream(new BufferedOutputStream(socket.getOutputStream()));
    }

    public void send(String message) throws IOException {
        byte[] bytes = message.getBytes(StandardCharsets.UTF_8);
        out.writeInt(bytes.length);
        out.write(bytes);
        out.flush();
    }

    public String receive() throws IOException {
        int len = in.readInt();
        byte[] bytes = new byte[len];
        in.readFully(bytes);
        return new String(bytes, StandardCharsets.UTF_8);
    }

    @Override
    public void close() throws IOException {
        socket.close();
    }
}

class TcpClientWrapperExample {
    public static void main(String[] args) throws IOException {
        // Usage
        try (TcpClientWrapper client = new TcpClientWrapper("127.0.0.1", 9009, 5000)) {
            client.send("{\"type\":\"hello\"}");
            System.out.println(client.receive());
        }
    }
}
```

## Conclusion

Java TCP clients use `Socket` with `connect(InetSocketAddress, timeout)` for connection timeout control. Use `DataInputStream.readFully()` for binary protocols that need exact byte counts. For IPv4-only connections, filter `InetAddress.getAllByName()` for `Inet4Address` instances. Always use try-with-resources to guarantee socket closure.
