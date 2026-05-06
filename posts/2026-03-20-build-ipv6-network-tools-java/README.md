# How to Build IPv6 Network Tools in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, IPv6, Network Tools, DNS, Port Scanner, Ping, CLI

Description: Build practical IPv6 network diagnostic tools in Java including reachability checkers, port scanners, DNS lookups, and subnet calculators.

## IPv6 Reachability Checker

```java
import java.net.*;
import java.util.concurrent.*;

public class IPv6Reachability {

    public static boolean checkTCP(String addr, int port, int timeoutMs) {
        try (Socket s = new Socket()) {
            s.connect(new InetSocketAddress(addr, port), timeoutMs);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public static boolean checkPing(String addr, int timeoutMs) {
        try {
            InetAddress inet = InetAddress.getByName(addr);
            return inet.isReachable(timeoutMs);
        } catch (Exception e) {
            return false;
        }
    }

    public static void main(String[] args) {
        String[][] targets = {
            {"2001:4860:4860::8888", "53"},
            {"2620:fe::fe", "53"},
            {"::1", "22"},
        };

        for (String[] t : targets) {
            boolean ok = checkTCP(t[0], Integer.parseInt(t[1]), 3000);
            System.out.printf("[%s]:%s → %s%n", t[0], t[1],
                ok ? "OPEN" : "CLOSED/TIMEOUT");
        }
    }
}
```

## Concurrent IPv6 Port Scanner

```java
import java.net.*;
import java.util.*;
import java.util.concurrent.*;

public class IPv6PortScanner {

    public static Map<Integer, Boolean> scan(String host, List<Integer> ports, int timeout) {
        Map<Integer, Boolean> results = new ConcurrentHashMap<>();
        ExecutorService executor = Executors.newFixedThreadPool(20);
        List<Future<?>> futures = new ArrayList<>();

        for (int port : ports) {
            final int p = port;
            futures.add(executor.submit(() -> {
                try (Socket s = new Socket()) {
                    s.connect(new InetSocketAddress(host, p), timeout);
                    results.put(p, true);
                } catch (Exception e) {
                    results.put(p, false);
                }
            }));
        }

        for (Future<?> f : futures) {
            try { f.get(); } catch (Exception ignored) {}
        }

        executor.shutdown();
        return results;
    }

    public static void main(String[] args) throws Exception {
        String target = args.length > 0 ? args[0] : "::1";
        List<Integer> ports = Arrays.asList(22, 53, 80, 443, 8080, 8443);

        System.out.println("Scanning [" + target + "]...");
        Map<Integer, Boolean> results = scan(target, ports, 2000);

        results.entrySet().stream()
            .filter(Map.Entry::getValue)
            .forEach(e -> System.out.println("  OPEN: " + e.getKey()));
    }
}
```

## IPv6 DNS Lookup Tool

```java
import java.net.*;
import java.util.*;

public class IPv6DNSLookup {

    public static List<String> lookupAAAA(String hostname) {
        List<String> addresses = new ArrayList<>();
        try {
            for (InetAddress addr : InetAddress.getAllByName(hostname)) {
                if (addr instanceof Inet6Address) {
                    addresses.add(addr.getHostAddress());
                }
            }
        } catch (UnknownHostException e) {
            System.err.println("DNS resolution failed: " + e.getMessage());
        }
        return addresses;
    }

    public static String reverseLookup(String ipv6Addr) {
        try {
            InetAddress addr = InetAddress.getByName(ipv6Addr);
            if (!(addr instanceof Inet6Address)) {
                return "Not an IPv6 address";
            }
            String canonical = addr.getCanonicalHostName();
            return canonical.equals(addr.getHostAddress()) ? "No PTR record found" : canonical;
        } catch (UnknownHostException e) {
            return "Invalid IPv6 address";
        }
    }

    public static String buildPTRName(String ipv6Addr) throws UnknownHostException {
        InetAddress addr = InetAddress.getByName(ipv6Addr);
        if (!(addr instanceof Inet6Address)) {
            throw new UnknownHostException("Not an IPv6 address: " + ipv6Addr);
        }
        byte[] b = addr.getAddress();
        StringBuilder sb = new StringBuilder();
        for (int i = 15; i >= 0; i--) {
            sb.append(String.format("%x.%x.", b[i] & 0x0f, (b[i] >> 4) & 0x0f));
        }
        sb.append("ip6.arpa");
        return sb.toString();
    }

    public static void main(String[] args) throws Exception {
        String host = "ipv6.google.com";
        System.out.println("AAAA for " + host + ":");
        lookupAAAA(host).forEach(a -> System.out.println("  " + a));

        String addr = "2001:4860:4860::8888";
        System.out.println("PTR for " + addr + ": " + reverseLookup(addr));
        System.out.println("PTR name: " + buildPTRName(addr));
    }
}
```

## IPv6 Subnet Calculator

```java
import java.net.*;
import java.math.BigInteger;

public class IPv6SubnetCalc {

    public static void calculate(String cidr) throws UnknownHostException {
        String[] parts = cidr.split("/");
        if (parts.length != 2) {
            throw new IllegalArgumentException("CIDR must be in address/prefix form");
        }
        String addrStr = parts[0];
        int prefixLen = Integer.parseInt(parts[1]);
        if (prefixLen < 0 || prefixLen > 128) {
            throw new IllegalArgumentException("IPv6 prefix length must be between 0 and 128");
        }

        InetAddress addr = InetAddress.getByName(addrStr);
        if (!(addr instanceof Inet6Address)) {
            throw new UnknownHostException("Not an IPv6 address: " + addrStr);
        }
        byte[] addrBytes = addr.getAddress();

        // Create network mask
        byte[] maskBytes = new byte[16];
        for (int i = 0; i < prefixLen; i++) {
            maskBytes[i / 8] |= (byte) (0x80 >> (i % 8));
        }

        // Calculate network address
        byte[] networkBytes = new byte[16];
        for (int i = 0; i < 16; i++) {
            networkBytes[i] = (byte) (addrBytes[i] & maskBytes[i]);
        }

        InetAddress network = InetAddress.getByAddress(networkBytes);
        BigInteger hostCount = BigInteger.ONE.shiftLeft(128 - prefixLen);

        System.out.println("Prefix:    " + cidr);
        System.out.println("Network:   " + network.getHostAddress());
        System.out.println("Prefix len: /" + prefixLen);
        System.out.println("Addresses: 2^" + (128 - prefixLen) + " = " + hostCount);
    }

    public static void main(String[] args) throws Exception {
        calculate("2001:db8::/32");
        calculate("2001:db8:1::/48");
        calculate("2001:db8:1:1::/64");
    }
}
```

## Conclusion

Java's networking libraries enable practical IPv6 tooling. `Socket.connect(InetSocketAddress, timeout)` handles TCP reachability checks. `ExecutorService` with a thread pool enables concurrent port scanning. `InetAddress.getAllByName()` resolves AAAA records alongside A records. BigInteger arithmetic handles the large address counts in IPv6 subnets (up to 2^128). These components combine into command-line IPv6 diagnostic tools for network engineers.
