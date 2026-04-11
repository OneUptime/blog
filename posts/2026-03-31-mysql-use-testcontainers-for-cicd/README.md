# How to Use Testcontainers for MySQL in CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Testcontainers, CI/CD, Testing, Integration Test

Description: Use Testcontainers to run real MySQL containers in your integration tests, ensuring consistent database behavior across local development and CI/CD.

---

## Why Testcontainers for MySQL Testing

In-memory databases like H2 have subtle differences from MySQL that can cause tests to pass locally but fail in production. Testcontainers solves this by spinning up real MySQL Docker containers during tests, then tearing them down automatically. Your integration tests run against the exact MySQL version you use in production.

## Adding Testcontainers to Your Project

For Java/Maven:

```xml
<!-- pom.xml -->
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>mysql</artifactId>
  <version>1.19.7</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>junit-jupiter</artifactId>
  <version>1.19.7</version>
  <scope>test</scope>
</dependency>
```

For Node.js:

```bash
npm install --save-dev @testcontainers/mysql mysql2
```

## Java Integration Test Example

```java
// OrderRepositoryTest.java
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
class OrderRepositoryTest {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0.35")
        .withDatabaseName("testdb")
        .withUsername("testuser")
        .withPassword("testpass")
        .withInitScript("db/init.sql");

    @Test
    void shouldCreateAndRetrieveOrder() {
        String jdbcUrl = mysql.getJdbcUrl();
        // Use jdbcUrl to connect and run your test
        // Testcontainers injects the correct host:port automatically
    }
}
```

## Node.js Integration Test Example

```javascript
// tests/order.integration.test.js
const { MySqlContainer } = require('@testcontainers/mysql');
const mysql = require('mysql2/promise');

let container;
let connection;

beforeAll(async () => {
  container = await new MySqlContainer('mysql:8.0.35')
    .withDatabase('testdb')
    .withUsername('testuser')
    .withUserPassword('testpass')
    .start();

  connection = await mysql.createConnection({
    host:     container.getHost(),
    port:     container.getPort(),
    database: 'testdb',
    user:     'testuser',
    password: 'testpass',
  });

  // Run migrations
  const schema = require('fs').readFileSync('./db/schema.sql', 'utf8');
  await connection.query(schema);
}, 60000);

afterAll(async () => {
  await connection.end();
  await container.stop();
});

test('should insert and retrieve an order', async () => {
  await connection.execute(
    'INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)',
    [1, 99.99, 'pending']
  );
  const [rows] = await connection.execute(
    'SELECT * FROM orders WHERE user_id = ?', [1]
  );
  expect(rows).toHaveLength(1);
  expect(rows[0].status).toBe('pending');
});
```

## GitHub Actions Configuration

Testcontainers requires Docker to be available in your CI environment. GitHub Actions includes Docker by default:

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'

      - name: Run integration tests
        run: mvn verify -Pfull-integration-tests
        env:
          TESTCONTAINERS_RYUK_DISABLED: "false"
```

## Reusing Containers for Speed

For faster test runs, use Testcontainers' reuse feature to avoid starting a new container for every test class:

```java
static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0.35")
    .withDatabaseName("testdb")
    .withUsername("testuser")
    .withPassword("testpass")
    .withReuse(true);
```

Set `testcontainers.reuse.enable=true` in your `~/.testcontainers.properties` file.

## Summary

Testcontainers eliminates the gap between test databases and production MySQL by running real MySQL containers during integration tests. Tests get a clean, isolated database for each run, migrations are applied as part of test setup, and the container is automatically removed after tests complete. On GitHub Actions, no extra configuration is needed since Docker is available by default.
