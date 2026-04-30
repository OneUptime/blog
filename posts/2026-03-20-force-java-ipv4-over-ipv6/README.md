# How to Force Java to Use IPv4 Instead of IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, IPv4, IPv6, Dual-Stack, JVM, Networking, System Properties

Description: Learn how to configure the JVM to prefer or exclusively use IPv4 networking instead of IPv6 using system properties and programmatic approaches.

## The JVM Dual-Stack Behavior

On dual-stack systems (where both IPv4 and IPv6 are available), the JVM uses an IPv6 socket by default when IPv6 is available, but it prefers IPv4 addresses over IPv6 addresses during hostname resolution unless configured otherwise. This can still cause issues when you need IPv4-only sockets.

## Method 1: JVM System Properties (Most Common)

```bash
# Force IPv4-only sockets by setting the system property at JVM startup

java -Djava.net.preferIPv4Stack=true -jar myapp.jar
```

## Difference Between the Two Properties

| Property | Effect |
|----------|--------|
| `java.net.preferIPv4Stack=true` | Disable IPv6 entirely; all sockets use IPv4 |
| `java.net.preferIPv6Addresses=true` | Prefer IPv6 addresses when both IPv4/IPv6 are available |

Use `preferIPv4Stack=true` when you need guaranteed IPv4-only operation. Leave `preferIPv6Addresses` unset (or `false`) when you want the default IPv4 address preference but still allow IPv6-capable sockets.

## Method 2: These Properties Must Be Set at JVM Startup

`java.net.preferIPv4Stack` and `java.net.preferIPv6Addresses` are checked only once at JVM startup. Set them with `-D` when launching the JVM instead of calling `System.setProperty(...)` inside application code.

## Method 3: Explicit IPv4 Resolution

When you can't set global properties, resolve hostnames explicitly to IPv4:

```java
import java.io.IOException;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.Socket;
import java.net.UnknownHostException;

public class ForceIPv4Lookup {
    public static Inet4Address getIPv4Only(String hostname) throws UnknownHostException {
        InetAddress[] addresses = InetAddress.getAllByName(hostname);
        for (InetAddress addr : addresses) {
            if (addr instanceof Inet4Address) {
                return (Inet4Address) addr;
            }
        }
        throw new UnknownHostException("No IPv4 address for: " + hostname);
    }

    public static void main(String[] args) throws IOException {
        Inet4Address ipv4Addr = getIPv4Only("api.example.com");
        try (Socket socket = new Socket(ipv4Addr, 443)) {
            System.out.println("Connected via: " + socket.getRemoteSocketAddress());
        }
    }
}
```

## Method 4: Maven/Gradle Test Configuration

```xml
<!-- pom.xml - Force IPv4 in tests -->
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <argLine>-Djava.net.preferIPv4Stack=true</argLine>
    </configuration>
</plugin>
```

```groovy
// build.gradle
test {
    jvmArgs '-Djava.net.preferIPv4Stack=true'
}
```

## Method 5: Spring Boot Configuration

Because `java.net.preferIPv4Stack` is checked at JVM startup, set it as a JVM argument when launching Spring Boot:

```bash
# Maven
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Djava.net.preferIPv4Stack=true"
```

```groovy
// build.gradle
bootRun {
    jvmArgs '-Djava.net.preferIPv4Stack=true'
}
```

## Checking the Active Settings

```java
import java.net.Inet4Address;
import java.net.InetAddress;

public class VerifyIPv4 {
    public static void main(String[] args) throws Exception {
        System.out.println("preferIPv4Stack: " +
            System.getProperty("java.net.preferIPv4Stack", "not set"));
        System.out.println("preferIPv6Addresses: " +
            System.getProperty("java.net.preferIPv6Addresses", "not set"));

        for (InetAddress addr : InetAddress.getAllByName("example.com")) {
            System.out.println(addr.getHostAddress() + " -> " +
                (addr instanceof Inet4Address ? "IPv4" : "IPv6"));
        }
    }
}
```

## Conclusion

The quickest way to force Java to use IPv4-only sockets is `java -Djava.net.preferIPv4Stack=true`. Java already prefers IPv4 addresses over IPv6 during name resolution on dual-stack systems by default, while `java.net.preferIPv6Addresses=true` changes that preference in the other direction. For code-level control, use explicit `Inet4Address` filtering instead of trying to set these startup-only properties with `System.setProperty(...)`.
