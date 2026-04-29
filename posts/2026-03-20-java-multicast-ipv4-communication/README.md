# How to Implement Multicast Communication over IPv4 in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Multicast, IPv4, UDP, Networking, MulticastSocket

Description: Build IPv4 multicast sender and receiver applications in Java using MulticastSocket to send a single UDP packet to a group of subscribed hosts simultaneously.

## Introduction

IPv4 multicast allows a single sender to deliver packets to multiple receivers simultaneously without flooding the network. Multicast addresses (224.0.0.0 – 239.255.255.255) define groups - receivers join the group to receive traffic. This is used in streaming protocols (IPTV), service discovery (mDNS), and routing protocols (OSPF, PIM).

## Multicast Address Ranges

| Range | Scope | Examples |
|-------|-------|---------|
| 224.0.0.0/24 | Link-local (single subnet) | OSPF, IGMP |
| 224.0.1.0/24 | Internet-scoped | NTP (224.0.1.1) |
| 239.0.0.0/8 | Organization-local | Application use |

Use addresses in the 239.0.0.0/8 range for your own applications.

## Multicast Receiver (Listener)

```java
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Enumeration;

public class MulticastReceiver {
    
    private static final String MULTICAST_GROUP = "239.1.2.3";
    private static final int PORT = 4446;
    
    public static void main(String[] args) throws IOException {
        // Create a MulticastSocket and bind to the multicast port
        MulticastSocket socket = new MulticastSocket(PORT);
        
        try {
            // Join the multicast group
            InetAddress group = InetAddress.getByName(MULTICAST_GROUP);
            NetworkInterface networkInterface = findMulticastInterface();
            SocketAddress groupAddress = new InetSocketAddress(group, PORT);
            socket.joinGroup(groupAddress, networkInterface);
            System.out.println("Joined multicast group " + MULTICAST_GROUP + " on port " + PORT);
            
            byte[] buffer = new byte[1024];
            
            while (true) {
                DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                
                // Block until a multicast packet arrives
                socket.receive(packet);
                
                String message = new String(packet.getData(), 0, packet.getLength(), StandardCharsets.UTF_8);
                System.out.printf("Received from %s:%d: %s%n",
                    packet.getAddress().getHostAddress(),
                    packet.getPort(),
                    message
                );
            }
        } finally {
            socket.close();
        }
    }

    private static NetworkInterface findMulticastInterface() throws SocketException {
        Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
        if (interfaces == null) {
            throw new SocketException("No network interfaces found");
        }

        while (interfaces.hasMoreElements()) {
            NetworkInterface networkInterface = interfaces.nextElement();
            if (networkInterface.isUp()
                && networkInterface.supportsMulticast()
                && !networkInterface.isLoopback()) {
                return networkInterface;
            }
        }

        throw new SocketException("No multicast-capable network interface found");
    }
}
```

## Multicast Sender

```java
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;

public class MulticastSender {
    
    private static final String MULTICAST_GROUP = "239.1.2.3";
    private static final int PORT = 4446;
    
    public static void main(String[] args) throws IOException {
        // Create a MulticastSocket so multicast-specific options are available
        MulticastSocket socket = new MulticastSocket();
        
        try {
            InetAddress group = InetAddress.getByName(MULTICAST_GROUP);
            
            // Set time-to-live (hop limit for the multicast packet)
            // 1 = local subnet only, 32 = site-wide, 128 = continent, 255 = global
            socket.setTimeToLive(1);
            
            for (int i = 1; i <= 10; i++) {
                String message = "Multicast message #" + i + " at " + System.currentTimeMillis();
                byte[] data = message.getBytes(StandardCharsets.UTF_8);
                
                DatagramPacket packet = new DatagramPacket(data, data.length, group, PORT);
                socket.send(packet);
                
                System.out.println("Sent: " + message);
                Thread.sleep(1000);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            socket.close();
        }
    }
}
```

## Using a Specific Network Interface

For hosts with multiple network interfaces, specify which interface to use:

```java
// Receiver: join group on a specific interface
MulticastSocket socket = new MulticastSocket(PORT);

// Get the interface by name
NetworkInterface ni = NetworkInterface.getByName("eth0");

// Join using the specific interface
SocketAddress groupAddress = new InetSocketAddress(InetAddress.getByName(MULTICAST_GROUP), PORT);
socket.joinGroup(groupAddress, ni);

// Sender: send on a specific interface
MulticastSocket sender = new MulticastSocket();
sender.setNetworkInterface(NetworkInterface.getByName("eth0"));
sender.setTimeToLive(1);
```

## Bidirectional Multicast (Sender + Receiver)

A node can both send and receive on the same multicast group:

```java
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.Enumeration;
import java.util.concurrent.*;

public class MulticastNode {
    
    private static final String GROUP = "239.1.2.3";
    private static final int PORT = 4446;
    
    public static void main(String[] args) throws Exception {
        MulticastSocket socket = new MulticastSocket(PORT);
        InetAddress group = InetAddress.getByName(GROUP);
        NetworkInterface networkInterface = findMulticastInterface();
        socket.setNetworkInterface(networkInterface);
        socket.joinGroup(new InetSocketAddress(group, PORT), networkInterface);
        socket.setTimeToLive(1);
        
        // Receiver thread
        ExecutorService executor = Executors.newFixedThreadPool(2);
        executor.submit(() -> {
            byte[] buf = new byte[1024];
            while (!Thread.interrupted()) {
                try {
                    DatagramPacket pkt = new DatagramPacket(buf, buf.length);
                    socket.receive(pkt);
                    System.out.println("Got: " + new String(pkt.getData(), 0, pkt.getLength(), StandardCharsets.UTF_8));
                } catch (Exception e) { break; }
            }
        });
        
        // Sender thread
        executor.submit(() -> {
            for (int i = 0; i < 5; i++) {
                try {
                    byte[] data = ("Hello #" + i).getBytes(StandardCharsets.UTF_8);
                    socket.send(new DatagramPacket(data, data.length, group, PORT));
                    Thread.sleep(1000);
                } catch (Exception e) { break; }
            }
            socket.close();
        });
        
        executor.shutdown();
        executor.awaitTermination(30, TimeUnit.SECONDS);
    }

    private static NetworkInterface findMulticastInterface() throws SocketException {
        Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
        if (interfaces == null) {
            throw new SocketException("No network interfaces found");
        }

        while (interfaces.hasMoreElements()) {
            NetworkInterface networkInterface = interfaces.nextElement();
            if (networkInterface.isUp()
                && networkInterface.supportsMulticast()
                && !networkInterface.isLoopback()) {
                return networkInterface;
            }
        }

        throw new SocketException("No multicast-capable network interface found");
    }
}
```

## Conclusion

Java's `MulticastSocket` makes IPv4 multicast straightforward. Remember that multicast requires IGMP support on the network (most managed switches and routers support it), and limit TTL to prevent multicast from leaking beyond your intended scope.
