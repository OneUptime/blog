# How to Use Java NIO Channels for IPv4 Socket Programming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, NIO, Channel, IPv4, Socket, Non-Blocking, Networking

Description: Learn how to use Java NIO's ServerSocketChannel and SocketChannel for high-performance IPv4 socket programming with non-blocking I/O.

## Why Java NIO?

Traditional `java.net` sockets are typically used in blocking mode-each active connection often needs its own thread. Java NIO (New I/O) channels allow a single thread to handle thousands of connections using a `Selector`, similar to `epoll` on Linux.

## Basic NIO TCP Server

```java
import java.io.*;
import java.net.*;
import java.nio.*;
import java.nio.channels.*;
import java.util.*;

public class NioTcpServer {
    private static final int PORT = 9000;

    public static void main(String[] args) throws IOException {
        // Open a non-blocking server socket channel
        ServerSocketChannel serverChannel = ServerSocketChannel.open();
        serverChannel.setOption(StandardSocketOptions.SO_REUSEADDR, true);
        serverChannel.configureBlocking(false);
        serverChannel.bind(new InetSocketAddress("0.0.0.0", PORT));

        // Create a Selector to monitor multiple channels
        Selector selector = Selector.open();

        // Register the server channel for ACCEPT events
        serverChannel.register(selector, SelectionKey.OP_ACCEPT);

        System.out.println("NIO server listening on port " + PORT);

        while (true) {
            // Block until at least one channel is ready
            selector.select();

            Set<SelectionKey> selectedKeys = selector.selectedKeys();
            Iterator<SelectionKey> iter = selectedKeys.iterator();

            while (iter.hasNext()) {
                SelectionKey key = iter.next();
                iter.remove();

                if (!key.isValid()) {
                    continue;
                }

                if (key.isAcceptable()) {
                    // Accept new connection
                    ServerSocketChannel server = (ServerSocketChannel) key.channel();
                    SocketChannel client = server.accept();
                    if (client == null) {
                        continue;
                    }
                    client.configureBlocking(false);
                    client.register(selector, SelectionKey.OP_READ, ByteBuffer.allocate(4096));
                    System.out.println("Accepted: " + client.getRemoteAddress());

                } else if (key.isReadable()) {
                    // Read data from client
                    SocketChannel client = (SocketChannel) key.channel();
                    ByteBuffer buffer = (ByteBuffer) key.attachment();
                    buffer.clear();
                    int bytesRead = client.read(buffer);

                    if (bytesRead == -1) {
                        // Client closed connection
                        System.out.println("Client disconnected: " + client.getRemoteAddress());
                        key.cancel();
                        client.close();
                    } else if (bytesRead > 0) {
                        // Echo back: flip switches buffer from write to read mode
                        buffer.flip();
                        key.interestOps(SelectionKey.OP_WRITE);
                    }
                } else if (key.isWritable()) {
                    SocketChannel client = (SocketChannel) key.channel();
                    ByteBuffer buffer = (ByteBuffer) key.attachment();
                    client.write(buffer);

                    if (!buffer.hasRemaining()) {
                        buffer.clear();
                        key.interestOps(SelectionKey.OP_READ);
                    }
                }
            }
        }
    }
}
```

## NIO TCP Client

```java
import java.io.*;
import java.net.*;
import java.nio.*;
import java.nio.channels.*;
import java.nio.charset.*;

public class NioTcpClient {
    public static void main(String[] args) throws IOException {
        // Open a SocketChannel
        SocketChannel channel = SocketChannel.open();
        channel.configureBlocking(true);  // Blocking mode for simple client

        // Connect to server
        channel.connect(new InetSocketAddress("127.0.0.1", 9000));
        System.out.println("Connected: " + channel.getRemoteAddress());

        // Send message
        String message = "Hello from NIO client!\n";
        ByteBuffer writeBuffer = ByteBuffer.wrap(message.getBytes(StandardCharsets.UTF_8));
        while (writeBuffer.hasRemaining()) {
            channel.write(writeBuffer);
        }

        // Read response
        ByteBuffer readBuffer = ByteBuffer.allocate(1024);
        StringBuilder response = new StringBuilder();

        while (response.indexOf("\n") == -1) {
            int bytesRead = channel.read(readBuffer);
            if (bytesRead == -1) {
                throw new EOFException("Server closed connection");
            }

            readBuffer.flip();
            response.append(StandardCharsets.UTF_8.decode(readBuffer));
            readBuffer.clear();
        }

        System.out.println("Response: " + response.toString().trim());

        channel.close();
    }
}
```

## Reading and Writing with Buffers

```java
// Write a string to a blocking channel
public static void writeString(SocketChannel ch, String msg) throws IOException {
    ByteBuffer buf = ByteBuffer.wrap(msg.getBytes(StandardCharsets.UTF_8));
    while (buf.hasRemaining()) {
        ch.write(buf);
    }
}

// Read a specific number of bytes from a blocking channel
public static byte[] readBytes(SocketChannel ch, int count) throws IOException {
    ByteBuffer buf = ByteBuffer.allocate(count);
    while (buf.hasRemaining()) {
        int n = ch.read(buf);
        if (n == -1) throw new EOFException("Channel closed");
    }
    return buf.array();
}
```

## Setting Channel Socket Options

```java
ServerSocketChannel server = ServerSocketChannel.open();

// Java NIO socket options
server.setOption(StandardSocketOptions.SO_REUSEADDR, true);
if (server.supportedOptions().contains(StandardSocketOptions.SO_REUSEPORT)) {
    server.setOption(StandardSocketOptions.SO_REUSEPORT, true);
}

server.bind(new InetSocketAddress("0.0.0.0", 9000));

SocketChannel client = server.accept();
client.setOption(StandardSocketOptions.TCP_NODELAY, true);    // Disable Nagle
client.setOption(StandardSocketOptions.SO_KEEPALIVE, true);   // TCP keepalive
client.setOption(StandardSocketOptions.SO_SNDBUF, 65536);     // Send buffer
client.setOption(StandardSocketOptions.SO_RCVBUF, 65536);     // Recv buffer
```

## Conclusion

Java NIO channels with `Selector` enable event-driven I/O where a single thread multiplexes thousands of connections-similar to Node.js's event loop. The key operations are registering channels with `OP_ACCEPT` and `OP_READ` interest sets, then reacting to ready events in the selector loop. For new Java projects, consider `java.nio.channels.AsynchronousServerSocketChannel` (AIO) or Netty/Vert.x frameworks for higher-level abstractions.
