# How to Use IPv6 with Java DatagramSocket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, IPv6, UDP, DatagramSocket, Multicast, Networking

Description: Use Java DatagramSocket and MulticastSocket for IPv6 UDP communication including unicast messaging, multicast groups, and NIO UDP channels.

## Basic IPv6 UDP Server

```java
import java.net.*;
import java.nio.charset.StandardCharsets;

public class IPv6UDPServer {

    public static void main(String[] args) throws Exception {
        // Bind to [::]:9000 for IPv6 UDP
        DatagramSocket socket = new DatagramSocket(
            new InetSocketAddress("::", 9000));

        System.out.println("UDP server on " + socket.getLocalSocketAddress());

        byte[] buf = new byte[1500];
        while (true) {
            DatagramPacket packet = new DatagramPacket(buf, buf.length);
            socket.receive(packet);

            String msg = new String(packet.getData(), 0, packet.getLength(),
                StandardCharsets.UTF_8);
            System.out.printf("From %s: %s%n",
                packet.getAddress().getHostAddress(), msg);

            // Echo back
            byte[] reply = ("Echo: " + msg).getBytes(StandardCharsets.UTF_8);
            DatagramPacket response = new DatagramPacket(
                reply, reply.length,
                packet.getAddress(), packet.getPort());
            socket.send(response);
        }
    }
}
```

## IPv6 UDP Client

```java
import java.net.*;
import java.nio.charset.StandardCharsets;

public class IPv6UDPClient {

    public static void main(String[] args) throws Exception {
        // Bind to ephemeral port
        DatagramSocket socket = new DatagramSocket(
            new InetSocketAddress("::", 0));

        InetAddress server = InetAddress.getByName("::1");
        byte[] data = "Hello IPv6 UDP".getBytes(StandardCharsets.UTF_8);

        DatagramPacket packet = new DatagramPacket(data, data.length, server, 9000);
        socket.send(packet);
        System.out.println("Sent to " + server.getHostAddress() + ":9000");

        // Receive response
        socket.setSoTimeout(5000);
        byte[] buf = new byte[1500];
        DatagramPacket response = new DatagramPacket(buf, buf.length);
        socket.receive(response);

        System.out.println("Response: " +
            new String(response.getData(), 0, response.getLength(),
                StandardCharsets.UTF_8));

        socket.close();
    }
}
```

## IPv6 Multicast with MulticastSocket

```java
import java.net.*;

public class IPv6MulticastReceiver {

    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            System.err.println("Usage: IPv6MulticastReceiver <interface>");
            return;
        }

        // ff12::1234 is a transient, link-local IPv6 multicast group
        InetAddress group = InetAddress.getByName("ff12::1234");
        NetworkInterface iface = NetworkInterface.getByName(args[0]);
        if (iface == null) {
            throw new IllegalArgumentException("No such interface: " + args[0]);
        }

        MulticastSocket socket = new MulticastSocket(5000);

        // Join the multicast group on the specified interface
        SocketAddress groupAddr = new InetSocketAddress(group, 5000);
        socket.joinGroup(groupAddr, iface);
        System.out.println("Joined ff12::1234:5000 on " + iface.getName());

        byte[] buf = new byte[1500];
        for (int i = 0; i < 10; i++) {
            DatagramPacket packet = new DatagramPacket(buf, buf.length);
            socket.receive(packet);
            System.out.printf("Multicast from %s: %d bytes%n",
                packet.getAddress().getHostAddress(), packet.getLength());
        }

        socket.leaveGroup(groupAddr, iface);
        socket.close();
    }
}
```

## Sending IPv6 Multicast

```java
import java.net.*;
import java.nio.charset.StandardCharsets;

public class IPv6MulticastSender {

    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            System.err.println("Usage: IPv6MulticastSender <interface>");
            return;
        }

        MulticastSocket socket = new MulticastSocket();

        // Set outgoing interface for multicast
        NetworkInterface iface = NetworkInterface.getByName(args[0]);
        if (iface == null) {
            throw new IllegalArgumentException("No such interface: " + args[0]);
        }
        socket.setNetworkInterface(iface);
        socket.setTimeToLive(5);  // Hop limit for multicast traffic

        InetAddress group = InetAddress.getByName("ff12::1234");
        byte[] data = "Announcement".getBytes(StandardCharsets.UTF_8);

        DatagramPacket packet = new DatagramPacket(data, data.length, group, 5000);
        socket.send(packet);

        System.out.println("Sent multicast to ff12::1234:5000 on " + iface.getName());
        socket.close();
    }
}
```

## NIO DatagramChannel for IPv6

```java
import java.net.*;
import java.nio.*;
import java.nio.charset.StandardCharsets;
import java.nio.channels.*;

public class NIOIPv6UDP {

    public static void main(String[] args) throws Exception {
        DatagramChannel channel = DatagramChannel.open(StandardProtocolFamily.INET6);
        channel.bind(new InetSocketAddress("::", 9000));
        channel.configureBlocking(true);

        System.out.println("NIO IPv6 UDP on " + channel.getLocalAddress());

        ByteBuffer buf = ByteBuffer.allocate(4096);
        while (true) {
            buf.clear();
            SocketAddress sender = channel.receive(buf);
            buf.flip();

            byte[] data = new byte[buf.remaining()];
            buf.get(data);
            System.out.printf("From %s: %s%n", sender,
                new String(data, StandardCharsets.UTF_8));

            // Echo
            buf.rewind();
            channel.send(buf, sender);
        }
    }
}
```

## Conclusion

Java's `DatagramSocket` can use IPv6 addresses, for example by binding to `new InetSocketAddress("::", port)`. For multicast, prefer `MulticastSocket.joinGroup(SocketAddress, NetworkInterface)`; the older `joinGroup(InetAddress)` is deprecated since Java 14 because it does not let you specify the network interface. NIO's `DatagramChannel.open(StandardProtocolFamily.INET6)` opens an IPv6 channel explicitly. Use `StandardProtocolFamily.INET6` when you need an IPv6 channel; `DatagramChannel.open()` leaves the protocol family platform-dependent and unspecified.
