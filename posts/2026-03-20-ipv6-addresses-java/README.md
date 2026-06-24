# How to Handle IPv6 Addresses in Java Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, IPv6, Networking, InetAddress, Socket Programming, Development

Description: Handle, validate, parse, and use IPv6 addresses in Java applications using InetAddress, Inet6Address, and ServerSocket with proper dual-stack configuration.

## Introduction

Java has supported IPv6 in the `java.net` package since J2SE 1.4, with actual support depending on the underlying operating system. The `InetAddress` and `Inet6Address` classes can parse and inspect IPv6 addresses, while `ServerSocket` and `Socket` can use IPv6 sockets on IPv6-capable systems.

## Parsing and Validating IPv6 Addresses

```java
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;

public class IPv6Validator {

    /**
     * Check if a string is a valid IPv6 literal.
     */
    public static boolean isIPv6(String address) {
        if (address == null || address.trim().isEmpty() || !address.contains(":")) {
            return false;
        }

        try {
            String literal = address.trim();
            String zoneId = null;

            if (literal.startsWith("[") && literal.endsWith("]")) {
                literal = literal.substring(1, literal.length() - 1);
            }

            int zoneIndex = literal.indexOf('%');
            if (zoneIndex >= 0) {
                zoneId = literal.substring(zoneIndex + 1);
                literal = literal.substring(0, zoneIndex);

                if (zoneId.isEmpty()) {
                    return false;
                }
            }

            InetAddress addr = InetAddress.getByName(literal);
            if (zoneId == null) {
                return true;
            }

            if (!(addr instanceof Inet6Address)) {
                return false;
            }

            Inet6Address ipv6 = (Inet6Address) addr;
            return ipv6.isLinkLocalAddress() || ipv6.isSiteLocalAddress();
        } catch (UnknownHostException e) {
            return false;
        }
    }

    public static void main(String[] args) {
        String[] addresses = {
            "2001:db8::1",
            "::1",
            "fe80::1%eth0",
            "192.168.1.1",
            "not-an-address"
        };

        for (String addr : addresses) {
            System.out.printf("%-25s isIPv6=%b%n", addr, isIPv6(addr));
        }
    }
}
```

## Working with Inet6Address

```java
import java.net.*;

public class IPv6Info {
    public static void main(String[] args) throws Exception {
        // Parse an IPv6 address
        Inet6Address addr = (Inet6Address) InetAddress.getByName("2001:db8::1");

        System.out.println("Address: " + addr.getHostAddress());
        System.out.println("Is loopback: " + addr.isLoopbackAddress());
        System.out.println("Is link-local: " + addr.isLinkLocalAddress());
        System.out.println("Is any-local: " + addr.isAnyLocalAddress());

        // Get raw bytes (16 bytes for IPv6)
        byte[] bytes = addr.getAddress();
        System.out.println("Byte length: " + bytes.length);  // 16

        // Resolve hostname AAAA record
        InetAddress[] allAddrs = InetAddress.getAllByName("ipv6.google.com");
        for (InetAddress a : allAddrs) {
            if (a instanceof Inet6Address) {
                System.out.println("AAAA: " + a.getHostAddress());
            }
        }
    }
}
```

## Creating an IPv6 Server Socket

```java
import java.net.*;
import java.io.*;

public class IPv6Server {
    public static void main(String[] args) throws IOException {
        // Bind to IPv6 wildcard address "::"
        InetAddress bindAddr = InetAddress.getByName("::");

        // Create server socket on IPv6
        ServerSocket server = new ServerSocket(8080, 50, bindAddr);
        System.out.println("IPv6 server listening on [::]:8080");

        while (true) {
            Socket client = server.accept();
            InetAddress remoteAddr = client.getInetAddress();

            // Check if client is IPv6
            boolean isIPv6 = remoteAddr instanceof Inet6Address;
            System.out.printf("Connection from %s (IPv6=%b)%n",
                remoteAddr.getHostAddress(), isIPv6);

            // Handle in a thread
            new Thread(() -> handleClient(client)).start();
        }
    }

    private static void handleClient(Socket client) {
        try (Socket socket = client;
             PrintWriter out = new PrintWriter(socket.getOutputStream(), true)) {
            out.println("Hello from IPv6 Java server");
        } catch (IOException e) {
            System.err.println("Client error: " + e.getMessage());
        }
    }
}
```

## Connecting to an IPv6 Server

```java
import java.net.*;
import java.io.*;

public class IPv6Client {
    public static void main(String[] args) throws IOException {
        String serverAddr = "::1";
        int port = 8080;

        // Connect to the local IPv6 server
        InetAddress addr = InetAddress.getByName(serverAddr);

        try (Socket socket = new Socket(addr, port);
             BufferedReader in = new BufferedReader(
                 new InputStreamReader(socket.getInputStream()))) {
            System.out.println("Connected to: " + socket.getRemoteSocketAddress());
            System.out.println("Server says: " + in.readLine());
        }
    }
}
```

## IPv6 in Java HTTP Client (Java 11+)

```java
import java.net.*;
import java.net.http.*;
import java.time.Duration;

public class IPv6HttpClient {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(10))
            .build();

        // IPv6 addresses in URLs must be bracketed
        URI uri = URI.create("http://[2001:db8::1]:8080/api/status");

        HttpRequest request = HttpRequest.newBuilder()
            .uri(uri)
            .GET()
            .build();

        HttpResponse<String> response = client.send(
            request, HttpResponse.BodyHandlers.ofString());

        System.out.println("Status: " + response.statusCode());
        System.out.println("Body: " + response.body());
    }
}
```

## System Property for IPv6 Preference

Java can be configured to prefer IPv6 addresses during name resolution via system properties:

```bash
# Prefer IPv6 addresses when a hostname has both A and AAAA records
java -Djava.net.preferIPv6Addresses=true -jar app.jar
```

`java.net.preferIPv6Addresses` is read once at JVM startup, so set it on the command line rather than with `System.setProperty(...)` after the application has started.

## Formatting IPv6 for URLs

```java
import java.net.*;

public class IPv6Formatter {
    /**
     * Format an IP address for inclusion in a URL.
     * IPv6 addresses are wrapped in brackets per RFC 2732.
     * Scoped zone identifiers must use %25 in URIs per RFC 6874.
     */
    public static String formatForUrl(InetAddress addr) {
        if (addr instanceof Inet6Address) {
            return "[" + addr.getHostAddress().replace("%", "%25") + "]";
        }
        return addr.getHostAddress();
    }

    public static void main(String[] args) throws UnknownHostException {
        InetAddress v6 = InetAddress.getByName("2001:db8::1");
        InetAddress v4 = InetAddress.getByName("192.168.1.1");

        System.out.println(formatForUrl(v6));  // [2001:db8::1]
        System.out.println(formatForUrl(v4));  // 192.168.1.1
    }
}
```

## Conclusion

Java's `java.net` package provides robust IPv6 support through `InetAddress` and `Inet6Address`. Use `InetAddress.getByName("::")` to bind servers to all IPv6 interfaces, bracket IPv6 addresses in URLs per RFC 2732, and set `java.net.preferIPv6Addresses=true` to prioritize IPv6 resolution. Check for `Inet6Address` instances when protocol-specific logic is required.
