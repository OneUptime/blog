# How to Implement Non-Blocking IPv4 Sockets in Java with Selectors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, NIO, Non-Blocking, Selector, IPv4, Socket, Networking

Description: Learn how to implement non-blocking IPv4 socket I/O in Java using NIO Selector to handle multiple connections in a single thread efficiently.

## The Selector Model

Java NIO's `Selector` monitors multiple non-blocking channels, notifying you when a channel is ready for I/O. This avoids creating one thread per connection, enabling a single thread to serve thousands of clients.

## Complete Non-Blocking Echo Server with Selector

```java
import java.io.*;
import java.net.*;
import java.nio.*;
import java.nio.channels.*;
import java.util.*;

public class SelectorEchoServer {
    private final int port;
    private Selector selector;
    private ServerSocketChannel serverChannel;

    public SelectorEchoServer(int port) {
        this.port = port;
    }

    public void start() throws IOException {
        selector = Selector.open();

        serverChannel = ServerSocketChannel.open();
        serverChannel.configureBlocking(false);
        serverChannel.setOption(StandardSocketOptions.SO_REUSEADDR, true);
        serverChannel.bind(new InetSocketAddress("0.0.0.0", port));

        // Register for ACCEPT events
        serverChannel.register(selector, SelectionKey.OP_ACCEPT);
        System.out.println("Non-blocking server on port " + port);

        ByteBuffer buffer = ByteBuffer.allocate(8192);

        while (true) {
            // Block until at least one channel is ready (1 second timeout)
            int readyCount = selector.select(1000);
            if (readyCount == 0) continue;

            Set<SelectionKey> readyKeys = selector.selectedKeys();
            Iterator<SelectionKey> it = readyKeys.iterator();

            while (it.hasNext()) {
                SelectionKey key = it.next();
                it.remove();

                try {
                    if (!key.isValid()) continue;

                    if (key.isAcceptable()) {
                        handleAccept(key);
                    } else if (key.isReadable()) {
                        handleRead(key, buffer);
                    } else if (key.isWritable()) {
                        handleWrite(key);
                    }
                } catch (IOException e) {
                    System.err.println("Channel error: " + e.getMessage());
                    closeChannel(key);
                }
            }
        }
    }

    private void handleAccept(SelectionKey key) throws IOException {
        ServerSocketChannel server = (ServerSocketChannel) key.channel();
        SocketChannel client = server.accept();
        client.configureBlocking(false);
        client.setOption(StandardSocketOptions.TCP_NODELAY, true);

        // Register for READ, attach a write queue
        SelectionKey clientKey = client.register(
            selector, SelectionKey.OP_READ,
            new ArrayDeque<ByteBuffer>()  // Attachment: pending write buffers
        );
        System.out.println("Accepted: " + client.getRemoteAddress());
    }

    @SuppressWarnings("unchecked")
    private void handleRead(SelectionKey key, ByteBuffer buffer) throws IOException {
        SocketChannel client = (SocketChannel) key.channel();
        buffer.clear();
        int bytesRead = client.read(buffer);

        if (bytesRead == -1) {
            closeChannel(key);
            return;
        }

        buffer.flip();
        // Queue the data to be written back
        ByteBuffer copy = ByteBuffer.allocate(buffer.remaining());
        copy.put(buffer);
        copy.flip();

        Queue<ByteBuffer> writeQueue = (Queue<ByteBuffer>) key.attachment();
        writeQueue.add(copy);

        // Add WRITE interest so we get notified when channel is writable
        key.interestOps(SelectionKey.OP_READ | SelectionKey.OP_WRITE);
    }

    @SuppressWarnings("unchecked")
    private void handleWrite(SelectionKey key) throws IOException {
        SocketChannel client = (SocketChannel) key.channel();
        Queue<ByteBuffer> writeQueue = (Queue<ByteBuffer>) key.attachment();

        while (!writeQueue.isEmpty()) {
            ByteBuffer buf = writeQueue.peek();
            client.write(buf);
            if (buf.hasRemaining()) break;  // Channel buffer full; try again later
            writeQueue.poll();
        }

        if (writeQueue.isEmpty()) {
            // Remove WRITE interest when nothing left to write
            key.interestOps(SelectionKey.OP_READ);
        }
    }

    private void closeChannel(SelectionKey key) throws IOException {
        key.cancel();
        key.channel().close();
        System.out.println("Connection closed");
    }

    public static void main(String[] args) throws IOException {
        new SelectorEchoServer(9000).start();
    }
}
```

## Interest Operations Summary

| Constant | Value | When to Use |
|----------|-------|-------------|
| `OP_ACCEPT` | 16 | Server channel: ready to accept connection |
| `OP_CONNECT` | 8 | Client: connection completion event |
| `OP_READ` | 1 | Channel has data to read |
| `OP_WRITE` | 4 | Channel's buffer has space (writable) |

## Non-Blocking Client

```java
import java.net.*;
import java.nio.*;
import java.nio.channels.*;

public class NioNonBlockingClient {
    public static void main(String[] args) throws Exception {
        SocketChannel channel = SocketChannel.open();
        channel.configureBlocking(false);

        // connect_ex equivalent: returns false if connection pending
        boolean connected = channel.connect(new InetSocketAddress("127.0.0.1", 9000));

        if (!connected) {
            // Wait for connection to complete
            while (!channel.finishConnect()) {
                Thread.sleep(10);
            }
        }

        // Send data
        channel.write(ByteBuffer.wrap("Hello NIO!\n".getBytes()));

        // Read response
        ByteBuffer buf = ByteBuffer.allocate(1024);
        while (channel.read(buf) == 0) Thread.sleep(10);
        buf.flip();
        System.out.println(new String(buf.array(), 0, buf.limit()));

        channel.close();
    }
}
```

## Conclusion

Java NIO Selector-based servers handle thousands of connections in a single thread by monitoring channel readiness events. Register channels with appropriate interest operations, react to ready events, and manage write queues to prevent blocking when send buffers are full. The pattern is more complex than threading but scales far better for high-concurrency I/O-bound workloads.
