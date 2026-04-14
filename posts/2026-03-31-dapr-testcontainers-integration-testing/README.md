# How to Use Testcontainers for Dapr Integration Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, Testcontainers, Integration Test, Java

Description: Use Testcontainers to programmatically start Dapr sidecars and dependency containers from your integration tests without manual Docker Compose setup.

---

Testcontainers is a library that starts and stops Docker containers programmatically from within your test code. This eliminates the need for separate Docker Compose files and makes integration test setup part of the test lifecycle.

## Adding Testcontainers to Your Project

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>testcontainers</artifactId>
    <version>1.19.7</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>1.19.7</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.awaitility</groupId>
    <artifactId>awaitility</artifactId>
    <version>4.3.0</version>
    <scope>test</scope>
</dependency>
```

## Starting Redis and Dapr Sidecar

```java
// DaprIntegrationTest.java
import org.junit.jupiter.api.*;
import org.testcontainers.containers.BindMode;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.Network;
import org.testcontainers.utility.DockerImageName;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class DaprIntegrationTest {

    private static final Network network = Network.newNetwork();

    private GenericContainer<?> redis = new GenericContainer<>(
        DockerImageName.parse("redis:7-alpine"))
        .withNetwork(network)
        .withNetworkAliases("redis");

    private GenericContainer<?> daprSidecar = new GenericContainer<>(
        DockerImageName.parse("daprio/daprd:1.14.0"))
        .withNetwork(network)
        .withNetworkAliases("daprd")
        .withExposedPorts(3500, 50001)
        .withCommand(
            "./daprd",
            "--app-id", "test-service",
            "--dapr-http-port", "3500",
            "--resources-path", "/components",
            "--log-level", "error"
        )
        .withClasspathResourceMapping(
            "dapr-components", "/components", BindMode.READ_ONLY
        )
        .dependsOn(redis);

    @BeforeAll
    void setUp() {
        redis.start();
        daprSidecar.start();
    }

    @AfterAll
    void tearDown() {
        daprSidecar.stop();
        redis.stop();
    }

    private String getDaprUrl() {
        return "http://" + daprSidecar.getHost() + ":" + daprSidecar.getMappedPort(3500);
    }
}
```

## Component File as Classpath Resource

Place the component YAML file in `src/test/resources/dapr-components/statestore.yaml`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
```

## Writing a Test

```java
@Test
void testSaveAndGetState() throws Exception {
    String daprUrl = getDaprUrl();

    // Wait for Dapr to be ready
    await().atMost(30, TimeUnit.SECONDS).until(() -> {
        try {
            HttpResponse<String> r = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder()
                    .uri(URI.create(daprUrl + "/v1.0/healthz"))
                    .GET().build(),
                HttpResponse.BodyHandlers.ofString()
            );
            return r.statusCode() == 204;
        } catch (Exception e) {
            return false;
        }
    });

    // Save state
    String body = "[{\"key\":\"test-key\",\"value\":{\"data\":\"hello\"}}]";
    HttpClient.newHttpClient().send(
        HttpRequest.newBuilder()
            .uri(URI.create(daprUrl + "/v1.0/state/statestore"))
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .header("Content-Type", "application/json")
            .build(),
        HttpResponse.BodyHandlers.ofString()
    );

    // Get state
    HttpResponse<String> resp = HttpClient.newHttpClient().send(
        HttpRequest.newBuilder()
            .uri(URI.create(daprUrl + "/v1.0/state/statestore/test-key"))
            .GET().build(),
        HttpResponse.BodyHandlers.ofString()
    );

    assertEquals(200, resp.statusCode());
    assertTrue(resp.body().contains("hello"));
}
```

## Summary

Testcontainers integrates Dapr sidecar startup directly into your test lifecycle, making integration tests self-contained and easy to run without external setup scripts. The containers start before tests run and stop when they finish, keeping your test environment clean and reproducible.
