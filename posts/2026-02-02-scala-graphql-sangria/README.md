# How to Build GraphQL APIs with Sangria in Scala

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Scala, GraphQL, Sangria, API, Type Safety

Description: Learn how to build type-safe GraphQL APIs in Scala using Sangria, covering schema definition, queries, mutations, and integration with Akka HTTP.

---

GraphQL has become the go-to choice for building flexible APIs that let clients request exactly the data they need. If you are working in Scala, Sangria is the library you want. It brings GraphQL to Scala with full type safety, leveraging Scala's powerful type system to catch schema errors at compile time rather than runtime.

Sangria maps GraphQL types directly to Scala case classes and traits. This means your schema definition becomes part of your codebase, not a separate SDL file that can drift out of sync. When your types change, the compiler tells you everywhere the schema needs updating.

## Setting Up Your Project

Add these dependencies to your `build.sbt`:

```scala
// build.sbt
libraryDependencies ++= Seq(
  "org.sangria-graphql" %% "sangria" % "4.1.0",
  "org.sangria-graphql" %% "sangria-spray-json" % "1.0.3",
  "com.typesafe.akka" %% "akka-http" % "10.5.3",
  "com.typesafe.akka" %% "akka-http-spray-json" % "10.5.3",
  "com.typesafe.akka" %% "akka-stream" % "2.8.5"
)
```

## Defining Your Domain Models

Start with simple case classes representing your domain. These will map directly to GraphQL types.

```scala
// Models.scala
package models

case class User(
  id: String,
  name: String,
  email: String,
  posts: List[String] // post IDs, resolved later
)

case class Post(
  id: String,
  title: String,
  content: String,
  authorId: String
)
```

## Creating GraphQL Object Types

Sangria uses `ObjectType` to define how your models appear in the GraphQL schema. Each field maps to a case class property or a computed value.

```scala
// Schema.scala
package graphql

import sangria.schema._
import models._

// Define the Post type first since User references it
lazy val PostType: ObjectType[Unit, Post] = ObjectType(
  "Post",
  "A blog post written by a user",
  fields[Unit, Post](
    Field("id", StringType, resolve = _.value.id),
    Field("title", StringType, resolve = _.value.title),
    Field("content", StringType, resolve = _.value.content),
    Field("authorId", StringType, resolve = _.value.authorId)
  )
)

// User type with deferred post resolution
lazy val UserType: ObjectType[AppContext, User] = ObjectType(
  "User",
  "A registered user in the system",
  fields[AppContext, User](
    Field("id", StringType, resolve = _.value.id),
    Field("name", StringType, resolve = _.value.name),
    Field("email", StringType, resolve = _.value.email),
    // Resolve posts through the context's data fetcher
    Field("posts", ListType(PostType),
      resolve = ctx => ctx.ctx.postRepository.findByIds(ctx.value.posts)
    )
  )
)
```

Notice the `lazy val` declarations - this handles circular references between types. GraphQL schemas often have bidirectional relationships (users have posts, posts have authors), and lazy evaluation prevents initialization order issues.

## The Context Object

Sangria uses a context object to provide dependencies to resolvers. This is where you inject your repositories, services, and any request-specific data.

```scala
// AppContext.scala
package graphql

import repositories._

// Context available to all resolvers
case class AppContext(
  userRepository: UserRepository,
  postRepository: PostRepository,
  currentUserId: Option[String] = None // for authenticated requests
)
```

## Building Query Types

Queries are read operations. Define them as fields on a root Query type.

```scala
// Schema.scala (continued)

val QueryType: ObjectType[AppContext, Unit] = ObjectType(
  "Query",
  fields[AppContext, Unit](
    // Fetch a single user by ID
    Field("user", OptionType(UserType),
      arguments = Argument("id", StringType) :: Nil,
      resolve = ctx => ctx.ctx.userRepository.findById(ctx.arg[String]("id"))
    ),

    // Fetch all users with optional limit
    Field("users", ListType(UserType),
      arguments = Argument("limit", OptionInputType(IntType), defaultValue = 10) :: Nil,
      resolve = ctx => ctx.ctx.userRepository.findAll(ctx.arg[Int]("limit"))
    ),

    // Fetch a single post by ID
    Field("post", OptionType(PostType),
      arguments = Argument("id", StringType) :: Nil,
      resolve = ctx => ctx.ctx.postRepository.findById(ctx.arg[String]("id"))
    ),

    // Search posts by title
    Field("searchPosts", ListType(PostType),
      arguments = Argument("query", StringType) :: Nil,
      resolve = ctx => ctx.ctx.postRepository.search(ctx.arg[String]("query"))
    )
  )
)
```

## Defining Mutations

Mutations handle create, update, and delete operations. They follow the same pattern as queries but typically accept input objects.

```scala
// Schema.scala (continued)

// Input type for creating a new user
val CreateUserInput: InputObjectType[DefaultInput] = InputObjectType(
  "CreateUserInput",
  List(
    InputField("name", StringType),
    InputField("email", StringType)
  )
)

// Input type for creating a new post
val CreatePostInput: InputObjectType[DefaultInput] = InputObjectType(
  "CreatePostInput",
  List(
    InputField("title", StringType),
    InputField("content", StringType)
  )
)

val MutationType: ObjectType[AppContext, Unit] = ObjectType(
  "Mutation",
  fields[AppContext, Unit](
    // Create a new user
    Field("createUser", UserType,
      arguments = Argument("input", CreateUserInput) :: Nil,
      resolve = ctx => {
        val input = ctx.arg[Map[String, Any]]("input")
        ctx.ctx.userRepository.create(
          name = input("name").asInstanceOf[String],
          email = input("email").asInstanceOf[String]
        )
      }
    ),

    // Create a new post (requires authentication)
    Field("createPost", PostType,
      arguments = Argument("input", CreatePostInput) :: Nil,
      resolve = ctx => {
        val authorId = ctx.ctx.currentUserId.getOrElse(
          throw new Exception("Authentication required")
        )
        val input = ctx.arg[Map[String, Any]]("input")
        ctx.ctx.postRepository.create(
          title = input("title").asInstanceOf[String],
          content = input("content").asInstanceOf[String],
          authorId = authorId
        )
      }
    ),

    // Delete a post
    Field("deletePost", BooleanType,
      arguments = Argument("id", StringType) :: Nil,
      resolve = ctx => ctx.ctx.postRepository.delete(ctx.arg[String]("id"))
    )
  )
)
```

## Assembling the Schema

Combine your query and mutation types into a complete schema:

```scala
// Schema.scala (continued)

val schema: Schema[AppContext, Unit] = Schema(
  query = QueryType,
  mutation = Some(MutationType)
)
```

## GraphQL Type Mapping Reference

Here is how Scala types map to GraphQL types in Sangria:

| Scala Type | Sangria Type | GraphQL Type |
|------------|--------------|--------------|
| `String` | `StringType` | `String` |
| `Int` | `IntType` | `Int` |
| `Long` | `LongType` | `Int` (GraphQL has no Long) |
| `Double` | `FloatType` | `Float` |
| `Boolean` | `BooleanType` | `Boolean` |
| `Option[T]` | `OptionType(T)` | `T` (nullable) |
| `List[T]` | `ListType(T)` | `[T]` |
| `Future[T]` | Supported directly | Resolved async |

## Integrating with Akka HTTP

Wire up an HTTP endpoint to execute GraphQL queries:

```scala
// GraphQLServer.scala
package server

import akka.actor.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.model._
import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.marshallers.sprayjson.SprayJsonSupport._
import spray.json._
import sangria.execution._
import sangria.parser.QueryParser
import sangria.marshalling.sprayJson._
import graphql._
import repositories._

import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Success, Failure}

object GraphQLServer extends App with DefaultJsonProtocol {
  implicit val system: ActorSystem = ActorSystem("graphql-server")
  implicit val ec: ExecutionContext = system.dispatcher

  // Initialize repositories (replace with real implementations)
  val userRepo = new InMemoryUserRepository()
  val postRepo = new InMemoryPostRepository()

  // Execute a GraphQL query
  def executeQuery(
    query: String,
    operationName: Option[String],
    variables: JsObject
  ): Future[JsValue] = {
    QueryParser.parse(query) match {
      case Success(queryAst) =>
        // Create context with repositories
        val context = AppContext(userRepo, postRepo, currentUserId = Some("user-1"))

        Executor.execute(
          schema = Schema.schema,
          queryAst = queryAst,
          userContext = context,
          operationName = operationName,
          variables = variables
        ).map(_.toJson)
         .recover {
           case error: QueryAnalysisError =>
             JsObject("errors" -> JsArray(JsString(error.getMessage)))
           case error: ErrorWithResolver =>
             JsObject("errors" -> JsArray(JsString(error.getMessage)))
         }

      case Failure(error) =>
        Future.successful(
          JsObject("errors" -> JsArray(JsString(s"Query parsing failed: ${error.getMessage}")))
        )
    }
  }

  // HTTP route for GraphQL endpoint
  val route = path("graphql") {
    post {
      entity(as[JsObject]) { requestJson =>
        val query = requestJson.fields("query").convertTo[String]
        val operationName = requestJson.fields.get("operationName").collect {
          case JsString(name) => name
        }
        val variables = requestJson.fields.get("variables") match {
          case Some(obj: JsObject) => obj
          case _ => JsObject.empty
        }

        complete(executeQuery(query, operationName, variables))
      }
    }
  }

  // Start the server
  Http().newServerAt("localhost", 8080).bind(route)
  println("GraphQL server running at http://localhost:8080/graphql")
}
```

## Error Handling in Resolvers

Sangria provides clean error handling that maps to GraphQL error responses:

```scala
// Custom exception for business logic errors
case class AuthorizationError(message: String) extends Exception(message)
case class NotFoundError(resource: String, id: String)
  extends Exception(s"$resource with id $id not found")

// In your resolver
Field("updatePost", PostType,
  arguments = List(
    Argument("id", StringType),
    Argument("input", UpdatePostInput)
  ),
  resolve = ctx => {
    val postId = ctx.arg[String]("id")
    val post = ctx.ctx.postRepository.findById(postId)
      .getOrElse(throw NotFoundError("Post", postId))

    // Check authorization
    if (post.authorId != ctx.ctx.currentUserId.getOrElse("")) {
      throw AuthorizationError("You can only edit your own posts")
    }

    // Proceed with update
    val input = ctx.arg[Map[String, Any]]("input")
    ctx.ctx.postRepository.update(postId, input)
  }
)
```

## Running Queries

With the server running, you can execute queries like this:

```graphql
# Fetch a user with their posts
query GetUserWithPosts {
  user(id: "user-1") {
    id
    name
    email
    posts {
      id
      title
    }
  }
}

# Create a new post
mutation CreateNewPost {
  createPost(input: {
    title: "Getting Started with Sangria"
    content: "Sangria brings type-safe GraphQL to Scala..."
  }) {
    id
    title
  }
}
```

## Summary

Sangria gives you a type-safe way to build GraphQL APIs in Scala. The key pieces are:

- **ObjectType** for defining GraphQL types from case classes
- **Field** for mapping properties and computed values
- **Arguments** for query and mutation parameters
- **InputObjectType** for mutation input validation
- **Context** for dependency injection into resolvers

The type safety is the real win here. Schema changes break at compile time, not when a client sends an unexpected query at 3am. Combined with Akka HTTP, you get a solid foundation for production GraphQL services.
