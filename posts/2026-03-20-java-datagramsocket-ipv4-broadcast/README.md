# How to Use Java DatagramSocket for IPv4 Broadcasting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, UDP, Broadcast, DatagramSocket, IPv4, Networking

Description: Learn how to send and receive UDP broadcast messages over IPv4 in Java using DatagramSocket for local network discovery and announcements.

## UDP Broadcast Sender

```java
import java.net.*;
import java.io.*;

public class BroadcastSender {
    private static final String BROADCAST_ADDR = "255.255.255.255";
    private static final int PORT = 41234;

    public static void main(String[] args) throws Exception {
        try (DatagramSocket socket = new DatagramSocket()) {
            // Explicitly enable broadcast before sending to a broadcast address
            socket.setBroadcast(true);

            InetAddress broadcastAddress = InetAddress.getByName(BROADCAST_ADDR);

            for (int i = 0; i < 5; i++) {
                String message = String.format(
                    "{\"type\":\"DISCOVERY\",\"seq\":%d,\"service\":\"my-service\",\"port\":8080}",
                    i + 1
                );
                byte[] data = message.getBytes("UTF-8");

                DatagramPacket packet = new DatagramPacket(
                    data, data.length, broadcastAddress, PORT);
                socket.send(packet);

                System.out.printf("Broadcast #%d: %s%n", i + 1, message);
                Thread.sleep(1000);
            }
        }
    }
}
```

## UDP Broadcast Receiver

```java
import java.net.*;
import java.io.*;

public class BroadcastReceiver {
    private static final int PORT = 41234;
    private static final int BUFFER_SIZE = 4096;
    private static final int TIMEOUT_MS = 10000;  // Stop after 10 seconds of no broadcasts

    public static void main(String[] args) throws Exception {
        try (DatagramSocket socket = new DatagramSocket(PORT)) {
            socket.setBroadcast(true);
            socket.setSoTimeout(TIMEOUT_MS);

            System.out.printf("Listening for broadcasts on port %d%n", PORT);

            byte[] buffer = new byte[BUFFER_SIZE];

            while (true) {
                DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                try {
                    socket.receive(packet);
                    String message = new String(
                        packet.getData(), 0, packet.getLength(), "UTF-8");
                    System.out.printf("From %s:%d: %s%n",
                        packet.getAddress().getHostAddress(),
                        packet.getPort(),
                        message);

                    // Send unicast reply to the sender
                    String reply = "{\"type\":\"DISCOVERY_REPLY\",\"host\":\"192.168.1.50\"}";
                    byte[] replyData = reply.getBytes("UTF-8");
                    DatagramPacket replyPacket = new DatagramPacket(
                        replyData, replyData.length,
                        packet.getAddress(), packet.getPort()
                    );
                    socket.send(replyPacket);

                } catch (SocketTimeoutException e) {
                    System.out.println("No broadcasts received for " + TIMEOUT_MS + "ms; exiting");
                    break;
                }
            }
        }
    }
}
```

## Directed Subnet Broadcast

```java
import java.net.*;
import java.util.Collections;

public class SubnetBroadcast {
    public static void main(String[] args) throws Exception {
        // Find the subnet broadcast address for each interface
        for (NetworkInterface iface : Collections.list(NetworkInterface.getNetworkInterfaces())) {
            if (iface.isLoopback() || !iface.isUp()) continue;

            for (InterfaceAddress ifAddr : iface.getInterfaceAddresses()) {
                InetAddress addr = ifAddr.getAddress();
                if (!(addr instanceof Inet4Address)) continue;

                InetAddress broadcast = ifAddr.getBroadcast();
                if (broadcast == null) continue;

                System.out.printf("Interface: %s, IP: %s, Broadcast: %s%n",
                    iface.getName(), addr.getHostAddress(), broadcast.getHostAddress());

                // Send broadcast on this interface's subnet
                try (DatagramSocket socket = new DatagramSocket()) {
                    socket.setBroadcast(true);
                    byte[] data = "Hello subnet!".getBytes("UTF-8");
                    DatagramPacket pkt = new DatagramPacket(data, data.length, broadcast, 41234);
                    socket.send(pkt);
                    System.out.printf("Sent broadcast to %s%n", broadcast.getHostAddress());
                }
            }
        }
    }
}
```

## Service Discovery Pattern

Use broadcast for service discovery: clients broadcast a "who's there?" message, servers respond with their address and capabilities:

```java
// Client: announce presence
String announcement = String.format(
    "{\"type\":\"WHO_IS_SERVER\",\"clientId\":\"%s\"}",
    java.util.UUID.randomUUID()
);

// Server: respond with unicast
String response = String.format(
    "{\"type\":\"I_AM_SERVER\",\"host\":\"%s\",\"port\":8080,\"name\":\"api-server\"}",
    InetAddress.getLocalHost().getHostAddress()
);
```

## Conclusion

Java UDP broadcast commonly calls `DatagramSocket.setBroadcast(true)` before sending to `255.255.255.255` or a subnet broadcast address. Receivers bind to the broadcast port on the wildcard address; calling `setBroadcast(true)` there is optional. Use `NetworkInterface.getNetworkInterfaces()` to discover subnet broadcast addresses for more targeted broadcasts on local IPv4 networks. This pattern is the basis for local service discovery protocols.
