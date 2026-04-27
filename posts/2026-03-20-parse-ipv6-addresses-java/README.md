# How to Parse IPv6 Addresses in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, IPv6, Parsing, InetAddress, Networking

Description: Parse IPv6 addresses in Java from strings, URLs, socket notation, log lines, and network packets using standard Java libraries.

## Parsing with InetAddress

```java
import java.net.InetAddress;
import java.net.Inet6Address;
import java.net.UnknownHostException;

public class IPv6Parser {

    public static Inet6Address parseIPv6(String s) throws IllegalArgumentException {
        try {
            InetAddress addr = InetAddress.getByName(s);
            if (addr instanceof Inet6Address) {
                return (Inet6Address) addr;
            }
            throw new IllegalArgumentException("Not an IPv6 address: " + s);
        } catch (UnknownHostException e) {
            throw new IllegalArgumentException("Invalid IPv6 address: " + s, e);
        }
    }

    public static void main(String[] args) {
        String[] tests = {
            "2001:db8::1",
            "::1",
            "::",
            "2001:0db8:0000:0000:0000:0000:0000:0001",
            "::ffff:192.168.1.1",  // IPv4-mapped
        };

        for (String t : tests) {
            try {
                Inet6Address addr = parseIPv6(t);
                System.out.printf("%-40s → %s%n", t, addr.getHostAddress());
            } catch (IllegalArgumentException e) {
                System.out.printf("%-40s → ERROR: %s%n", t, e.getMessage());
            }
        }
    }
}
```

## Parsing Bracketed Socket Addresses

IPv6 socket addresses in HTTP and configuration files are bracketed: `[2001:db8::1]:8080`.

```java
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URISyntaxException;

public class SocketAddrParser {

    public static InetSocketAddress parseBracketed(String s) throws URISyntaxException {
        // Use URI parsing to handle brackets
        URI uri = new URI("tcp://" + s);
        String host = uri.getHost();  // For IPv6, includes the surrounding brackets
        int port = uri.getPort();

        if (host == null || port == -1) {
            throw new IllegalArgumentException("Cannot parse: " + s);
        }

        return new InetSocketAddress(host, port);
    }

    public static void main(String[] args) throws URISyntaxException {
        String[] addrs = {
            "[2001:db8::1]:8080",
            "[::1]:443",
            "192.168.1.1:80",      // IPv4 also works
        };

        for (String addr : addrs) {
            InetSocketAddress sa = parseBracketed(addr);
            System.out.printf("%s → %s port %d%n",
                addr, sa.getAddress().getHostAddress(), sa.getPort());
        }
    }
}
```

## Parsing IPv6 from URLs

```java
import java.net.*;

public class URLIPv6Parser {

    public static void parseURL(String rawUrl) throws MalformedURLException, URISyntaxException {
        URI uri = new URI(rawUrl);
        URL url = uri.toURL();

        String host = url.getHost();  // For IPv6, includes the surrounding brackets
        int port = url.getPort();
        String path = url.getPath();

        System.out.printf("URL: %s%n  host=%s port=%d path=%s%n",
            rawUrl, host, port, path);

        // Try to classify the host as IPv6
        try {
            InetAddress addr = InetAddress.getByName(host);
            if (addr instanceof Inet6Address) {
                System.out.printf("  → IPv6 address%n");
            }
        } catch (UnknownHostException e) {
            System.out.printf("  → hostname (not an IP literal)%n");
        }
    }

    public static void main(String[] args) throws Exception {
        parseURL("http://[2001:db8::1]:8080/api/v1");
        parseURL("https://[::1]/health");
        parseURL("http://example.com/");
    }
}
```

## Extracting IPv6 Addresses from Log Lines

```java
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.net.InetAddress;
import java.net.Inet6Address;

public class LogIPv6Extractor {

    // Simplified IPv6 pattern - handles common formats
    private static final Pattern IPV6_PATTERN = Pattern.compile(
        "(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}" +
        "|(?:[0-9a-fA-F]{1,4}:)+:(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}" +
        "|(?:[0-9a-fA-F]{1,4}:){1,7}:" +
        "|::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}" +
        "|::"
    );

    public static List<String> extractIPv6(String line) {
        List<String> result = new ArrayList<>();
        Matcher m = IPV6_PATTERN.matcher(line);

        while (m.find()) {
            String candidate = m.group();
            try {
                InetAddress addr = InetAddress.getByName(candidate);
                if (addr instanceof Inet6Address) {
                    result.add(addr.getHostAddress());
                }
            } catch (Exception ignored) {}
        }

        return result;
    }

    public static void main(String[] args) {
        String log = "2026-01-01 10:00:00 client 2001:db8::42 request from 2001:db8::1";
        List<String> addrs = extractIPv6(log);
        System.out.println("Found IPv6 addresses:");
        addrs.forEach(a -> System.out.println("  " + a));
    }
}
```

## Parsing IPv6 from Packet Bytes

```java
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Arrays;

public class PacketIPv6Parser {

    // Parse source and destination IPv6 addresses from a raw IPv6 header
    public static InetAddress[] parseIPv6Header(byte[] header) throws UnknownHostException {
        if (header.length < 40) {
            throw new IllegalArgumentException("IPv6 header must be at least 40 bytes");
        }

        // Source address: bytes 8-23
        byte[] src = Arrays.copyOfRange(header, 8, 24);
        // Destination address: bytes 24-39
        byte[] dst = Arrays.copyOfRange(header, 24, 40);

        return new InetAddress[]{
            InetAddress.getByAddress(src),
            InetAddress.getByAddress(dst)
        };
    }

    public static void main(String[] args) throws UnknownHostException {
        byte[] header = new byte[40];
        header[0] = 0x60;  // IPv6 version

        // Source: 2001:db8::1
        byte[] src = {0x20,0x01, 0x0d,(byte)0xb8, 0,0, 0,0, 0,0, 0,0, 0,0, 0,1};
        System.arraycopy(src, 0, header, 8, 16);

        // Dest: 2001:db8::2
        byte[] dst = {0x20,0x01, 0x0d,(byte)0xb8, 0,0, 0,0, 0,0, 0,0, 0,0, 0,2};
        System.arraycopy(dst, 0, header, 24, 16);

        InetAddress[] addrs = parseIPv6Header(header);
        System.out.println("src=" + addrs[0].getHostAddress());
        System.out.println("dst=" + addrs[1].getHostAddress());
    }
}
```

## Conclusion

Java's `InetAddress.getByName()` is the primary IPv6 parsing entry point - it accepts all standard IPv6 formats including compressed notation. Note that IPv4-mapped IPv6 addresses (e.g. `::ffff:192.168.1.1`) are accepted but converted to an `Inet4Address`, so they will not pass an `instanceof Inet6Address` check. For socket addresses, `URI` parsing handles the bracket notation. Regex extraction from logs needs post-parsing validation via `InetAddress` to confirm validity. Raw bytes parse via `InetAddress.getByAddress(byte[16])`. Always catch `UnknownHostException` and convert it into a meaningful application exception at the API boundary.
