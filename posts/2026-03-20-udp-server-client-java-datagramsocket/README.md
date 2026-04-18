# How to Create a UDP Server and Client in Java with DatagramSocket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, UDP, DatagramSocket, IPv4, Networking, Datagram

Description: Learn how to create a UDP server and client in Java using DatagramSocket and DatagramPacket for IPv4 datagram communication.

## UDP Server

```java
import java.net.*;
import java.io.*;

public class UdpEchoServer {
    private static final int PORT = 9001;
    private static final int BUFFER_SIZE = 65535;

    public static void main(String[] args) throws IOException {
        // Create unbound, enable SO_REUSEADDR before bind, then bind to the port
        try (DatagramSocket serverSocket = new DatagramSocket(null)) {
            serverSocket.setReuseAddress(true);
            serverSocket.bind(new InetSocketAddress(PORT));
            System.out.println("UDP server listening on port " + PORT);

            byte[] buffer = new byte[BUFFER_SIZE];

            while (true) {
                // DatagramPacket receives incoming data
                DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);

                // receive() blocks until a datagram arrives
                serverSocket.receive(receivePacket);

                InetAddress senderAddr = receivePacket.getAddress();
                int senderPort = receivePacket.getPort();
                String message = new String(
                    receivePacket.getData(), 0, receivePacket.getLength(), "UTF-8");

                System.out.printf("Received %d bytes from %s:%d: %s%n",
                    receivePacket.getLength(), senderAddr.getHostAddress(),
                    senderPort, message);

                // Send reply back to the sender
                String reply = "Echo: " + message;
                byte[] replyBytes = reply.getBytes("UTF-8");
                DatagramPacket replyPacket = new DatagramPacket(
                    replyBytes, replyBytes.length, senderAddr, senderPort);
                serverSocket.send(replyPacket);
            }
        }
    }
}
```

## UDP Client

```java
import java.net.*;
import java.io.*;

public class UdpClient {
    private static final String SERVER_HOST = "127.0.0.1";
    private static final int SERVER_PORT = 9001;
    private static final int TIMEOUT_MS = 3000;

    public static void main(String[] args) throws IOException {
        try (DatagramSocket socket = new DatagramSocket()) {
            // Set receive timeout
            socket.setSoTimeout(TIMEOUT_MS);

            InetAddress serverAddress = InetAddress.getByName(SERVER_HOST);
            String message = "Hello, UDP server!";
            byte[] sendData = message.getBytes("UTF-8");

            // Create and send the datagram
            DatagramPacket sendPacket = new DatagramPacket(
                sendData, sendData.length, serverAddress, SERVER_PORT);
            socket.send(sendPacket);
            System.out.printf("Sent to %s:%d: %s%n", SERVER_HOST, SERVER_PORT, message);

            // Receive the reply
            byte[] buffer = new byte[65535];
            DatagramPacket receivePacket = new DatagramPacket(buffer, buffer.length);

            try {
                socket.receive(receivePacket);
                String reply = new String(
                    receivePacket.getData(), 0, receivePacket.getLength(), "UTF-8");
                System.out.printf("Reply from %s:%d: %s%n",
                    receivePacket.getAddress().getHostAddress(),
                    receivePacket.getPort(), reply);
            } catch (SocketTimeoutException e) {
                System.err.println("No response received within " + TIMEOUT_MS + "ms");
            }
        }
    }
}
```

## Binding to a Specific IPv4 Interface

```java
import java.net.*;

// Bind to a specific IPv4 interface (not just any available port)
InetAddress bindAddr = InetAddress.getByName("192.168.1.50");
DatagramSocket socket = new DatagramSocket(9001, bindAddr);
```

## Multi-threaded UDP Server

```java
import java.net.*;
import java.util.concurrent.*;

public class ConcurrentUdpServer {
    public static void main(String[] args) throws Exception {
        DatagramSocket socket = new DatagramSocket(9001);
        ExecutorService executor = Executors.newFixedThreadPool(10);
        byte[] buffer = new byte[65535];

        System.out.println("Concurrent UDP server on port 9001");

        while (true) {
            DatagramPacket packet = new DatagramPacket(buffer.clone(), buffer.length);
            socket.receive(packet);

            // Copy data before submitting to thread pool
            final byte[] data = new byte[packet.getLength()];
            System.arraycopy(packet.getData(), 0, data, 0, packet.getLength());
            final InetAddress addr = packet.getAddress();
            final int port = packet.getPort();

            executor.submit(() -> {
                try {
                    String msg = new String(data, "UTF-8");
                    System.out.println("Processing: " + msg);
                    byte[] reply = ("Processed: " + msg).getBytes("UTF-8");
                    DatagramPacket response = new DatagramPacket(reply, reply.length, addr, port);
                    socket.send(response);
                } catch (IOException e) {
                    e.printStackTrace();
                }
            });
        }
    }
}
```

## Conclusion

Java UDP servers use `DatagramSocket(port)` to bind and `socket.receive(packet)` to block for datagrams. Clients use `new DatagramSocket()`, which binds to an ephemeral port on the wildcard address, and call `socket.send(packet)` with the destination address embedded in the `DatagramPacket`. Always set `setSoTimeout()` on clients to avoid indefinite blocking. Copy the receive buffer before submitting to thread pools since the buffer is reused.
