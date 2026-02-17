# How to Connect a Spring Boot Application to Cloud SQL for MySQL Using Spring Data JPA and the Cloud SQL Socket Factory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, Spring Boot, Spring Data JPA, MySQL, Java

Description: Learn how to connect a Spring Boot application to Google Cloud SQL for MySQL using Spring Data JPA and the Cloud SQL Socket Factory for secure, seamless connectivity.

---

If you have ever deployed a Spring Boot application that talks to a MySQL database, you know the drill: configure a datasource, set up credentials, and point the app at your database host. When that database lives on Cloud SQL, things change a bit. You need a secure connection path, and Google provides the Cloud SQL Socket Factory to handle that for you.

In this post, I will walk through setting up a Spring Boot project that uses Spring Data JPA to interact with a Cloud SQL for MySQL instance, using the Cloud SQL JDBC Socket Factory for the connection layer. This approach avoids opening your database to public IPs and handles SSL certificates automatically.

## Why the Cloud SQL Socket Factory?

The Cloud SQL Socket Factory is a Java library that creates secure connections to Cloud SQL instances without requiring you to manage SSL certificates or whitelist IP addresses. It works by using the Cloud SQL Admin API to establish a secure tunnel. When you deploy to Cloud Run, GKE, or App Engine, the library automatically picks up the service account credentials from the environment.

This means you do not need to configure Cloud SQL Proxy as a sidecar. The socket factory is embedded in your JDBC connection string.

## Setting Up the Project

Start with a standard Spring Boot project. You can generate one from start.spring.io with the following dependencies: Spring Web, Spring Data JPA, and MySQL Driver. Then add the Cloud SQL Socket Factory dependency manually.

Here is the `pom.xml` snippet with the required dependencies:

```xml
<!-- Spring Data JPA for ORM and repository support -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- MySQL JDBC Driver -->
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- Cloud SQL Socket Factory for MySQL -->
<dependency>
    <groupId>com.google.cloud.sql</groupId>
    <artifactId>mysql-socket-factory-connector-j-8</artifactId>
    <version>1.15.2</version>
</dependency>

<!-- Spring Cloud GCP Starter for SQL (optional but helpful) -->
<dependency>
    <groupId>com.google.cloud</groupId>
    <artifactId>spring-cloud-gcp-starter-sql-mysql</artifactId>
</dependency>
```

## Configuring the Datasource

The key to making this work is the JDBC URL. Instead of a standard `jdbc:mysql://host:port/db` URL, you use a connection string that tells the MySQL driver to use the Cloud SQL Socket Factory.

Here is the `application.properties` configuration:

```properties
# Cloud SQL instance connection name in the format project:region:instance
spring.cloud.gcp.sql.instance-connection-name=my-project:us-central1:my-instance

# Database name
spring.cloud.gcp.sql.database-name=mydb

# Database credentials
spring.datasource.username=app_user
spring.datasource.password=${DB_PASSWORD}

# JPA settings
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect
```

If you are not using the Spring Cloud GCP starter, you can configure the datasource directly:

```properties
# Direct JDBC URL with socket factory configuration
spring.datasource.url=jdbc:mysql:///mydb?cloudSqlInstance=my-project:us-central1:my-instance&socketFactory=com.google.cloud.sql.mysql.SocketFactory

# Database credentials
spring.datasource.username=app_user
spring.datasource.password=${DB_PASSWORD}
```

## Creating the Entity and Repository

With the connection configured, you write your JPA entities and repositories as you normally would. Nothing changes on the application code side.

Here is a simple entity class:

```java
// Entity representing a task in the tasks table
@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(name = "completed")
    private boolean completed = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Getters and setters omitted for brevity
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
```

And the corresponding repository:

```java
// Repository interface - Spring Data JPA generates the implementation at runtime
public interface TaskRepository extends JpaRepository<Task, Long> {

    // Custom query method derived from method name
    List<Task> findByCompletedFalse();

    // Custom JPQL query for search functionality
    @Query("SELECT t FROM Task t WHERE t.title LIKE %:keyword%")
    List<Task> searchByTitle(@Param("keyword") String keyword);
}
```

## Building the REST Controller

To expose the data through an API, create a controller that uses the repository:

```java
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskRepository taskRepository;

    // Constructor injection for the repository
    public TaskController(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @GetMapping
    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    @PostMapping
    public Task createTask(@RequestBody Task task) {
        return taskRepository.save(task);
    }

    @GetMapping("/pending")
    public List<Task> getPendingTasks() {
        return taskRepository.findByCompletedFalse();
    }
}
```

## Authentication and IAM

When running locally, you need to authenticate with Google Cloud. The socket factory looks for credentials in this order:

1. The `GOOGLE_APPLICATION_CREDENTIALS` environment variable pointing to a service account key file.
2. Application Default Credentials set via `gcloud auth application-default login`.
3. The default service account when running on GCP infrastructure.

For local development, the simplest approach is to run:

```bash
# Set up application default credentials for local development
gcloud auth application-default login
```

The service account or user account needs the `Cloud SQL Client` role (`roles/cloudsql.client`) to connect through the socket factory.

## Running Locally Against Cloud SQL

You can run your Spring Boot app locally and still connect to your Cloud SQL instance. The socket factory handles the connection through the Cloud SQL Admin API.

```bash
# Set the database password and run the application
export DB_PASSWORD=your_password_here
./mvnw spring-boot:run
```

The application will start up, connect to Cloud SQL through the socket factory, and Hibernate will create or update the tables based on your entity definitions.

## Deploying to Cloud Run

When deploying to Cloud Run, you need to make sure the Cloud Run service account has the `Cloud SQL Client` role. Then configure the Cloud SQL connection in the deployment:

```bash
# Deploy to Cloud Run with Cloud SQL connection
gcloud run deploy my-app \
    --image gcr.io/my-project/my-app:latest \
    --add-cloudsql-instances my-project:us-central1:my-instance \
    --set-env-vars DB_PASSWORD=your_password \
    --region us-central1
```

The `--add-cloudsql-instances` flag tells Cloud Run to set up the Unix socket path that the socket factory needs.

## Connection Pooling with HikariCP

Spring Boot uses HikariCP as the default connection pool. You should tune the pool settings for Cloud SQL:

```properties
# Connection pool settings tuned for Cloud SQL
spring.datasource.hikari.maximum-pool-size=5
spring.datasource.hikari.minimum-idle=2
spring.datasource.hikari.connection-timeout=20000
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.max-lifetime=1200000
```

Keep the pool size small. Cloud SQL has connection limits, and if you are running multiple replicas, each one maintains its own pool.

## Troubleshooting Common Issues

A few things that trip people up:

The instance connection name must be in the exact format `project:region:instance`. If you get authentication errors, check that the Cloud SQL Admin API is enabled in your project. If you see connection timeouts, verify that the service account has the `Cloud SQL Client` role.

When running in GKE, you can either use the socket factory in your JDBC URL or run the Cloud SQL Auth Proxy as a sidecar. The socket factory approach is simpler because it does not require an additional container, but the sidecar approach gives you more control over connection settings.

## Wrapping Up

The Cloud SQL Socket Factory simplifies connecting Java applications to Cloud SQL. Combined with Spring Data JPA, you get a clean, production-ready setup where the connection security is handled for you. You write your entities and repositories the same way you always have, and the socket factory takes care of getting traffic to Cloud SQL safely.

The main takeaway is that you do not need to manage SSL certificates, configure proxies, or open firewall rules. The socket factory handles all of that through the Cloud SQL Admin API. Just add the dependency, set the instance connection name, and your Spring Boot app connects to Cloud SQL as if the database were running locally.
