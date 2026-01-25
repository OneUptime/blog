# How to Implement Performance Testing with Gatling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gatling, Performance Testing, Load Testing, Scala, JVM, Stress Testing

Description: A practical guide to performance testing with Gatling, covering simulation scripts, injection profiles, assertions, and generating detailed reports.

---

Gatling is a performance testing tool built on Scala and Akka. It handles high loads efficiently and produces detailed HTML reports. While the DSL is Scala-based, you do not need deep Scala knowledge to write effective tests. The syntax reads like English and the documentation is excellent.

## Installing Gatling

Download and extract Gatling:

```bash
# Download Gatling
wget https://repo1.maven.org/maven2/io/gatling/highcharts/gatling-charts-highcharts-bundle/3.9.5/gatling-charts-highcharts-bundle-3.9.5-bundle.zip

# Extract
unzip gatling-charts-highcharts-bundle-3.9.5-bundle.zip

# Add to PATH
export GATLING_HOME=/path/to/gatling-charts-highcharts-bundle-3.9.5
export PATH=$PATH:$GATLING_HOME/bin
```

Or use Maven/Gradle in your project:

```xml
<!-- pom.xml -->
<dependencies>
  <dependency>
    <groupId>io.gatling.highcharts</groupId>
    <artifactId>gatling-charts-highcharts</artifactId>
    <version>3.9.5</version>
    <scope>test</scope>
  </dependency>
</dependencies>

<build>
  <plugins>
    <plugin>
      <groupId>io.gatling</groupId>
      <artifactId>gatling-maven-plugin</artifactId>
      <version>4.3.7</version>
    </plugin>
  </plugins>
</build>
```

## Your First Simulation

Create a simulation file:

```scala
// simulations/BasicSimulation.scala
package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class BasicSimulation extends Simulation {

  // HTTP configuration
  val httpProtocol = http
    .baseUrl("http://localhost:3000")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling Performance Test")

  // Define a scenario
  val browseScenario = scenario("Browse Products")
    .exec(
      http("Home Page")
        .get("/")
        .check(status.is(200))
    )
    .pause(1, 3) // Random pause between 1 and 3 seconds
    .exec(
      http("Products List")
        .get("/api/products")
        .check(status.is(200))
        .check(jsonPath("$[*]").count.gte(1))
    )
    .pause(2)
    .exec(
      http("Product Detail")
        .get("/api/products/1")
        .check(status.is(200))
        .check(jsonPath("$.id").exists)
    )

  // Set up the simulation
  setUp(
    browseScenario.inject(
      rampUsers(100).during(1.minute)
    )
  ).protocols(httpProtocol)
}
```

Run the simulation:

```bash
# Using Gatling standalone
gatling.sh -s simulations.BasicSimulation

# Using Maven
mvn gatling:test -Dgatling.simulationClass=simulations.BasicSimulation
```

## Injection Profiles

Gatling offers various ways to inject virtual users:

```scala
class InjectionSimulation extends Simulation {

  val httpProtocol = http.baseUrl("http://localhost:3000")

  val scenario1 = scenario("Basic Load").exec(
    http("request").get("/api/health")
  )

  setUp(
    scenario1.inject(
      // Add 10 users at once
      atOnceUsers(10),

      // Add users at a constant rate
      constantUsersPerSec(20).during(1.minute),

      // Ramp up users linearly
      rampUsers(100).during(2.minutes),

      // Ramp from 10 to 50 users per second
      rampUsersPerSec(10).to(50).during(3.minutes),

      // Stress test with heaviside step function
      stressPeakUsers(1000).during(30.seconds),

      // Nothing happens for a period
      nothingFor(10.seconds)
    )
  ).protocols(httpProtocol)
}
```

Combine injection profiles for complex patterns:

```scala
setUp(
  scenario1.inject(
    // Warm up
    rampUsers(10).during(30.seconds),
    // Steady state
    constantUsersPerSec(20).during(5.minutes),
    // Spike
    atOnceUsers(100),
    // Recovery
    constantUsersPerSec(20).during(2.minutes),
    // Ramp down
    rampUsers(0).during(30.seconds)
  )
)
```

## Testing API Endpoints

Complete API testing simulation:

```scala
// simulations/ApiSimulation.scala
package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class ApiSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("http://localhost:3000")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")

  // Feeder for test data
  val userFeeder = csv("users.csv").random

  // Login and save token
  val login = exec(
    http("Login")
      .post("/api/auth/login")
      .body(StringBody("""{"email":"test@example.com","password":"password123"}"""))
      .check(status.is(200))
      .check(jsonPath("$.accessToken").saveAs("authToken"))
  )

  // CRUD operations
  val createUser = exec(
    http("Create User")
      .post("/api/users")
      .header("Authorization", "Bearer ${authToken}")
      .body(StringBody(
        """{"name":"${userName}","email":"${userEmail}"}"""
      ))
      .check(status.is(201))
      .check(jsonPath("$.id").saveAs("userId"))
  )

  val getUser = exec(
    http("Get User")
      .get("/api/users/${userId}")
      .header("Authorization", "Bearer ${authToken}")
      .check(status.is(200))
  )

  val updateUser = exec(
    http("Update User")
      .put("/api/users/${userId}")
      .header("Authorization", "Bearer ${authToken}")
      .body(StringBody("""{"name":"Updated Name"}"""))
      .check(status.is(200))
  )

  val deleteUser = exec(
    http("Delete User")
      .delete("/api/users/${userId}")
      .header("Authorization", "Bearer ${authToken}")
      .check(status.is(204))
  )

  // Complete scenario
  val userCrudScenario = scenario("User CRUD Operations")
    .exec(login)
    .pause(1)
    .feed(userFeeder)
    .exec(createUser)
    .pause(500.milliseconds)
    .exec(getUser)
    .pause(500.milliseconds)
    .exec(updateUser)
    .pause(500.milliseconds)
    .exec(deleteUser)

  setUp(
    userCrudScenario.inject(
      rampUsers(50).during(2.minutes)
    )
  ).protocols(httpProtocol)
}
```

CSV feeder file:

```csv
userName,userEmail
John Doe,john1@example.com
Jane Smith,jane2@example.com
Bob Wilson,bob3@example.com
```

## Checks and Assertions

Validate responses and set pass/fail criteria:

```scala
class ChecksSimulation extends Simulation {

  val httpProtocol = http.baseUrl("http://localhost:3000")

  val scenario1 = scenario("Validation Checks")
    .exec(
      http("Get Products")
        .get("/api/products")
        // Status checks
        .check(status.is(200))
        .check(status.not(500))
        // Header checks
        .check(header("Content-Type").is("application/json"))
        // Body checks
        .check(bodyString.exists)
        .check(bodyBytes.transform(_.length).gt(0))
        // JSON checks
        .check(jsonPath("$").exists)
        .check(jsonPath("$[*].id").findAll.saveAs("productIds"))
        .check(jsonPath("$[0].name").is("Product 1"))
        .check(jsonPath("$[*]").count.gte(5))
        // Response time check
        .check(responseTimeInMillis.lt(500))
    )

  // Global assertions
  setUp(
    scenario1.inject(rampUsers(100).during(1.minute))
  ).protocols(httpProtocol)
    .assertions(
      // Global response time assertions
      global.responseTime.max.lt(2000),
      global.responseTime.percentile(95).lt(1000),
      global.responseTime.mean.lt(500),
      // Success rate assertions
      global.successfulRequests.percent.gt(99),
      global.failedRequests.count.lt(10),
      // Per-request assertions
      details("Get Products").responseTime.max.lt(1000),
      details("Get Products").successfulRequests.percent.is(100)
    )
}
```

## Session and Data Management

Work with session variables:

```scala
class SessionSimulation extends Simulation {

  val httpProtocol = http.baseUrl("http://localhost:3000")

  val scenario1 = scenario("Session Example")
    // Set session variable
    .exec(session => session.set("counter", 0))
    // Loop with session access
    .repeat(5, "index") {
      exec(session => {
        val counter = session("counter").as[Int]
        session.set("counter", counter + 1)
      })
      .exec(
        http("Request ${index}")
          .get("/api/items/${index}")
      )
    }
    // Conditional execution
    .doIf(session => session("counter").as[Int] > 3) {
      exec(
        http("Extra Request")
          .get("/api/extra")
      )
    }
    // Random switch between actions
    .randomSwitch(
      60.0 -> exec(http("Option A").get("/api/a")),
      30.0 -> exec(http("Option B").get("/api/b")),
      10.0 -> exec(http("Option C").get("/api/c"))
    )

  setUp(
    scenario1.inject(atOnceUsers(10))
  ).protocols(httpProtocol)
}
```

## Multiple Scenarios

Run different user groups simultaneously:

```scala
class MultiScenarioSimulation extends Simulation {

  val httpProtocol = http.baseUrl("http://localhost:3000")

  // Regular users browse products
  val browsingScenario = scenario("Browsing Users")
    .exec(http("Browse").get("/api/products"))
    .pause(2, 5)

  // Power users perform searches
  val searchScenario = scenario("Searching Users")
    .exec(http("Search").get("/api/search?q=test"))
    .pause(1, 2)

  // Admin users manage content
  val adminScenario = scenario("Admin Users")
    .exec(http("Admin Dashboard").get("/api/admin/stats"))
    .pause(5, 10)

  setUp(
    browsingScenario.inject(
      rampUsers(500).during(5.minutes)
    ),
    searchScenario.inject(
      constantUsersPerSec(10).during(5.minutes)
    ),
    adminScenario.inject(
      atOnceUsers(5)
    )
  ).protocols(httpProtocol)
}
```

## CI/CD Integration

GitHub Actions workflow:

```yaml
# .github/workflows/performance-test.yml
name: Performance Tests

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'

jobs:
  gatling:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Run Gatling tests
        run: mvn gatling:test

      - name: Upload Gatling report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: gatling-report
          path: target/gatling/*/

      - name: Check assertions
        run: |
          if grep -q "KO" target/gatling/*/simulation.log; then
            echo "Performance test failed - assertions not met"
            exit 1
          fi
```

## Generating Reports

Gatling generates HTML reports automatically:

```bash
# Reports are in target/gatling/{simulation-name}-{timestamp}/
# Open index.html in browser

# Generate report from simulation.log
gatling.sh -ro /path/to/simulation-folder
```

The report includes:
- Response time distribution
- Requests per second over time
- Response time percentiles
- Active users over time
- Error analysis

## Best Practices

1. Start with a realistic user journey, not random requests
2. Use feeders to inject varied test data
3. Include think time (pauses) between requests
4. Set meaningful assertions based on SLOs
5. Run tests from a separate machine, not the server
6. Warm up the application before measuring
7. Compare results across releases
8. Monitor server resources during tests

---

Gatling combines the power of Scala with simple DSL syntax to create sophisticated performance tests. The detailed HTML reports make it easy to identify bottlenecks and track performance over time. Start with simple scenarios and gradually add complexity as you learn what your system can handle.
