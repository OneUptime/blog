# How to Build Dual-Stack Applications in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, IPv6, Dual-Stack, Networking, TCP, Happy Eyeballs

Description: Build dual-stack Java applications that handle both IPv4 and IPv6 connections, implement Happy Eyeballs connection racing, and detect IP version at runtime.

## Dual-Stack Server with [::] Binding

On Linux, binding to `[::]` typically accepts both IPv4 and IPv6 when the JVM is using IPv6 sockets and the kernel allows dual-stack sockets (`net.ipv6.bindv6only=0`):

```java
import java.io.*;
import java.net.*;

public class DualStackServer {

    static String describeClient(InetAddress addr) {
        if (addr instanceof Inet6Address) {
            return "IPv6 " + addr.getHostAddress();
        }
        if (addr instanceof Inet4Address) {
            return "IPv4 " + addr.getHostAddress();
        }
        return addr.getHostAddress();
    }

    public static void main(String[] args) throws IOException {
        ServerSocket server = new ServerSocket();
        server.bind(new InetSocketAddress("::", 8080));
        System.out.println("Dual-stack server on " + server.getLocalSocketAddress());

        while (true) {
            Socket client = server.accept();
            System.out.println("Client: " + describeClient(client.getInetAddress()));
            client.close();
        }
    }
}
```

## Happy Eyeballs - Staggering IPv6 and IPv4

A Happy Eyeballs-style connector starts one address family first, then starts the other shortly after instead of waiting for the first family to fail. This simplified example starts IPv6 first and begins IPv4 fallback after a 250ms delay:

```java
import java.io.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class HappyEyeballs {

    private static void tryAddresses(
        List<InetAddress> addresses,
        int port,
        int timeoutMillis,
        CompletableFuture<Socket> winner,
        AtomicReference<IOException> lastFailure) {

        for (InetAddress address : addresses) {
            Socket socket = new Socket();
            try {
                socket.connect(new InetSocketAddress(address, port), timeoutMillis);
                if (winner.complete(socket)) {
                    System.out.println("Connected via "
                        + (address instanceof Inet6Address ? "IPv6: " : "IPv4: ")
                        + address.getHostAddress());
                    return;
                }
                socket.close();
                return;
            } catch (IOException e) {
                lastFailure.set(e);
                try {
                    socket.close();
                } catch (IOException ignored) {
                }
            }
        }
    }

    public static Socket connect(String hostname, int port) throws Exception {
        InetAddress[] all = InetAddress.getAllByName(hostname);

        List<InetAddress> v6 = new ArrayList<>();
        List<InetAddress> v4 = new ArrayList<>();

        for (InetAddress address : all) {
            if (address instanceof Inet6Address) {
                v6.add(address);
            } else if (address instanceof Inet4Address) {
                v4.add(address);
            }
        }

        int racers = (v6.isEmpty() ? 0 : 1) + (v4.isEmpty() ? 0 : 1);
        if (racers == 0) {
            throw new ConnectException("No address available for " + hostname);
        }

        ScheduledExecutorService executor = Executors.newScheduledThreadPool(racers);
        CompletableFuture<Socket> winner = new CompletableFuture<>();
        AtomicReference<IOException> lastFailure = new AtomicReference<>();
        AtomicInteger remaining = new AtomicInteger(racers);

        Runnable finish = () -> {
            if (remaining.decrementAndGet() == 0 && !winner.isDone()) {
                IOException failure = lastFailure.get();
                winner.completeExceptionally(
                    failure != null ? failure : new ConnectException("No address available for " + hostname));
            }
        };

        if (!v6.isEmpty()) {
            executor.execute(() -> {
                try {
                    tryAddresses(v6, port, 3000, winner, lastFailure);
                } finally {
                    finish.run();
                }
            });
        }

        if (!v4.isEmpty()) {
            long v4DelayMillis = v6.isEmpty() ? 0 : 250;
            executor.schedule(() -> {
                try {
                    tryAddresses(v4, port, 3000, winner, lastFailure);
                } finally {
                    finish.run();
                }
            }, v4DelayMillis, TimeUnit.MILLISECONDS);
        }

        try {
            return winner.get();
        } catch (ExecutionException e) {
            Throwable cause = e.getCause();
            if (cause instanceof Exception) {
                throw (Exception) cause;
            }
            throw new IOException(cause);
        } finally {
            executor.shutdownNow();
        }
    }

    public static void main(String[] args) throws Exception {
        try (Socket s = connect("example.com", 80)) {
            System.out.println("Connected: " + s.getRemoteSocketAddress());
        }
    }
}
```

## Detecting IP Version at Runtime

```java
import java.net.*;

public class IPVersionDetector {

    public static String ipVersion(InetAddress address) {
        if (address instanceof Inet6Address) return "IPv6";
        if (address instanceof Inet4Address) return "IPv4";
        return "unknown";
    }

    public static void main(String[] args) throws Exception {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress("example.com", 80), 3000);
            System.out.println("Connected over: " + ipVersion(s.getInetAddress()));
            System.out.println("Remote: " + s.getRemoteSocketAddress());
        }
    }
}
```

## Dual-Stack HTTP Client with HttpClient (Java 11+)

```java
import java.net.*;
import java.net.http.*;
import java.time.Duration;

public class DualStackHTTP {

    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_2)
            .connectTimeout(Duration.ofSeconds(10))
            .build();

        // For dual-stack hostnames, Java resolves A and AAAA records through its normal name service.
        // If you use an IPv6 literal directly in a URI, it must be enclosed in brackets.
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://example.com/"))
            .GET()
            .build();

        HttpResponse<String> response = client.send(request,
            HttpResponse.BodyHandlers.ofString());

        System.out.println("Status: " + response.statusCode());
        System.out.println("Body: " + response.body());
    }
}
```

## Conclusion

Dual-stack Java applications can bind servers to `[::]` to accept both IP versions when the OS and JVM are using dual-stack IPv6 sockets. In Java, inspect `Inet4Address` versus `Inet6Address` to log which family a client connection used. A Happy Eyeballs-style race improves connection time by staggering IPv6 and IPv4 attempts instead of waiting for one family to fail completely. Java 11's `HttpClient` uses normal JVM name resolution for dual-stack hostnames, and `java.net.preferIPv6Addresses=true` changes the JVM's address preference while `java.net.preferIPv6Addresses=system` preserves the order returned by the operating system.
