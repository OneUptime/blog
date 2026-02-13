# How to Build REST APIs with Play Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Scala, Play Framework, REST API, Backend, Akka

Description: Learn how to build REST APIs with Scala and Play Framework. This guide covers routing, controllers, JSON handling, and dependency injection.

---

> Play Framework is a high-velocity web framework for Java and Scala that emphasizes developer productivity and modern web architecture. Built on Akka and designed for asynchronous, non-blocking operations, Play is an excellent choice for building scalable REST APIs.

Play takes a different approach from traditional Java frameworks. Instead of XML configuration and heavyweight containers, Play uses a lightweight, reactive architecture that starts instantly and reloads automatically during development.

---

## Why Play Framework for REST APIs?

| Feature | Benefit |
|---------|---------|
| **Stateless Architecture** | Perfect for REST, scales horizontally |
| **Non-blocking I/O** | High throughput with minimal resources |
| **Type Safety** | Scala's type system catches errors at compile time |
| **Hot Reload** | Changes visible instantly during development |
| **Built-in JSON** | First-class JSON support with Play JSON |

---

## Project Setup

### Creating a New Play Project

```bash
# Create a new Play Scala project
sbt new playframework/play-scala-seed.g8

# You will be prompted for project details
# name [play-scala-seed]: user-api
# organization [com.example]: com.mycompany
```

This creates the following project structure:

```
user-api/
├── app/
│   ├── controllers/
│   └── views/
├── conf/
│   ├── application.conf
│   └── routes
├── project/
├── test/
└── build.sbt
```

### Configuring build.sbt

```scala
// build.sbt
name := "user-api"
version := "1.0.0"
scalaVersion := "2.13.12"

lazy val root = (project in file(".")).enablePlugins(PlayScala)

libraryDependencies ++= Seq(
  guice,  // Dependency injection with Google Guice
  "com.typesafe.play" %% "play-slick" % "5.1.0",
  "org.postgresql" % "postgresql" % "42.6.0",
  "org.scalatestplus.play" %% "scalatestplus-play" % "5.1.0" % Test
)
```

---

## Understanding Play Routing

Play uses a DSL-based routing system defined in the `conf/routes` file. Each route maps an HTTP method and URL pattern to a controller action.

```
# conf/routes
# Format: HTTP_METHOD    URL_PATTERN    CONTROLLER.ACTION

# User endpoints
GET     /api/v1/users               controllers.UserController.list(page: Int ?= 1, size: Int ?= 20)
GET     /api/v1/users/:id           controllers.UserController.get(id: Long)
POST    /api/v1/users               controllers.UserController.create()
PUT     /api/v1/users/:id           controllers.UserController.update(id: Long)
DELETE  /api/v1/users/:id           controllers.UserController.delete(id: Long)

# Search with query parameters
GET     /api/v1/users/search        controllers.UserController.search(q: String, limit: Int ?= 10)

# Health check endpoint
GET     /health                     controllers.HealthController.check()
```

---

## Building Controllers

Controllers contain action methods that receive requests and return results.

```scala
// app/controllers/UserController.scala
package controllers

import javax.inject._
import play.api.mvc._
import play.api.libs.json._
import scala.concurrent.{ExecutionContext, Future}
import services.UserService
import models.{User, CreateUserRequest, UpdateUserRequest}

@Singleton
class UserController @Inject()(
  val controllerComponents: ControllerComponents,
  userService: UserService
)(implicit ec: ExecutionContext) extends BaseController {

  // GET /api/v1/users
  def list(page: Int, size: Int): Action[AnyContent] = Action.async {
    if (page < 1 || size < 1 || size > 100) {
      Future.successful(BadRequest(Json.obj(
        "error" -> "Invalid pagination parameters"
      )))
    } else {
      userService.listUsers(page, size).map { users =>
        Ok(Json.toJson(users))
      }
    }
  }

  // GET /api/v1/users/:id
  def get(id: Long): Action[AnyContent] = Action.async {
    userService.getUser(id).map {
      case Some(user) => Ok(Json.toJson(user))
      case None => NotFound(Json.obj("error" -> "User not found", "id" -> id))
    }
  }

  // POST /api/v1/users
  def create(): Action[JsValue] = Action.async(parse.json) { request =>
    request.body.validate[CreateUserRequest] match {
      case JsSuccess(createRequest, _) =>
        userService.createUser(createRequest).map { user =>
          Created(Json.toJson(user))
            .withHeaders("Location" -> s"/api/v1/users/${user.id}")
        }
      case JsError(errors) =>
        Future.successful(BadRequest(Json.obj(
          "error" -> "Invalid request body",
          "details" -> JsError.toJson(errors)
        )))
    }
  }

  // PUT /api/v1/users/:id
  def update(id: Long): Action[JsValue] = Action.async(parse.json) { request =>
    request.body.validate[UpdateUserRequest] match {
      case JsSuccess(updateRequest, _) =>
        userService.updateUser(id, updateRequest).map {
          case Some(user) => Ok(Json.toJson(user))
          case None => NotFound(Json.obj("error" -> "User not found"))
        }
      case JsError(errors) =>
        Future.successful(BadRequest(Json.obj("error" -> "Invalid request")))
    }
  }

  // DELETE /api/v1/users/:id
  def delete(id: Long): Action[AnyContent] = Action.async {
    userService.deleteUser(id).map {
      case true => NoContent
      case false => NotFound(Json.obj("error" -> "User not found"))
    }
  }
}
```

### Action Composition for Authentication

```scala
// app/controllers/actions/AuthenticatedAction.scala
package controllers.actions

import javax.inject._
import play.api.mvc._
import play.api.libs.json.Json
import scala.concurrent.{ExecutionContext, Future}
import services.AuthService
import models.AuthenticatedUser

class AuthenticatedRequest[A](
  val user: AuthenticatedUser,
  request: Request[A]
) extends WrappedRequest[A](request)

@Singleton
class AuthenticatedAction @Inject()(
  val parser: BodyParsers.Default,
  authService: AuthService
)(implicit val executionContext: ExecutionContext)
  extends ActionBuilder[AuthenticatedRequest, AnyContent]
  with ActionRefiner[Request, AuthenticatedRequest] {

  override protected def refine[A](
    request: Request[A]
  ): Future[Either[Result, AuthenticatedRequest[A]]] = {

    val tokenOpt = request.headers
      .get("Authorization")
      .filter(_.startsWith("Bearer "))
      .map(_.stripPrefix("Bearer "))

    tokenOpt match {
      case Some(token) =>
        authService.validateToken(token).map {
          case Some(user) => Right(new AuthenticatedRequest(user, request))
          case None => Left(Results.Unauthorized(Json.obj("error" -> "Invalid token")))
        }
      case None =>
        Future.successful(Left(Results.Unauthorized(Json.obj(
          "error" -> "Missing Authorization header"
        ))))
    }
  }
}
```

---

## Working with JSON using Play JSON

Play JSON provides type-safe serialization using Reads, Writes, and Format type classes.

### Defining Models

```scala
// app/models/User.scala
package models

import play.api.libs.json._
import play.api.libs.functional.syntax._
import java.time.Instant

case class User(
  id: Long,
  email: String,
  name: String,
  role: UserRole,
  createdAt: Instant,
  updatedAt: Instant
)

sealed trait UserRole
object UserRole {
  case object Admin extends UserRole
  case object Editor extends UserRole
  case object Viewer extends UserRole

  implicit val format: Format[UserRole] = new Format[UserRole] {
    override def reads(json: JsValue): JsResult[UserRole] = json match {
      case JsString("admin") => JsSuccess(Admin)
      case JsString("editor") => JsSuccess(Editor)
      case JsString("viewer") => JsSuccess(Viewer)
      case _ => JsError("Invalid user role")
    }

    override def writes(role: UserRole): JsValue = role match {
      case Admin => JsString("admin")
      case Editor => JsString("editor")
      case Viewer => JsString("viewer")
    }
  }
}

object User {
  implicit val format: Format[User] = Json.format[User]
}
```

### Request Models with Validation

```scala
// app/models/UserRequests.scala
package models

import play.api.libs.json._
import play.api.libs.functional.syntax._

case class CreateUserRequest(
  email: String,
  name: String,
  password: String,
  role: UserRole = UserRole.Viewer
)

object CreateUserRequest {
  implicit val reads: Reads[CreateUserRequest] = (
    (__ \ "email").read[String](Reads.email) and
    (__ \ "name").read[String](Reads.minLength[String](2)) and
    (__ \ "password").read[String](Reads.minLength[String](8)) and
    (__ \ "role").readWithDefault[UserRole](UserRole.Viewer)
  )(CreateUserRequest.apply _)
}

case class UpdateUserRequest(
  email: Option[String],
  name: Option[String],
  role: Option[UserRole]
)

object UpdateUserRequest {
  implicit val reads: Reads[UpdateUserRequest] = (
    (__ \ "email").readNullable[String](Reads.email) and
    (__ \ "name").readNullable[String](Reads.minLength[String](2)) and
    (__ \ "role").readNullable[UserRole]
  )(UpdateUserRequest.apply _)
}
```

---

## Dependency Injection with Guice

Play uses Google Guice for dependency injection by default.

### Service Implementation

```scala
// app/services/UserService.scala
package services

import javax.inject._
import scala.concurrent.{ExecutionContext, Future}
import models.{User, CreateUserRequest, UpdateUserRequest}
import repositories.UserRepository

trait UserService {
  def listUsers(page: Int, size: Int): Future[Seq[User]]
  def getUser(id: Long): Future[Option[User]]
  def createUser(request: CreateUserRequest): Future[User]
  def updateUser(id: Long, request: UpdateUserRequest): Future[Option[User]]
  def deleteUser(id: Long): Future[Boolean]
}

@Singleton
class UserServiceImpl @Inject()(
  userRepository: UserRepository,
  passwordService: PasswordService
)(implicit ec: ExecutionContext) extends UserService {

  override def listUsers(page: Int, size: Int): Future[Seq[User]] = {
    val offset = (page - 1) * size
    userRepository.findAll(offset, size)
  }

  override def getUser(id: Long): Future[Option[User]] = {
    userRepository.findById(id)
  }

  override def createUser(request: CreateUserRequest): Future[User] = {
    for {
      hashedPassword <- passwordService.hash(request.password)
      user <- userRepository.create(
        request.email,
        request.name,
        hashedPassword,
        request.role
      )
    } yield user
  }

  override def updateUser(id: Long, request: UpdateUserRequest): Future[Option[User]] = {
    userRepository.findById(id).flatMap {
      case Some(existing) =>
        val updated = existing.copy(
          email = request.email.getOrElse(existing.email),
          name = request.name.getOrElse(existing.name),
          role = request.role.getOrElse(existing.role)
        )
        userRepository.update(updated).map(Some(_))
      case None => Future.successful(None)
    }
  }

  override def deleteUser(id: Long): Future[Boolean] = {
    userRepository.delete(id)
  }
}
```

### Module Configuration

```scala
// app/modules/ServiceModule.scala
package modules

import com.google.inject.AbstractModule
import services._
import repositories._

class ServiceModule extends AbstractModule {
  override def configure(): Unit = {
    bind(classOf[UserService]).to(classOf[UserServiceImpl])
    bind(classOf[UserRepository]).to(classOf[UserRepositoryImpl])
    bind(classOf[PasswordService]).to(classOf[BCryptPasswordService])
  }
}
```

### Application Configuration

```hocon
# conf/application.conf
play {
  http.secret.key = "changeme"
  http.secret.key = ${?APPLICATION_SECRET}

  modules {
    enabled += "modules.ServiceModule"
  }

  filters {
    enabled += "play.filters.cors.CORSFilter"
  }

  filters.cors {
    allowedOrigins = ["http://localhost:3000"]
    allowedHttpMethods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allowedHttpHeaders = ["Accept", "Content-Type", "Authorization"]
  }
}

slick.dbs.default {
  profile = "slick.jdbc.PostgresProfile$"
  db {
    driver = "org.postgresql.Driver"
    url = "jdbc:postgresql://localhost:5432/userapi"
    url = ${?DATABASE_URL}
    user = "postgres"
    user = ${?DATABASE_USER}
    password = "postgres"
    password = ${?DATABASE_PASSWORD}
  }
}
```

---

## Repository Pattern with Slick

```scala
// app/repositories/UserRepository.scala
package repositories

import javax.inject._
import scala.concurrent.{ExecutionContext, Future}
import play.api.db.slick.DatabaseConfigProvider
import slick.jdbc.JdbcProfile
import models.{User, UserRole}
import java.time.Instant

trait UserRepository {
  def findAll(offset: Int, limit: Int): Future[Seq[User]]
  def findById(id: Long): Future[Option[User]]
  def create(email: String, name: String, passwordHash: String, role: UserRole): Future[User]
  def update(user: User): Future[User]
  def delete(id: Long): Future[Boolean]
}

@Singleton
class UserRepositoryImpl @Inject()(
  dbConfigProvider: DatabaseConfigProvider
)(implicit ec: ExecutionContext) extends UserRepository {

  private val dbConfig = dbConfigProvider.get[JdbcProfile]
  import dbConfig._
  import profile.api._

  class UsersTable(tag: Tag) extends Table[User](tag, "users") {
    def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
    def email = column[String]("email", O.Unique)
    def name = column[String]("name")
    def passwordHash = column[String]("password_hash")
    def role = column[String]("role")
    def createdAt = column[Instant]("created_at")
    def updatedAt = column[Instant]("updated_at")

    def * = (id, email, name, role, createdAt, updatedAt).mapTo[User]
  }

  private val users = TableQuery[UsersTable]

  override def findAll(offset: Int, limit: Int): Future[Seq[User]] = {
    db.run(users.sortBy(_.createdAt.desc).drop(offset).take(limit).result)
  }

  override def findById(id: Long): Future[Option[User]] = {
    db.run(users.filter(_.id === id).result.headOption)
  }

  override def create(
    email: String, name: String, passwordHash: String, role: UserRole
  ): Future[User] = {
    val now = Instant.now()
    val insertQuery = (users.map(u => (u.email, u.name, u.passwordHash, u.role, u.createdAt, u.updatedAt))
      returning users.map(_.id)
    ) += (email.toLowerCase, name, passwordHash, role.toString, now, now)

    db.run(insertQuery).map(id => User(id, email, name, role, now, now))
  }

  override def update(user: User): Future[User] = {
    val now = Instant.now()
    val query = users.filter(_.id === user.id)
      .map(u => (u.email, u.name, u.role, u.updatedAt))
      .update((user.email, user.name, user.role.toString, now))
    db.run(query).map(_ => user.copy(updatedAt = now))
  }

  override def delete(id: Long): Future[Boolean] = {
    db.run(users.filter(_.id === id).delete).map(_ > 0)
  }
}
```

---

## Error Handling

```scala
// app/handlers/CustomErrorHandler.scala
package handlers

import javax.inject._
import play.api.http.HttpErrorHandler
import play.api.mvc._
import play.api.mvc.Results._
import play.api.libs.json._
import play.api.Logger
import scala.concurrent.Future

@Singleton
class CustomErrorHandler @Inject()() extends HttpErrorHandler {

  private val logger = Logger(this.getClass)

  override def onClientError(
    request: RequestHeader, statusCode: Int, message: String
  ): Future[Result] = {
    val errorResponse = statusCode match {
      case 400 => Json.obj("error" -> "Bad Request", "code" -> "BAD_REQUEST")
      case 401 => Json.obj("error" -> "Unauthorized", "code" -> "UNAUTHORIZED")
      case 404 => Json.obj("error" -> "Not Found", "code" -> "NOT_FOUND")
      case _ => Json.obj("error" -> "Client Error", "code" -> s"ERROR_$statusCode")
    }
    Future.successful(Status(statusCode)(errorResponse))
  }

  override def onServerError(
    request: RequestHeader, exception: Throwable
  ): Future[Result] = {
    logger.error(s"Server error on ${request.method} ${request.path}", exception)
    Future.successful(InternalServerError(Json.obj(
      "error" -> "Internal Server Error",
      "code" -> "INTERNAL_ERROR"
    )))
  }
}
```

---

## Health Check Endpoint

```scala
// app/controllers/HealthController.scala
package controllers

import javax.inject._
import play.api.mvc._
import play.api.libs.json._
import scala.concurrent.{ExecutionContext, Future}
import java.time.Instant

@Singleton
class HealthController @Inject()(
  val controllerComponents: ControllerComponents,
  dbHealth: DatabaseHealthCheck
)(implicit ec: ExecutionContext) extends BaseController {

  private val startTime = Instant.now()

  def check(): Action[AnyContent] = Action {
    Ok(Json.obj("status" -> "healthy", "timestamp" -> Instant.now().toString))
  }

  def ready(): Action[AnyContent] = Action.async {
    dbHealth.check().map { dbStatus =>
      val status = if (dbStatus) "ready" else "not_ready"
      val code = if (dbStatus) OK else SERVICE_UNAVAILABLE
      Status(code)(Json.obj(
        "status" -> status,
        "uptime" -> s"${java.time.Duration.between(startTime, Instant.now()).toSeconds}s"
      ))
    }
  }
}
```

---

## Testing Your API

```scala
// test/controllers/UserControllerSpec.scala
package controllers

import org.scalatestplus.play._
import org.scalatestplus.play.guice._
import play.api.test._
import play.api.test.Helpers._
import play.api.libs.json._
import play.api.inject.bind
import play.api.inject.guice.GuiceApplicationBuilder
import org.mockito.Mockito._
import scala.concurrent.Future
import models.{User, UserRole}
import services.UserService
import java.time.Instant

class UserControllerSpec extends PlaySpec with GuiceOneAppPerTest {

  val mockUserService = mock(classOf[UserService])

  override def fakeApplication() = {
    GuiceApplicationBuilder()
      .overrides(bind[UserService].toInstance(mockUserService))
      .build()
  }

  val testUser = User(1L, "test@example.com", "Test User", UserRole.Viewer,
    Instant.now(), Instant.now())

  "UserController GET /api/v1/users/:id" should {
    "return 200 with user when found" in {
      when(mockUserService.getUser(1L)).thenReturn(Future.successful(Some(testUser)))

      val request = FakeRequest(GET, "/api/v1/users/1")
      val result = route(app, request).get

      status(result) mustBe OK
      (contentAsJson(result) \ "id").as[Long] mustBe 1L
    }

    "return 404 when user not found" in {
      when(mockUserService.getUser(999L)).thenReturn(Future.successful(None))

      val request = FakeRequest(GET, "/api/v1/users/999")
      val result = route(app, request).get

      status(result) mustBe NOT_FOUND
    }
  }

  "UserController POST /api/v1/users" should {
    "return 201 with created user" in {
      when(mockUserService.createUser(any())).thenReturn(Future.successful(testUser))

      val requestBody = Json.obj(
        "email" -> "test@example.com",
        "name" -> "Test User",
        "password" -> "securepassword123"
      )

      val request = FakeRequest(POST, "/api/v1/users")
        .withHeaders("Content-Type" -> "application/json")
        .withBody(requestBody)

      val result = route(app, request).get

      status(result) mustBe CREATED
      header("Location", result) mustBe Some("/api/v1/users/1")
    }
  }
}
```

---

## Running the Application

```bash
# Development mode with hot reload
sbt run

# Production distribution
sbt dist
unzip target/universal/user-api-1.0.0.zip
./user-api-1.0.0/bin/user-api -Dplay.http.secret.key="your-secret"
```

---

## Conclusion

Play Framework provides a powerful, type-safe foundation for building REST APIs in Scala. Key takeaways:

- **Routing** is declarative and type-safe
- **Controllers** should be thin and delegate to services
- **Play JSON** provides compile-time safety for serialization
- **Guice DI** enables loose coupling and testability
- **Action composition** handles cross-cutting concerns elegantly

The combination of Scala's type system and Play's conventions helps catch errors at compile time rather than runtime, making your APIs more reliable.

---

*Building a REST API? Monitor its performance and availability with [OneUptime](https://oneuptime.com). Get real-time alerts, track response times, and ensure your API stays healthy with comprehensive monitoring and observability tools.*

**Related Reading:**
- [Traces and Spans in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry)
- [How to Reduce Noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry)
- [The Three Pillars of Observability](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces)
