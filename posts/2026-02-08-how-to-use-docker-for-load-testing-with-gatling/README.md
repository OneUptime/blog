# How to Use Docker for Load Testing with Gatling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Gatling, Load Testing, Performance Testing, Stress Testing, CI/CD, Scala, Simulation

Description: Set up Gatling load testing in Docker containers to simulate thousands of concurrent users against your applications.

---

Load testing answers a critical question: how does your application behave under pressure? Gatling is one of the best tools for finding out. It generates realistic user traffic, measures response times, and produces detailed reports that pinpoint bottlenecks. Running Gatling in Docker means you can execute load tests from any machine, in any CI pipeline, without installing Java or Scala locally.

This guide covers setting up Gatling in Docker, writing simulations, scaling load generation, and interpreting results.

## Why Gatling

Gatling uses an asynchronous, non-blocking architecture based on Akka and Netty. This means a single Gatling instance can simulate thousands of concurrent users without needing thousands of threads. Its Scala-based DSL reads almost like plain English, making simulations easy to write and maintain. And the HTML reports it generates are genuinely useful, with detailed percentile breakdowns and request-by-request analysis.

## Running Gatling in Docker

Gatling provides official Docker images. Start with a quick test to confirm everything works.

```bash
# Run Gatling's built-in computer database simulation
docker run --rm \
  -v "$(pwd)/results:/opt/gatling/results" \
  denvazh/gatling \
  -s computerdatabase.BasicSimulation
```

After the simulation completes, Gatling writes an HTML report to the `results` directory. Open the `index.html` file to see response time distributions, throughput, and error rates.

## Writing a Custom Simulation

Create a simulation that tests a REST API. Gatling simulations are Scala files, but you do not need to be a Scala expert. The DSL is straightforward.

```scala
// simulations/ApiLoadTest.scala - Load test for a REST API
package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class ApiLoadTest extends Simulation {

  // Define the base URL and common headers
  val httpProtocol = http
    .baseUrl("http://api:3000")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling Load Test")

  // Define a feeder for random user data
  val userFeeder = Iterator.continually(Map(
    "name" -> s"User${scala.util.Random.nextInt(10000)}",
    "email" -> s"user${scala.util.Random.nextInt(10000)}@example.com"
  ))

  // Scenario: Browse and create users
  val browseAndCreate = scenario("Browse and Create Users")
    .exec(
      http("Get All Users")
        .get("/api/users")
        .check(status.is(200))
        .check(responseTimeInMillis.lte(500))
    )
    .pause(1, 3)  // Random pause between 1 and 3 seconds
    .feed(userFeeder)
    .exec(
      http("Create User")
        .post("/api/users")
        .body(StringBody("""{"name": "${name}", "email": "${email}"}"""))
        .check(status.is(201))
    )
    .pause(1)
    .exec(
      http("Get All Users Again")
        .get("/api/users")
        .check(status.is(200))
    )

  // Scenario: Read-heavy traffic pattern
  val readHeavy = scenario("Read Heavy Traffic")
    .exec(
      http("Get Users")
        .get("/api/users")
        .check(status.is(200))
    )
    .pause(500.milliseconds, 2.seconds)

  // Define the load profile
  setUp(
    browseAndCreate.inject(
      // Ramp up to 50 users over 30 seconds
      rampUsers(50).during(30.seconds),
      // Hold at 50 users for 2 minutes
      constantUsersPerSec(10).during(2.minutes)
    ),
    readHeavy.inject(
      // Ramp up to 200 users over 1 minute
      rampUsers(200).during(1.minute)
    )
  ).protocols(httpProtocol)
    .assertions(
      // Global assertions
      global.responseTime.percentile3.lt(1000),  // 95th percentile under 1 second
      global.successfulRequests.percent.gt(99)     // Over 99% success rate
    )
}
```

## Project Structure

Organize your Gatling project with the correct directory structure.

```bash
# Create the Gatling project structure
mkdir -p gatling-tests/simulations
mkdir -p gatling-tests/resources
mkdir -p gatling-tests/results
```

```
gatling-tests/
  simulations/
    ApiLoadTest.scala
  resources/
    gatling.conf
    test-data.csv
  results/
  docker-compose.yml
```

## Docker Compose for Load Testing

Set up Gatling alongside the application under test using Docker Compose.

```yaml
# docker-compose.yml - Application + Gatling load test
version: "3.8"

services:
  # The application under test
  api:
    build: ../app
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/loadtest
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 5s
      timeout: 3s
      retries: 10

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=loadtest
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d loadtest"]
      interval: 5s
      timeout: 3s
      retries: 10

  # Gatling load test runner
  gatling:
    image: denvazh/gatling:latest
    volumes:
      - ./simulations:/opt/gatling/user-files/simulations
      - ./resources:/opt/gatling/user-files/resources
      - ./results:/opt/gatling/results
    depends_on:
      api:
        condition: service_healthy
    environment:
      - JAVA_OPTS=-Xms512m -Xmx2g
    command: ["-s", "simulations.ApiLoadTest"]
```

```bash
# Run the load test
docker compose up --abort-on-container-exit --exit-code-from gatling

# Open the report
open results/*/index.html
```

## Configuring Gatling

Customize Gatling's behavior through a configuration file.

```conf
# resources/gatling.conf - Gatling configuration
gatling {
  core {
    # Number of threads for running simulations
    outputDirectoryBaseName = "api-load-test"
    runDescription = "API Load Test"
  }

  http {
    # Connection pool settings
    ahc {
      connectTimeout = 10000
      requestTimeout = 60000
      pooledConnectionIdleTimeout = 60000
      maxConnectionsPerHost = 100
    }
  }

  data {
    # Console reporting interval
    console {
      light = false
    }
  }
}
```

## Using Data Feeders

Feed test data from CSV files to make simulations more realistic.

```csv
username,email,password
alice,alice@example.com,pass123
bob,bob@example.com,pass456
charlie,charlie@example.com,pass789
```

```scala
// Using a CSV feeder in a simulation
val csvFeeder = csv("test-data.csv").circular  // Loop through data

val loginScenario = scenario("Login Flow")
  .feed(csvFeeder)
  .exec(
    http("Login")
      .post("/api/login")
      .body(StringBody("""{"email": "${email}", "password": "${password}"}"""))
      .check(status.is(200))
      .check(jsonPath("$.token").saveAs("authToken"))
  )
  .exec(
    http("Get Profile")
      .get("/api/profile")
      .header("Authorization", "Bearer ${authToken}")
      .check(status.is(200))
  )
```

## Stress Testing Patterns

Gatling supports various load injection patterns.

```scala
// Different load injection patterns for various test scenarios
setUp(
  // Spike test: sudden burst of traffic
  scenario1.inject(
    atOnceUsers(500)
  ),

  // Ramp test: gradual increase
  scenario2.inject(
    rampUsers(1000).during(5.minutes)
  ),

  // Step load: increase in steps
  scenario3.inject(
    incrementUsersPerSec(10)
      .times(5)
      .eachLevelLasting(2.minutes)
      .separatedByRampsLasting(30.seconds)
      .startingFrom(10)
  ),

  // Soak test: sustained load over time
  scenario4.inject(
    constantUsersPerSec(50).during(30.minutes)
  )
).protocols(httpProtocol)
```

## CI/CD Integration

Add load testing to your deployment pipeline.

```yaml
# .github/workflows/load-test.yml - Gatling load tests in CI
name: Load Tests

on:
  push:
    branches: [main]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run load tests
        working-directory: ./gatling-tests
        run: |
          docker compose up \
            --abort-on-container-exit \
            --exit-code-from gatling

      - name: Upload Gatling report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: gatling-report
          path: gatling-tests/results/

      - name: Cleanup
        if: always()
        run: docker compose -f gatling-tests/docker-compose.yml down -v
```

## Interpreting Results

The Gatling HTML report contains several key sections. The "Global Information" tab shows total requests, success rates, and response time percentiles. The "Response Time Distribution" chart reveals your application's performance profile. Look for long tails in the distribution, which indicate intermittent slowness.

The "Requests per Second" chart shows throughput over time. A flat line at the expected rate means your application kept up. A declining line means it started falling behind. Pay special attention to the 95th and 99th percentile response times. These represent the experience of your slowest users and are often much worse than the mean.

## Wrapping Up

Gatling in Docker makes load testing reproducible, portable, and easy to integrate into CI/CD. You write simulations once, run them anywhere, and get professional-grade reports. The key is making load testing a regular part of your development process, not something you do the day before launch. Run smaller load tests on every merge to main, and larger soak tests on a weekly schedule. Catching performance regressions early is always cheaper than fixing them in production.
