# How to Parse IPv4 Addresses from Strings in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, IPv4, Parsing, InetAddress, String Processing, Networking

Description: Parse IPv4 addresses from various string formats in Java including dotted-decimal, integer, CIDR notation, and URL hostnames using InetAddress and manual parsing.

## Introduction

IPv4 addresses appear in many formats in real-world applications: dotted-decimal notation, CIDR blocks, packed integers, and embedded in URLs. Java provides `InetAddress` for standard IPv4 parsing, `URI` for extracting hosts from URLs, and requires manual handling for formats like CIDR or packed integers.

## Parsing Standard Dotted-Decimal

```java
import java.net.*;

public class IPv4Parser {
    
    /**
     * Parse a dotted-decimal IPv4 string (e.g., "192.168.1.1")
     * Returns the InetAddress or null if invalid.
     */
    public static InetAddress parseIPv4(String ipString) {
        if (ipString == null ||
            !ipString.matches("^(?:0|[1-9]\\d{0,2})(?:\\.(?:0|[1-9]\\d{0,2})){3}$")) {
            return null;
        }
        
        try {
            InetAddress addr = InetAddress.getByName(ipString);
            return addr instanceof Inet4Address ? addr : null;
        } catch (UnknownHostException e) {
            // Not a valid IP
        }
        return null;
    }
    
    public static void main(String[] args) {
        String[] ips = {"192.168.1.1", "10.0.0.256", "invalid", "::1"};
        for (String ip : ips) {
            InetAddress result = parseIPv4(ip);
            System.out.printf("%-20s -> %s%n", ip, result != null ? result.getHostAddress() : "INVALID");
        }
    }
}
```

## Converting Between Dotted-Decimal and Integer

```java
public class IPv4Converter {
    
    /**
     * Convert a dotted-decimal IPv4 string to a 32-bit integer.
     * e.g., "192.168.1.1" -> 3232235777
     */
    public static long ipv4ToLong(String ipString) {
        String[] parts = ipString.split("\\.", -1);
        if (parts.length != 4) {
            throw new IllegalArgumentException("Invalid IPv4: " + ipString);
        }
        
        long result = 0;
        for (String part : parts) {
            if (!part.matches("\\d{1,3}")) {
                throw new IllegalArgumentException("Invalid octet: " + part);
            }
            
            int octet = Integer.parseInt(part);
            if (octet < 0 || octet > 255) {
                throw new IllegalArgumentException("Invalid octet: " + octet);
            }
            result = (result << 8) | octet;
        }
        return result;
    }
    
    /**
     * Convert a 32-bit integer to dotted-decimal IPv4 string.
     * e.g., 3232235777 -> "192.168.1.1"
     */
    public static String longToIPv4(long ip) {
        if (ip < 0 || ip > 0xFFFFFFFFL) {
            throw new IllegalArgumentException("IPv4 integer out of range: " + ip);
        }
        
        return String.format("%d.%d.%d.%d",
            (ip >> 24) & 0xFF,
            (ip >> 16) & 0xFF,
            (ip >> 8) & 0xFF,
            ip & 0xFF
        );
    }
    
    public static void main(String[] args) {
        long ipInt = ipv4ToLong("192.168.1.1");
        System.out.println(ipInt);               // 3232235777
        System.out.println(longToIPv4(ipInt));   // 192.168.1.1
    }
}
```

## Parsing CIDR Notation

```java
public class CIDRParser {
    
    private final int prefix;
    private final long networkAddress;
    private final long broadcastAddress;
    
    public CIDRParser(String cidr) {
        String[] parts = cidr.split("/");
        if (parts.length != 2) {
            throw new IllegalArgumentException("Invalid CIDR: " + cidr);
        }
        
        this.prefix = Integer.parseInt(parts[1]);
        
        if (prefix < 0 || prefix > 32) {
            throw new IllegalArgumentException("Prefix length must be 0-32");
        }
        
        long baseIP = ipv4ToLong(parts[0]);
        long mask = prefix == 0 ? 0L : (0xFFFFFFFFL << (32 - prefix)) & 0xFFFFFFFFL;
        
        this.networkAddress = baseIP & mask;
        this.broadcastAddress = networkAddress | (~mask & 0xFFFFFFFFL);
    }
    
    public boolean contains(String ipString) {
        long ip = ipv4ToLong(ipString);
        return ip >= networkAddress && ip <= broadcastAddress;
    }
    
    public String getNetworkAddress() { return longToIPv4(networkAddress); }
    public String getBroadcastAddress() { return longToIPv4(broadcastAddress); }
    
    public long getUsableHostCount() {
        // /31 has two usable endpoints on point-to-point links (RFC 3021); /32 is a host route.
        if (prefix == 31) return 2;
        if (prefix == 32) return 1;
        return broadcastAddress - networkAddress - 1;
    }
    
    private static long ipv4ToLong(String ipString) {
        String[] parts = ipString.split("\\.", -1);
        if (parts.length != 4) {
            throw new IllegalArgumentException("Invalid IPv4: " + ipString);
        }
        
        long result = 0;
        for (String part : parts) {
            if (!part.matches("\\d{1,3}")) {
                throw new IllegalArgumentException("Invalid octet: " + part);
            }
            
            int octet = Integer.parseInt(part);
            if (octet < 0 || octet > 255) {
                throw new IllegalArgumentException("Invalid octet: " + octet);
            }
            result = (result << 8) | octet;
        }
        return result;
    }
    
    private static String longToIPv4(long ip) {
        if (ip < 0 || ip > 0xFFFFFFFFL) {
            throw new IllegalArgumentException("IPv4 integer out of range: " + ip);
        }
        
        return String.format("%d.%d.%d.%d",
            (ip >> 24) & 0xFF,
            (ip >> 16) & 0xFF,
            (ip >> 8) & 0xFF,
            ip & 0xFF
        );
    }
    
    public static void main(String[] args) {
        CIDRParser cidr = new CIDRParser("192.168.1.0/24");
        
        System.out.println("Network:   " + cidr.getNetworkAddress());
        System.out.println("Broadcast: " + cidr.getBroadcastAddress());
        System.out.println("Usable:    " + cidr.getUsableHostCount() + " hosts");
        System.out.println("Contains 192.168.1.50: " + cidr.contains("192.168.1.50"));
        System.out.println("Contains 192.168.2.1:  " + cidr.contains("192.168.2.1"));
    }
}
```

## Extracting IPv4 from a URL

```java
import java.net.*;

public class URLIPExtractor {
    
    public static String extractIPFromURL(String urlString) throws URISyntaxException {
        URI uri = new URI(urlString).parseServerAuthority();
        String host = uri.getHost();
        
        if (host == null ||
            !host.matches("^(?:0|[1-9]\\d{0,2})(?:\\.(?:0|[1-9]\\d{0,2})){3}$")) {
            return null;
        }
        
        try {
            InetAddress addr = InetAddress.getByName(host);
            return addr instanceof Inet4Address ? addr.getHostAddress() : null;
        } catch (UnknownHostException e) {
            // Host is not a valid IPv4 literal
        }
        
        return null;
    }
    
    public static void main(String[] args) throws URISyntaxException {
        System.out.println(extractIPFromURL("http://192.168.1.1/admin"));   // 192.168.1.1
        System.out.println(extractIPFromURL("https://10.0.0.1:8080/api"));  // 10.0.0.1
        System.out.println(extractIPFromURL("https://google.com"));          // null (hostname)
    }
}
```

## Parsing IPv4 from Log Lines

```java
import java.util.regex.*;
import java.util.*;

public class LogIPExtractor {
    
    private static final Pattern IP_PATTERN = Pattern.compile(
        "\\b((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}" +
        "(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b"
    );
    
    public static List<String> extractIPsFromLog(String logLine) {
        List<String> ips = new ArrayList<>();
        Matcher matcher = IP_PATTERN.matcher(logLine);
        while (matcher.find()) {
            ips.add(matcher.group());
        }
        return ips;
    }
    
    public static void main(String[] args) {
        String logLine = "2026-03-20 12:00:00 192.168.1.100 GET /api/data 200 from 10.0.0.5";
        System.out.println(extractIPsFromLog(logLine));   // [192.168.1.100, 10.0.0.5]
    }
}
```

## Conclusion

Java provides robust IPv4 parsing through `InetAddress` for standard dotted-decimal notation. For CIDR parsing, integer conversion, and log extraction, build custom utilities using `URI`, string manipulation, and regex. Always validate bounds (0-255 per octet) to avoid malformed input and unexpected parsing behavior.
