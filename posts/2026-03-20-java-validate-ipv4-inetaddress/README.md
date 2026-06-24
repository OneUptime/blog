# How to Validate IPv4 Addresses in Java Using InetAddress

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, IPv4, InetAddress, Validation, Networking, Security

Description: Validate IPv4 address strings in Java using InetAddress, regex, and Apache Commons Net, with methods to check format, reachability, and address type.

## Introduction

Validating IPv4 addresses is a common task in Java networking code - for input validation, configuration parsing, and security checks. Java provides several approaches ranging from the standard `InetAddress` class to regex validation and third-party libraries.

## Method 1: Using InetAddress

```java
import java.net.InetAddress;
import java.net.Inet4Address;
import java.net.UnknownHostException;

public class IPv4Validator {
    
    /**
     * Validate an IPv4 address string using InetAddress.
     * Returns true if the string is a canonical dotted-quad IPv4 literal.
     */
    public static boolean isValidIPv4(String ipString) {
        if (ipString == null || ipString.isEmpty()) {
            return false;
        }
        
        try {
            // getByName can resolve hostnames via the system resolver.
            // Compare the normalized address text back to the input so only
            // canonical dotted-quad IPv4 literals are accepted.
            InetAddress addr = InetAddress.getByName(ipString);
            
            // Ensure it's IPv4 (not IPv6) and in canonical dotted-quad form.
            return (addr instanceof Inet4Address) && 
                   addr.getHostAddress().equals(ipString);
        } catch (UnknownHostException e) {
            return false;
        }
    }
    
    public static void main(String[] args) {
        String[] testCases = {
            "192.168.1.1",      // Valid
            "10.0.0.0",         // Valid (network address)
            "255.255.255.255",  // Valid (broadcast)
            "0.0.0.0",          // Valid
            "256.1.1.1",        // Invalid - octet > 255
            "192.168.1",        // Invalid - only 3 octets
            "192.168.1.1.1",    // Invalid - 5 octets
            "abc.def.ghi.jkl",  // Invalid - non-numeric
            "",                  // Invalid - empty
            null                 // Invalid - null
        };
        
        for (String ip : testCases) {
            System.out.printf("%-20s -> %s%n", ip, isValidIPv4(ip) ? "VALID" : "INVALID");
        }
    }
}
```

## Method 2: Regex Validation (Fast, No DNS)

```java
import java.util.regex.Pattern;

public class IPv4RegexValidator {
    
    // Matches exactly 4 octets of 0-255 in dotted-decimal notation
    private static final Pattern IPV4_PATTERN = Pattern.compile(
        "^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}" +
        "(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
    );
    
    public static boolean isValidIPv4(String ip) {
        return ip != null && IPV4_PATTERN.matcher(ip).matches();
    }
    
    // Validate with CIDR notation (e.g., "192.168.1.0/24")
    private static final Pattern CIDR_PATTERN = Pattern.compile(
        "^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}" +
        "(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)" +
        "/(3[0-2]|[12][0-9]|[0-9])$"
    );
    
    public static boolean isValidCIDR(String cidr) {
        return cidr != null && CIDR_PATTERN.matcher(cidr).matches();
    }
}
```

## Method 3: Checking Address Types

```java
import java.net.InetAddress;
import java.net.Inet4Address;

public class IPv4Inspector {
    
    public static boolean isLoopback(String ip) throws Exception {
        InetAddress addr = InetAddress.getByName(ip);
        return addr.isLoopbackAddress();
    }
    
    public static boolean isPrivate(String ip) throws Exception {
        InetAddress addr = InetAddress.getByName(ip);
        return addr.isSiteLocalAddress();
    }
    
    public static boolean isMulticast(String ip) throws Exception {
        InetAddress addr = InetAddress.getByName(ip);
        return addr.isMulticastAddress();
    }
    
    public static boolean isLinkLocal(String ip) throws Exception {
        InetAddress addr = InetAddress.getByName(ip);
        return addr.isLinkLocalAddress();
    }
    
    public static void inspectIP(String ip) {
        try {
            InetAddress addr = InetAddress.getByName(ip);
            if (!(addr instanceof Inet4Address)) {
                System.out.println(ip + " is not IPv4");
                return;
            }
            
            System.out.printf("IP: %-20s Loopback: %-6b Private: %-6b Multicast: %-6b Link-local: %b%n",
                ip, 
                addr.isLoopbackAddress(),
                addr.isSiteLocalAddress(),
                addr.isMulticastAddress(),
                addr.isLinkLocalAddress()
            );
        } catch (Exception e) {
            System.out.println(ip + " is invalid: " + e.getMessage());
        }
    }
    
    public static void main(String[] args) {
        inspectIP("192.168.1.1");    // Private
        inspectIP("127.0.0.1");      // Loopback
        inspectIP("8.8.8.8");        // Public
        inspectIP("224.0.0.1");      // Multicast
        inspectIP("169.254.1.1");    // Link-local
    }
}
```

## Method 4: Checking Reachability

```java
import java.net.InetAddress;

public class ReachabilityChecker {
    
    /**
     * Check if a host is reachable within a timeout.
     * Uses ICMP echo requests (requires elevated privileges on some systems)
     * or TCP port 7.
     */
    public static boolean isReachable(String host, int timeoutMs) {
        try {
            InetAddress addr = InetAddress.getByName(host);
            return addr.isReachable(timeoutMs);
        } catch (Exception e) {
            return false;
        }
    }
    
    public static void main(String[] args) {
        System.out.println("8.8.8.8 reachable: " + isReachable("8.8.8.8", 3000));
        System.out.println("192.0.2.1 reachable: " + isReachable("192.0.2.1", 3000));
    }
}
```

## Using Apache Commons Validator

For production code, Apache Commons Validator provides well-tested validators:

```xml
<!-- pom.xml -->
<dependency>
    <groupId>commons-validator</groupId>
    <artifactId>commons-validator</artifactId>
    <version>1.10.1</version>
</dependency>
```

```java
import org.apache.commons.validator.routines.InetAddressValidator;

InetAddressValidator validator = InetAddressValidator.getInstance();
boolean valid = validator.isValidInet4Address("192.168.1.1");
```

## Conclusion

Use regex validation for pure format checking (fast, no exceptions), `InetAddress` when you need address parsing or type checking (loopback, private, multicast), and Apache Commons Validator for production-grade validation with minimal code. Always validate IPv4 addresses from user input before using them in network operations.
