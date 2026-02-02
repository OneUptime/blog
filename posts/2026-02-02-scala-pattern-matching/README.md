# How to Implement Pattern Matching in Scala

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Scala, Pattern Matching, Functional Programming, Case Classes, Type Safety

Description: Master Scala's powerful pattern matching with match expressions, case classes, extractors, guards, and real-world use cases for cleaner code.

---

If you've ever written a bunch of nested if-else statements to handle different data types or values, you know how messy it can get. Pattern matching in Scala is one of those features that makes you wonder how you ever lived without it. It's like a switch statement on steroids - you can match on types, destructure objects, add conditions, and more.

In this guide, we'll go through the different ways to use pattern matching in Scala, starting from the basics and working up to more advanced techniques.

## Basic Match Expressions

The simplest form of pattern matching uses the `match` keyword. Here's how it works:

```scala
// Basic value matching
def describeNumber(x: Int): String = x match {
  case 0 => "zero"
  case 1 => "one"
  case 2 => "two"
  case _ => "many"  // underscore is the wildcard - catches everything else
}

println(describeNumber(1))  // prints: one
println(describeNumber(42)) // prints: many
```

The `_` wildcard acts as a catch-all. Without it, you'd get a `MatchError` if none of the cases match.

## Type Matching

You can match on the type of a value, which is super handy when dealing with heterogeneous data:

```scala
// Matching on types
def describe(x: Any): String = x match {
  case i: Int => s"Integer: $i"
  case s: String => s"String of length ${s.length}"
  case list: List[_] => s"A list with ${list.size} elements"
  case _ => "Something else"
}

println(describe(42))           // prints: Integer: 42
println(describe("hello"))      // prints: String of length 5
println(describe(List(1,2,3)))  // prints: A list with 3 elements
```

Note the `List[_]` syntax - the underscore is needed because of type erasure at runtime.

## Pattern Matching with Case Classes

This is where pattern matching really shines. Case classes automatically get an `unapply` method that enables destructuring:

```scala
// Define some case classes
case class Person(name: String, age: Int)
case class Order(id: String, amount: Double, customer: Person)

def processOrder(order: Order): String = order match {
  // Destructure and access nested fields directly
  case Order(id, amount, Person(name, _)) if amount > 1000 =>
    s"Large order $id from $name"
  case Order(id, _, Person(name, age)) if age < 18 =>
    s"Order $id requires parental consent for $name"
  case Order(id, amount, _) =>
    s"Processing order $id for $$${amount}"
}

val customer = Person("Alice", 25)
val order = Order("ORD-123", 1500.0, customer)
println(processOrder(order))  // prints: Large order ORD-123 from Alice
```

## Sealed Traits for Exhaustive Matching

When you use sealed traits, the compiler can check if you've covered all cases:

```scala
// Sealed trait - all subclasses must be in the same file
sealed trait PaymentMethod
case class CreditCard(number: String, expiry: String) extends PaymentMethod
case class PayPal(email: String) extends PaymentMethod
case class BankTransfer(accountNumber: String) extends PaymentMethod

def processPayment(method: PaymentMethod): String = method match {
  case CreditCard(num, _) => s"Charging card ending in ${num.takeRight(4)}"
  case PayPal(email) => s"Redirecting to PayPal for $email"
  case BankTransfer(acc) => s"Initiating transfer to $acc"
  // No need for _ case - compiler knows we've covered everything
}
```

If you add a new payment method later and forget to handle it, you'll get a compiler warning.

## Guards for Additional Conditions

You've seen guards already in the examples above (the `if` clauses). Here's a more detailed look:

```scala
def categorize(value: Int): String = value match {
  case n if n < 0 => "negative"
  case 0 => "zero"
  case n if n > 0 && n <= 10 => "small positive"
  case n if n > 10 && n <= 100 => "medium positive"
  case _ => "large positive"
}

println(categorize(-5))   // prints: negative
println(categorize(7))    // prints: small positive
println(categorize(150))  // prints: large positive
```

## Pattern Matching Syntax Reference

Here's a quick reference for the different pattern types:

| Pattern Type | Syntax | Example |
|-------------|--------|---------|
| Literal | `case 42 =>` | Matches exact value |
| Variable | `case x =>` | Binds matched value to x |
| Wildcard | `case _ =>` | Matches anything, no binding |
| Type | `case x: String =>` | Matches type, binds to x |
| Constructor | `case Person(n, a) =>` | Destructures case class |
| Tuple | `case (a, b) =>` | Destructures tuples |
| List | `case head :: tail =>` | Destructures lists |
| Guard | `case x if x > 0 =>` | Adds condition |
| Or | `case 1 | 2 | 3 =>` | Matches any of the values |
| @ binding | `case p @ Person(_, _) =>` | Binds whole match to p |

## Option Matching

Scala's `Option` type is perfect for pattern matching - it's way cleaner than null checks:

```scala
def greet(maybeName: Option[String]): String = maybeName match {
  case Some(name) => s"Hello, $name!"
  case None => "Hello, stranger!"
}

println(greet(Some("Bob")))  // prints: Hello, Bob!
println(greet(None))         // prints: Hello, stranger!

// You can also use pattern matching in for comprehensions
val users = List(Some("Alice"), None, Some("Charlie"))
for {
  Some(name) <- users  // Only iterates over Some values
} println(s"Found user: $name")
// prints:
// Found user: Alice
// Found user: Charlie
```

## Pattern Matching in Variable Assignment

You can use patterns directly in variable assignments:

```scala
// Destructuring a tuple
val (x, y, z) = (1, 2, 3)
println(s"x=$x, y=$y, z=$z")  // prints: x=1, y=2, z=3

// Destructuring a case class
val Person(name, age) = Person("Alice", 30)
println(s"$name is $age years old")  // prints: Alice is 30 years old

// Destructuring a list
val first :: second :: rest = List(1, 2, 3, 4, 5)
println(s"first=$first, second=$second, rest=$rest")
// prints: first=1, second=2, rest=List(3, 4, 5)
```

## Custom Extractors

You can define your own extractors using the `unapply` method:

```scala
// Custom extractor for email addresses
object Email {
  def unapply(str: String): Option[(String, String)] = {
    val parts = str.split("@")
    if (parts.length == 2) Some((parts(0), parts(1)))
    else None
  }
}

def processEmail(input: String): String = input match {
  case Email(user, domain) => s"User: $user, Domain: $domain"
  case _ => "Invalid email format"
}

println(processEmail("alice@example.com"))  // prints: User: alice, Domain: example.com
println(processEmail("not-an-email"))       // prints: Invalid email format
```

## Real-World Example: HTTP Response Handler

Here's a practical example showing how pattern matching can clean up response handling:

```scala
sealed trait HttpResponse
case class Success(body: String, statusCode: Int) extends HttpResponse
case class Redirect(location: String, statusCode: Int) extends HttpResponse
case class ClientError(message: String, statusCode: Int) extends HttpResponse
case class ServerError(message: String, statusCode: Int) extends HttpResponse

def handleResponse(response: HttpResponse): String = response match {
  case Success(body, 200) => s"OK: $body"
  case Success(body, 201) => s"Created: $body"
  case Redirect(loc, code) if code == 301 => s"Permanent redirect to $loc"
  case Redirect(loc, _) => s"Temporary redirect to $loc"
  case ClientError(msg, 404) => s"Not found: $msg"
  case ClientError(msg, 401) => s"Unauthorized: $msg"
  case ClientError(msg, code) => s"Client error $code: $msg"
  case ServerError(msg, _) => s"Server error: $msg - please retry later"
}
```

## Wrapping Up

Pattern matching is one of Scala's killer features. It makes your code more readable, safer (especially with sealed traits), and often more concise. The key things to remember:

- Use `match` expressions instead of long if-else chains
- Case classes give you destructuring for free
- Sealed traits enable exhaustive matching with compiler checks
- Guards add flexibility when simple patterns aren't enough
- Custom extractors let you match on anything

Once you get comfortable with pattern matching, you'll find yourself using it everywhere. It's particularly valuable when working with ADTs (algebraic data types) and handling different states in your application.
