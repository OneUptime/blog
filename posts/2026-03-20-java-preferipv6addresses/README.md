# How to Configure java.net.preferIPv6Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, IPv6, JVM, Configuration, Networking, DNS

Description: Configure Java's IPv6 address preference system properties to control whether JVM applications use IPv4 or IPv6 when both are available.

## The System Properties

Java provides two key system properties for controlling IP version preference:

| Property | Values | Effect |
|---|---|---|
| `java.net.preferIPv4Stack` | `true` / `false` (default) | `true` forces IPv4-only sockets; the application cannot communicate with IPv6-only hosts |
| `java.net.preferIPv6Addresses` | `true` / `false` (default) / `system` | Controls address ordering when a host has both IPv4 and IPv6 addresses |

The `preferIPv6Addresses` values:
- `false` (default): prefer IPv4 addresses when a host has both IPv4 and IPv6 addresses
- `true`: prefer IPv6 addresses when a host has both IPv4 and IPv6 addresses
- `system`: preserve the order returned by the system resolver

Both properties are checked only once at JVM startup, so set them with `-D...` when launching the JVM.

## Setting Properties from Command Line

```bash
# Prefer IPv6 when resolving hostnames

java -Djava.net.preferIPv6Addresses=true -jar app.jar

# Force IPv4-only sockets
java -Djava.net.preferIPv4Stack=true -jar app.jar

# Preserve resolver order returned by the system
java -Djava.net.preferIPv6Addresses=system -jar app.jar
```

## Checking Properties in Code

These properties are checked only once at JVM startup, so inspect them in code but set them on the `java` command line.

```java
import java.net.InetAddress;

public class IPv6Preference {

    public static void demonstratePreference() throws Exception {
        System.out.println("preferIPv6Addresses=" +
            System.getProperty("java.net.preferIPv6Addresses", "false"));

        InetAddress[] addrs = InetAddress.getAllByName("example.com");
        System.out.println("Resolved order:");
        for (InetAddress a : addrs) {
            System.out.println("  " + a.getHostAddress() + " (" +
                (a instanceof java.net.Inet6Address ? "IPv6" : "IPv4") + ")");
        }
    }

    public static void main(String[] args) throws Exception {
        demonstratePreference();
    }
}
```

## Effect on InetAddress.getByName()

Run this class with different `-Djava.net.preferIPv6Addresses=...` values to see which address `getByName()` returns for the current JVM configuration.

```java
import java.net.*;

public class PreferenceEffect {

    public static void checkPreference(String hostname) throws UnknownHostException {
        InetAddress primary = InetAddress.getByName(hostname);
        System.out.printf("getByName(%s) with preferIPv6Addresses=%s → %s (%s)%n",
            hostname,
            System.getProperty("java.net.preferIPv6Addresses", "false"),
            primary.getHostAddress(),
            primary instanceof Inet6Address ? "IPv6" : "IPv4"
        );
    }

    public static void main(String[] args) throws Exception {
        checkPreference("example.com");
    }
}
```

## Spring Boot Configuration

In Spring Boot, use `application.properties` for IPv6 server binding and JVM args for `java.net.preferIPv6Addresses`:

```properties
# application.properties - for server binding
server.address=::
server.port=8080
```

```bash
# Docker / Kubernetes deployment with IPv6 preference
JAVA_OPTS="-Djava.net.preferIPv6Addresses=true"
java $JAVA_OPTS -jar app.jar
```

```java
// Programmatic check of the active setting
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        System.out.println("java.net.preferIPv6Addresses=" +
            System.getProperty("java.net.preferIPv6Addresses", "false"));
        SpringApplication.run(Application.class, args);
    }
}
```

## Checking Effective Preference

```java
import java.net.*;

public class CheckEffectivePreference {

    public static void printNetworkInfo(String hostname) throws Exception {
        System.out.println("java.net.preferIPv4Stack: " +
            System.getProperty("java.net.preferIPv4Stack", "false"));
        System.out.println("java.net.preferIPv6Addresses: " +
            System.getProperty("java.net.preferIPv6Addresses", "false"));

        InetAddress[] resolved = InetAddress.getAllByName(hostname);
        System.out.println("Resolved addresses for " + hostname + ":");
        for (InetAddress addr : resolved) {
            System.out.println("  " + addr.getHostAddress() + " (" +
                (addr instanceof Inet6Address ? "IPv6" : "IPv4") + ")");
        }

        // Check the loopback address type
        InetAddress loopback = InetAddress.getLoopbackAddress();
        System.out.println("Loopback address: " + loopback.getHostAddress() +
            " (" + (loopback instanceof Inet6Address ? "IPv6" : "IPv4") + ")");
    }

    public static void main(String[] args) throws Exception {
        printNetworkInfo("example.com");
    }
}
```

## Conclusion

`java.net.preferIPv6Addresses` controls address ordering when Java resolves a host with both IPv4 and IPv6 addresses. Set it to `true` to prefer IPv6 when both address families are available. The `system` value preserves the order returned by the system resolver. `java.net.preferIPv4Stack=true` switches Java to IPv4-only sockets, which means the application cannot communicate with IPv6-only hosts. Because both properties are checked once at JVM startup, pass them as JVM system properties via `-D...` or `JAVA_TOOL_OPTIONS`.
