# How to Build a Multi-Threaded TCP Server in Java for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, TCP, Multi-Threaded, IPv4, ServerSocket, ExecutorService, Networking

Description: Learn how to build a production-ready multi-threaded TCP server in Java using ExecutorService to handle multiple IPv4 client connections concurrently.

## Using ExecutorService Thread Pool

```java
import java.io.*;
import java.net.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class MultiThreadedTcpServer {
    private static final int PORT = 9000;
    private static final int MAX_THREADS = 50;

    private final ServerSocket serverSocket;
    private final ExecutorService executor;
    private final AtomicBoolean running = new AtomicBoolean(true);
    private final AtomicInteger activeConnections = new AtomicInteger(0);

    public MultiThreadedTcpServer(int port) throws IOException {
        serverSocket = new ServerSocket();
        serverSocket.setReuseAddress(true);
        serverSocket.bind(
            new InetSocketAddress(InetAddress.getByName("0.0.0.0"), port), 100);

        // Fixed thread pool limits max concurrent handlers
        executor = Executors.newFixedThreadPool(MAX_THREADS,
            r -> {
                Thread t = new Thread(r, "client-handler");
                t.setDaemon(true);
                return t;
            });
    }

    public void start() {
        System.out.printf("Server listening on port %d (max %d threads)%n",
            PORT, MAX_THREADS);

        while (running.get()) {
            try {
                Socket clientSocket = serverSocket.accept();
                int connId = activeConnections.incrementAndGet();
                System.out.printf("Client #%d connected: %s%n",
                    connId, clientSocket.getRemoteSocketAddress());

                executor.submit(() -> handleClient(clientSocket, connId));

            } catch (SocketException e) {
                if (!running.get()) break;
                System.err.println("Accept error: " + e.getMessage());
            } catch (IOException e) {
                System.err.println("IO error: " + e.getMessage());
            }
        }
    }

    private void handleClient(Socket socket, int connId) {
        String addr = socket.getRemoteSocketAddress().toString();
        try (
            socket;
            BufferedReader in = new BufferedReader(
                new InputStreamReader(socket.getInputStream()));
            PrintWriter out = new PrintWriter(socket.getOutputStream(), true)
        ) {
            socket.setSoTimeout(60_000);  // 60-second idle timeout

            String line;
            while ((line = in.readLine()) != null) {
                System.out.printf("[#%d] %s%n", connId, line);

                // Process and respond
                String response = processRequest(line);
                out.println(response);
            }

        } catch (SocketTimeoutException e) {
            System.out.printf("[#%d] Idle timeout%n", connId);
        } catch (SocketException e) {
            System.out.printf("[#%d] Connection reset%n", connId);
        } catch (IOException e) {
            System.err.printf("[#%d] Error: %s%n", connId, e.getMessage());
        } finally {
            activeConnections.decrementAndGet();
            System.out.printf("[#%d] Disconnected (active: %d)%n",
                connId, activeConnections.get());
        }
    }

    private String processRequest(String request) {
        // Your business logic here
        return "Echo: " + request;
    }

    public void shutdown() {
        running.set(false);
        try {
            serverSocket.close();
        } catch (IOException e) { /* ignore */ }
        executor.shutdown();
        try {
            executor.awaitTermination(30, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        System.out.println("Server shut down");
    }

    public static void main(String[] args) throws IOException {
        MultiThreadedTcpServer server = new MultiThreadedTcpServer(PORT);

        Runtime.getRuntime().addShutdownHook(new Thread(server::shutdown));
        server.start();
    }
}
```

## Using Virtual Threads (Java 21+)

```java
import java.net.*;
import java.io.*;
import java.util.concurrent.*;

public class VirtualThreadServer {
    public static void main(String[] args) throws IOException {
        ServerSocket serverSocket = new ServerSocket();
        serverSocket.setReuseAddress(true);
        serverSocket.bind(new InetSocketAddress(9000));

        // Virtual thread executor - can handle millions of concurrent connections
        try (ExecutorService executor =
                Executors.newVirtualThreadPerTaskExecutor()) {

            System.out.println("Virtual thread TCP server on port 9000");

            while (true) {
                Socket socket = serverSocket.accept();
                executor.submit(() -> {
                    try (socket;
                         var in = new BufferedReader(
                             new InputStreamReader(socket.getInputStream()));
                         var out = new PrintWriter(socket.getOutputStream(), true)) {
                        String line;
                        while ((line = in.readLine()) != null) {
                            out.println(line);
                        }
                    } catch (IOException e) { /* handle */ }
                });
            }
        }
    }
}
```

## Conclusion

For Java 8-20, use `Executors.newFixedThreadPool(n)` to bound concurrency and prevent resource exhaustion. For Java 21+, virtual threads (`Executors.newVirtualThreadPerTaskExecutor()`) allow a goroutine-like pattern with far more concurrent connections. Always set `setSoTimeout()` on accepted sockets to prevent idle connections holding thread pool slots indefinitely.
