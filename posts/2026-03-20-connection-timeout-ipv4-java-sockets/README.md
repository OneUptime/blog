# How to Implement Connection Timeouts for IPv4 Sockets in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, TCP, Timeout, IPv4, Socket, Networking, Error Handling

Description: Learn how to implement connection, read, and write timeouts for IPv4 sockets in Java to prevent applications from blocking indefinitely.

## Setting Connection Timeout

```java
import java.io.*;
import java.net.*;

public class TimeoutExample {
    public static void main(String[] args) {
        String host = "192.168.1.100";
        int port = 9000;
        int connectTimeoutMs = 5000;  // 5 seconds
        int readTimeoutMs = 30000;    // 30 seconds

        // Create socket without connecting
        try (Socket socket = new Socket()) {
            // Set connection timeout before calling connect()
            socket.connect(
                new InetSocketAddress(host, port),
                connectTimeoutMs
            );
            System.out.println("Connected to " + socket.getRemoteSocketAddress());

            // Set read timeout for all subsequent reads
            socket.setSoTimeout(readTimeoutMs);

            BufferedReader reader = new BufferedReader(
                new InputStreamReader(socket.getInputStream()));
            PrintWriter writer = new PrintWriter(socket.getOutputStream(), true);

            writer.println("Hello!");

            String response = reader.readLine();  // Throws SocketTimeoutException if > 30s
            System.out.println("Response: " + response);

        } catch (SocketTimeoutException e) {
            // Thrown for both connect and read timeouts; same exception type for either
            System.err.println("Timed out: " + e.getMessage());
        } catch (ConnectException e) {
            System.err.println("Connection refused: " + host + ":" + port);
        } catch (IOException e) {
            System.err.println("IO error: " + e.getMessage());
        }
    }
}
```

## Differentiating Connect vs Read Timeouts

```java
import java.net.*;
import java.io.*;

public static void connectWithRetry(String host, int port) {
    int maxAttempts = 3;
    int connectTimeoutMs = 3000;
    int readTimeoutMs = 10000;

    for (int attempt = 1; attempt <= maxAttempts; attempt++) {
        try (Socket socket = new Socket()) {
            System.out.printf("Attempt %d/%d connecting to %s:%d%n",
                attempt, maxAttempts, host, port);

            // Connect timeout: SocketTimeoutException if connect takes too long
            socket.connect(new InetSocketAddress(host, port), connectTimeoutMs);
            socket.setSoTimeout(readTimeoutMs);

            // Successful connection
            System.out.println("Connected!");
            // ... do work ...
            return;

        } catch (SocketTimeoutException e) {
            System.err.println("Timeout on attempt " + attempt);
            if (attempt == maxAttempts) throw new RuntimeException("Max retries exceeded");
            // Linear backoff
            try { Thread.sleep(1000L * attempt); } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                return;
            }
        } catch (ConnectException e) {
            System.err.println("Refused on attempt " + attempt);
        } catch (IOException e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
}
```

## Setting Individual Timeouts for Read Operations

```java
import java.net.*;
import java.io.*;

public static String readWithTimeout(Socket socket, int timeoutMs) throws IOException {
    int originalTimeout = socket.getSoTimeout();
    socket.setSoTimeout(timeoutMs);

    try {
        BufferedReader reader = new BufferedReader(
            new InputStreamReader(socket.getInputStream()));
        return reader.readLine();
    } catch (SocketTimeoutException e) {
        return null;  // Timeout - no data within timeoutMs
    } finally {
        // Restore original timeout
        socket.setSoTimeout(originalTimeout);
    }
}
```

## Per-Operation Deadline with Thread

```java
import java.net.*;
import java.io.*;
import java.util.concurrent.*;

public static String callWithDeadline(Socket socket, String request,
                                       long deadlineMs) throws Exception {
    ExecutorService exec = Executors.newSingleThreadExecutor();
    Future<String> future = exec.submit(() -> {
        PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
        BufferedReader in = new BufferedReader(
            new InputStreamReader(socket.getInputStream()));
        out.println(request);
        return in.readLine();
    });

    try {
        return future.get(deadlineMs, TimeUnit.MILLISECONDS);
    } catch (TimeoutException e) {
        future.cancel(true);
        socket.close();
        throw new SocketTimeoutException("Operation exceeded deadline of " + deadlineMs + "ms");
    } finally {
        exec.shutdownNow();
    }
}
```

## Timeout Summary

| Method | Applies To |
|--------|-----------|
| `socket.connect(addr, timeout)` | TCP connection establishment |
| `socket.setSoTimeout(ms)` | Individual `read()` / `readLine()` calls |
| `Future.get(timeout, unit)` | Entire operation (write + read) |

## Conclusion

Java socket timeouts require two separate settings: `socket.connect(addr, connectTimeout)` for the TCP handshake and `socket.setSoTimeout(readTimeout)` for individual reads. Both throw `SocketTimeoutException` on expiry, which is a subclass of `IOException`. For operation-level deadlines spanning multiple reads, use `Future.get(timeout, unit)` with a background thread.
