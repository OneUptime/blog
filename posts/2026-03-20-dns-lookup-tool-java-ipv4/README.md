# How to Build a Simple DNS Lookup Tool in Java for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, DNS, IPv4, InetAddress, Networking, DNS Lookup

Description: Learn how to build a command-line DNS lookup tool in Java that resolves hostnames to IPv4 addresses and performs reverse lookups.

## Complete DNS Lookup Tool

```java
import java.net.*;
import java.util.*;

public class DnsLookupTool {
    public static void main(String[] args) {
        if (args.length == 0) {
            System.out.println("Usage: java DnsLookupTool <hostname|ip> [hostname2 ...]");
            System.exit(1);
        }

        for (String target : args) {
            System.out.printf("=== %s ===%n", target);
            if (looksLikeIPv4(target)) {
                reverseLookup(target);
            } else {
                forwardLookup(target);
            }
            System.out.println();
        }
    }

    private static boolean looksLikeIPv4(String s) {
        String[] parts = s.split("\\.", -1);
        if (parts.length != 4) {
            return false;
        }

        for (String part : parts) {
            if (part.isEmpty() || part.length() > 3) {
                return false;
            }
            for (int i = 0; i < part.length(); i++) {
                if (!Character.isDigit(part.charAt(i))) {
                    return false;
                }
            }

            int value = Integer.parseInt(part);
            if (value < 0 || value > 255) {
                return false;
            }
        }
        return true;
    }

    private static void forwardLookup(String hostname) {
        try {
            InetAddress[] addresses = InetAddress.getAllByName(hostname);
            System.out.printf("Forward lookup for: %s%n", hostname);

            int ipv4Count = 0;
            for (InetAddress addr : addresses) {
                if (addr instanceof Inet4Address) {
                    System.out.printf("  A record:    %s%n", addr.getHostAddress());
                    ipv4Count++;
                }
            }
            if (ipv4Count == 0) {
                System.out.println("  No IPv4 addresses found");
            } else {
                System.out.printf("Total: %d IPv4 address%s%n", ipv4Count, ipv4Count == 1 ? "" : "es");
            }

        } catch (UnknownHostException e) {
            System.err.printf("Not found: %s (%s)%n", hostname, e.getMessage());
        }
    }

    private static void reverseLookup(String ip) {
        try {
            InetAddress addr = InetAddress.getByName(ip);
            System.out.printf("Reverse lookup for: %s%n", ip);

            // getCanonicalHostName() performs reverse lookup via the system resolver
            String hostname = addr.getCanonicalHostName();
            if (hostname.equals(addr.getHostAddress())) {
                System.out.println("  No reverse lookup name found");
            } else {
                System.out.printf("  Host name:     %s%n", hostname);
            }

            // Classify the address
            System.out.printf("  isLoopback:    %b%n", addr.isLoopbackAddress());
            System.out.printf("  isSiteLocal:   %b%n", addr.isSiteLocalAddress());
            System.out.printf("  isMulticast:   %b%n", addr.isMulticastAddress());
            System.out.printf("  isReachable:   ");
            System.out.printf("%b%n", addr.isReachable(2000));

        } catch (Exception e) {
            System.err.printf("Error looking up %s: %s%n", ip, e.getMessage());
        }
    }
}
```

## Caching DNS Resolver

```java
import java.net.*;
import java.util.*;
import java.util.concurrent.*;

public class CachingDnsResolver {
    private final Map<String, List<String>> cache = new ConcurrentHashMap<>();
    private final Map<String, Long> cacheTimestamps = new ConcurrentHashMap<>();
    private final long ttlMillis;

    public CachingDnsResolver(long ttlSeconds) {
        this.ttlMillis = ttlSeconds * 1000;
    }

    public List<String> resolveIPv4(String hostname) throws UnknownHostException {
        // Check cache
        Long timestamp = cacheTimestamps.get(hostname);
        if (timestamp != null && System.currentTimeMillis() - timestamp < ttlMillis) {
            System.out.println("[cache hit] " + hostname);
            return cache.get(hostname);
        }

        // Perform name lookup
        InetAddress[] addresses = InetAddress.getAllByName(hostname);
        List<String> ipv4s = new ArrayList<>();
        for (InetAddress addr : addresses) {
            if (addr instanceof Inet4Address) {
                ipv4s.add(addr.getHostAddress());
            }
        }

        if (!ipv4s.isEmpty()) {
            cache.put(hostname, ipv4s);
            cacheTimestamps.put(hostname, System.currentTimeMillis());
        }

        return ipv4s;
    }

    public static void main(String[] args) throws Exception {
        CachingDnsResolver resolver = new CachingDnsResolver(60);  // 60-second TTL

        // First call: resolve and populate the application cache
        System.out.println(resolver.resolveIPv4("google.com"));
        // Second call: application cache hit
        System.out.println(resolver.resolveIPv4("google.com"));
    }
}
```

## Parallel DNS Resolution

```java
import java.net.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.*;

public class ParallelDnsResolver {
    public static Map<String, List<String>> resolveAll(List<String> hostnames)
            throws InterruptedException, ExecutionException {

        ExecutorService executor = Executors.newFixedThreadPool(20);
        Map<String, Future<List<String>>> futures = new LinkedHashMap<>();

        for (String hostname : hostnames) {
            futures.put(hostname, executor.submit(() -> {
                try {
                    return Arrays.stream(InetAddress.getAllByName(hostname))
                        .filter(a -> a instanceof Inet4Address)
                        .map(InetAddress::getHostAddress)
                        .collect(Collectors.toList());
                } catch (UnknownHostException e) {
                    return Collections.emptyList();
                }
            }));
        }

        executor.shutdown();
        executor.awaitTermination(30, TimeUnit.SECONDS);

        Map<String, List<String>> results = new LinkedHashMap<>();
        for (Map.Entry<String, Future<List<String>>> entry : futures.entrySet()) {
            results.put(entry.getKey(), entry.getValue().get());
        }
        return results;
    }
}
```

## Conclusion

Java's `InetAddress.getAllByName()` is the core name-resolution API used here. Filter results with `instanceof Inet4Address` for IPv4-only output. `getCanonicalHostName()` performs reverse lookup through the system resolver. For production use, add a TTL-based in-memory cache to avoid redundant lookups, and use parallel resolution when processing many hostnames.
