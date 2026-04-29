# How to Use Java InetAddress and Inet6Address for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, IPv6, InetAddress, Inet6Address, Networking

Description: Use Java's InetAddress and Inet6Address classes for IPv6 address operations including parsing, classification, and DNS resolution.

## InetAddress and Inet6Address Basics

Java represents IP addresses with `InetAddress`. IPv6 addresses use the `Inet6Address` subclass:

```java
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;

public class IPv6Basics {
    public static void main(String[] args) throws UnknownHostException {
        // Parse IPv6 address
        InetAddress addr = InetAddress.getByName("2001:db8::1");
        System.out.println(addr.getHostAddress());  // 2001:db8:0:0:0:0:0:1

        // Check if it's IPv6
        if (addr instanceof Inet6Address) {
            Inet6Address v6 = (Inet6Address) addr;
            System.out.println("IPv6: " + v6.getHostAddress());
            System.out.println("Scope ID: " + v6.getScopeId());
        }

        // Get raw bytes (16 bytes for IPv6)
        byte[] bytes = addr.getAddress();
        System.out.println("Length: " + bytes.length);  // 16

        // Create from raw bytes
        byte[] raw = new byte[16];
        raw[15] = 1;  // ::1
        InetAddress loopback = InetAddress.getByAddress(raw);
        System.out.println("From bytes: " + loopback.getHostAddress());  // 0:0:0:0:0:0:0:1

        // Well-known addresses
        System.out.println(InetAddress.getLoopbackAddress().getHostAddress());
    }
}
```

## Classifying IPv6 Addresses

```java
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;

public class IPv6Classifier {

    private static boolean isUniqueLocal(Inet6Address addr) {
        return (addr.getAddress()[0] & 0xfe) == 0xfc;
    }

    public static String classify(String addrStr) throws UnknownHostException {
        InetAddress addr = InetAddress.getByName(addrStr);

        if (!(addr instanceof Inet6Address)) return "IPv4";

        Inet6Address v6 = (Inet6Address) addr;

        if (v6.isLoopbackAddress())         return "loopback";
        if (v6.isAnyLocalAddress())         return "unspecified";
        if (v6.isMulticastAddress())        return "multicast";
        if (v6.isLinkLocalAddress())        return "link-local";
        if (v6.isSiteLocalAddress())        return "site-local (deprecated)";
        if (isUniqueLocal(v6))              return "unique-local (ULA)";

        // Check documentation prefix 2001:db8::/32
        byte[] b = v6.getAddress();
        if (b[0] == 0x20 && b[1] == 0x01 && b[2] == 0x0d && b[3] == (byte)0xb8) {
            return "documentation";
        }
        return "global unicast";
    }

    public static void main(String[] args) throws UnknownHostException {
        String[] tests = {"::1", "::", "ff02::1", "fe80::1",
                          "fc00::1", "2001:db8::1", "2001:4860:4860::8888"};

        for (String addr : tests) {
            System.out.printf("%-25s → %s%n", addr, classify(addr));
        }
    }
}
```

## DNS Resolution for IPv6

```java
import java.net.InetAddress;
import java.net.Inet6Address;
import java.net.UnknownHostException;

public class IPv6DNS {

    public static void lookupAAAA(String hostname) throws UnknownHostException {
        InetAddress[] addresses = InetAddress.getAllByName(hostname);

        System.out.println("AAAA records for " + hostname + ":");
        for (InetAddress addr : addresses) {
            if (addr instanceof Inet6Address) {
                System.out.println("  " + addr.getHostAddress());
            }
        }
    }

    public static String reversePtr(String ipv6Addr) throws UnknownHostException {
        InetAddress addr = InetAddress.getByName(ipv6Addr);
        byte[] b = addr.getAddress();

        // Build ip6.arpa name by reversing nibbles
        StringBuilder sb = new StringBuilder();
        for (int i = 15; i >= 0; i--) {
            sb.append(String.format("%x.%x.", b[i] & 0x0f, (b[i] >> 4) & 0x0f));
        }
        sb.append("ip6.arpa");
        return sb.toString();
    }

    public static void main(String[] args) throws UnknownHostException {
        lookupAAAA("ipv6.google.com");
        System.out.println("PTR: " + reversePtr("2001:4860:4860::8888"));
    }
}
```

## Listing Local IPv6 Addresses

```java
import java.net.*;
import java.util.*;

public class LocalIPv6Addresses {

    private static boolean isUniqueLocal(Inet6Address addr) {
        return (addr.getAddress()[0] & 0xfe) == 0xfc;
    }

    public static void listIPv6() throws SocketException {
        Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();

        while (interfaces.hasMoreElements()) {
            NetworkInterface iface = interfaces.nextElement();
            if (!iface.isUp()) continue;

            Enumeration<InetAddress> addresses = iface.getInetAddresses();
            while (addresses.hasMoreElements()) {
                InetAddress addr = addresses.nextElement();
                if (addr instanceof Inet6Address) {
                    Inet6Address v6 = (Inet6Address) addr;
                    String type = v6.isLinkLocalAddress() ? "link-local"
                                : v6.isLoopbackAddress() ? "loopback"
                                : v6.isSiteLocalAddress() ? "site-local (deprecated)"
                                : isUniqueLocal(v6) ? "unique-local (ULA)"
                                : "global";
                    System.out.printf("%-15s %s (%s)%n",
                        iface.getName(), v6.getHostAddress(), type);
                }
            }
        }
    }

    public static void main(String[] args) throws SocketException {
        listIPv6();
    }
}
```

## Conclusion

Java's `Inet6Address` provides the foundation for IPv6 operations. Use `InetAddress.getByName()` for parsing - it accepts both compressed and full notation, while `getHostAddress()` returns the full textual form for IPv6 output. Classification uses `isLoopbackAddress()`, `isMulticastAddress()`, `isLinkLocalAddress()`, and `isSiteLocalAddress()` for deprecated site-local addresses; ULA (`fc00::/7`) and documentation (`2001:db8::/32`) ranges need prefix checks. For DNS, `InetAddress.getAllByName()` returns all A and AAAA records; filter for `instanceof Inet6Address` to get only IPv6 results. The 16-byte array from `getAddress()` enables bit-level manipulation and custom prefix matching.
