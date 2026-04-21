# How to Test IPv6 Networking Code in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, IPv6, Testing, JUnit, Mocking, Integration Test

Description: Test IPv6 networking code in Java using JUnit, in-process servers, mocking, and parameterized tests for both IPv4 and IPv6 scenarios.

## Unit Testing IPv6 Address Logic

```java
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import java.net.*;

import static org.junit.jupiter.api.Assertions.*;

class IPv6AddressTest {

    @ParameterizedTest
    @CsvSource({
        "2001:db8::1, true",
        "::1, true",
        "::, true",
        "2001:0db8:0000:0000:0000:0000:0000:0001, true",
        "2001:db8:::1, false",
        "2001:db8::gg, false",
    })
    void testIPv6Parsing(String addr, boolean shouldSucceed) {
        if (shouldSucceed) {
            assertDoesNotThrow(() -> {
                InetAddress ia = InetAddress.getByName(addr);
                assertInstanceOf(Inet6Address.class, ia);
            });
        } else {
            assertThrows(Exception.class, () -> InetAddress.getByName(addr));
        }
    }

    @Test
    void testIPv6Classification() throws UnknownHostException {
        assertTrue(InetAddress.getByName("::1").isLoopbackAddress());
        assertTrue(InetAddress.getByName("ff02::1").isMulticastAddress());
        assertTrue(InetAddress.getByName("fe80::1").isLinkLocalAddress());
        assertFalse(InetAddress.getByName("2001:db8::1").isLoopbackAddress());
    }

    @Test
    void testNormalization() throws UnknownHostException {
        // Both forms should normalize to the same address
        Inet6Address full = (Inet6Address) InetAddress.getByName(
            "2001:0db8:0000:0000:0000:0000:0000:0001");
        Inet6Address compressed = (Inet6Address) InetAddress.getByName("2001:db8::1");

        assertArrayEquals(full.getAddress(), compressed.getAddress());
    }
}
```

## Integration Test with In-Process Server

```java
import org.junit.jupiter.api.*;
import java.io.*;
import java.net.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

class IPv6ServerIntegrationTest {

    private ServerSocket server;
    private ExecutorService executor;
    private int port;

    @BeforeEach
    void startServer() throws Exception {
        executor = Executors.newSingleThreadExecutor();
        // Bind to loopback IPv6
        server = new ServerSocket();
        server.bind(new InetSocketAddress("::1", 0));
        port = server.getLocalPort();

        // Accept one connection in background
        executor.submit(() -> {
            try (Socket client = server.accept()) {
                BufferedReader in = new BufferedReader(
                    new InputStreamReader(client.getInputStream()));
                PrintWriter out = new PrintWriter(client.getOutputStream(), true);
                String line = in.readLine();
                out.println("Echo: " + line);
            } catch (Exception e) {
                // Server closed
            }
        });
    }

    @Test
    void testIPv6Connection() throws Exception {
        try (Socket client = new Socket()) {
            client.connect(new InetSocketAddress("::1", port), 3000);

            PrintWriter out = new PrintWriter(client.getOutputStream(), true);
            BufferedReader in = new BufferedReader(
                new InputStreamReader(client.getInputStream()));

            out.println("Hello IPv6");
            String response = in.readLine();

            assertEquals("Echo: Hello IPv6", response);
            assertTrue(client.getInetAddress() instanceof Inet6Address);
        }
    }

    @AfterEach
    void stopServer() throws Exception {
        server.close();
        executor.shutdownNow();
    }
}
```

## Testing with Parameterized IPv4 and IPv6

```java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.net.*;

import static org.junit.jupiter.api.Assertions.*;

class DualStackTest {

    @ParameterizedTest
    @ValueSource(strings = {"127.0.0.1", "::1"})
    void testBothProtocols(String bindAddr) throws Exception {
        try (ServerSocket server = new ServerSocket()) {
            server.bind(new InetSocketAddress(bindAddr, 0));
            int port = server.getLocalPort();

            // Connect from same protocol
            try (Socket client = new Socket()) {
                client.connect(new InetSocketAddress(bindAddr, port), 2000);
                assertTrue(client.isConnected(), "Connected to " + bindAddr);
            }
        }
    }
}
```

## Checking IPv6 Availability in Tests

```java
import org.junit.jupiter.api.condition.*;
import org.junit.jupiter.api.Test;
import java.net.*;

import static org.junit.jupiter.api.Assertions.*;

class IPv6ConditionalTest {

    static boolean isIPv6Available() {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress("::1", 1), 100);
            return true;
        } catch (java.net.ConnectException e) {
            return true;  // Refused = IPv6 loopback is reachable, but nothing is listening
        } catch (Exception e) {
            // Check if we can at least bind to IPv6
        }

        try (ServerSocket s = new ServerSocket()) {
            s.bind(new InetSocketAddress("::1", 0));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Test
    @EnabledIf("isIPv6Available")
    void testIPv6OnlyWhenAvailable() throws Exception {
        try (ServerSocket server = new ServerSocket()) {
            server.bind(new InetSocketAddress("::1", 0));
            assertNotNull(server.getLocalSocketAddress());
        }
    }
}
```

## Testing Address Extraction from HTTP Headers

```java
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import static org.junit.jupiter.api.Assertions.*;

class ClientIPExtractorTest {

    String extractIP(MockHttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null) return xff.split(",")[0].trim();
        return req.getRemoteAddr();
    }

    @Test
    void testDirectIPv6() {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr("2001:db8::42");
        assertEquals("2001:db8::42", extractIP(req));
    }

    @Test
    void testXForwardedForIPv6() {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.addHeader("X-Forwarded-For", "2001:db8::100, 10.0.0.1");
        assertEquals("2001:db8::100", extractIP(req));
    }

    @Test
    void testLoopback() {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr("::1");
        assertEquals("::1", extractIP(req));
    }
}
```

## Conclusion

Testing IPv6 networking code in Java uses the same JUnit 5 tooling as any other test. Parameterized tests with both `127.0.0.1` and `::1` help check loopback compatibility for both protocols. In-process servers on `::1` provide fast integration tests without external dependencies. Conditional test execution with `@EnabledIf` skips IPv6 tests in CI environments without IPv6 support. Mock `HttpServletRequest` objects from Spring Test enable header extraction testing without running a real HTTP server.
