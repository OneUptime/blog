# How to Implement Null Safety in Kotlin

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kotlin, Null Safety, Type System, Best Practices, Android

Description: Master Kotlin's null safety features including nullable types, safe calls, Elvis operator, and smart casts to write safer and more reliable code.

---

If you've ever worked with Java, you've probably dealt with the infamous `NullPointerException`. It's one of the most common runtime errors, and tracking down its source can be a real pain. Kotlin tackles this problem head-on by building null safety directly into its type system. Instead of discovering null-related bugs at runtime, the compiler catches them for you during development.

Let's walk through how Kotlin handles nullability and how you can use these features to write more reliable code.

## Nullable vs Non-Nullable Types

In Kotlin, types are non-nullable by default. If you try to assign `null` to a regular variable, the compiler will complain.

```kotlin
// This won't compile - String cannot be null
var name: String = "John"
name = null  // Compilation error!

// Use the ? suffix to make a type nullable
var nickname: String? = "Johnny"
nickname = null  // This is fine
```

This simple distinction eliminates a huge category of bugs. When you see a `String` parameter in a function, you know it will never be null. When you see `String?`, you know you need to handle the null case.

## The Safe Call Operator (?.)

When you have a nullable type, you can't just call methods on it directly. The safe call operator lets you access properties or call methods only when the value isn't null.

```kotlin
fun getNameLength(name: String?): Int? {
    // Returns the length if name is not null, otherwise returns null
    return name?.length
}

// Chaining safe calls works great
data class User(val address: Address?)
data class Address(val city: City?)
data class City(val name: String?)

fun getCityName(user: User?): String? {
    // If any part of the chain is null, the whole expression returns null
    return user?.address?.city?.name
}
```

## The Elvis Operator (?:)

The Elvis operator provides a default value when an expression evaluates to null. It's called Elvis because `?:` looks like Elvis's hair if you tilt your head.

```kotlin
fun getDisplayName(name: String?): String {
    // If name is null, use "Anonymous" instead
    return name ?: "Anonymous"
}

// You can also use it to return early or throw
fun processUser(user: User?) {
    val validUser = user ?: return  // Exit if user is null
    val address = validUser.address ?: throw IllegalStateException("Address required")

    println("Processing user from ${address.city?.name ?: "Unknown city"}")
}
```

## Not-Null Assertion (!!)

Sometimes you know a value won't be null even though the type system doesn't. The `!!` operator tells the compiler "trust me, this isn't null." Use it sparingly - if you're wrong, you'll get a NullPointerException.

```kotlin
fun processDefinitelyNotNull(value: String?) {
    // Only use !! when you're absolutely certain the value isn't null
    val length = value!!.length  // Throws NPE if value is null
}

// Better approach - validate and then use safely
fun processWithValidation(value: String?) {
    requireNotNull(value) { "Value cannot be null" }
    // After requireNotNull, the compiler knows value is non-null
    println(value.length)
}
```

## Smart Casts

Kotlin's compiler is smart enough to track null checks. After you check for null, the compiler automatically casts the variable to its non-nullable type.

```kotlin
fun printLength(text: String?) {
    if (text != null) {
        // Inside this block, text is automatically cast to String (non-null)
        println("Length: ${text.length}")
    }

    // Also works with when expressions
    when (text) {
        null -> println("Text is null")
        else -> println("Length: ${text.length}")  // text is smart-cast to String
    }
}

// Smart casts work with other conditions too
fun processInput(input: Any?) {
    if (input is String && input.isNotEmpty()) {
        // input is smart-cast to String here
        println("String with ${input.length} characters")
    }
}
```

## Scope Functions with Nullables

Kotlin's scope functions work great with nullable types. Here are some common patterns:

```kotlin
data class Config(var host: String = "", var port: Int = 0)

fun loadConfig(config: Config?) {
    // let - execute block only if not null
    config?.let { cfg ->
        println("Connecting to ${cfg.host}:${cfg.port}")
    }

    // also - same as let, but returns the original object
    config?.also {
        println("Config loaded: $it")
    }?.let {
        // Chain operations
        connectToServer(it)
    }

    // run - like let, but uses 'this' instead of 'it'
    config?.run {
        println("Host: $host, Port: $port")
    }
}

fun connectToServer(config: Config) {
    println("Connected to ${config.host}")
}

// takeIf and takeUnless for conditional returns
fun getValidPort(port: Int?): Int? {
    return port?.takeIf { it in 1..65535 }
}
```

## Platform Types

When calling Java code from Kotlin, the compiler doesn't know whether a value can be null. These are called platform types, shown as `String!` in error messages.

```kotlin
// Assume this Java method exists:
// public String getName() { return name; }

fun handleJavaInterop(javaObject: SomeJavaClass) {
    // javaObject.name has type String! (platform type)
    // The compiler won't enforce null checks, so be careful

    // Safe approach - treat it as nullable
    val name: String? = javaObject.name
    println(name?.uppercase() ?: "No name")

    // Or if you're confident it's never null
    val definiteName: String = javaObject.name  // Will throw if null
}
```

## Operator Quick Reference

| Operator | Name | Usage | Result |
|----------|------|-------|--------|
| `?` | Nullable type | `var x: String?` | Allows null values |
| `?.` | Safe call | `x?.length` | Returns null if x is null |
| `?:` | Elvis | `x ?: default` | Returns default if x is null |
| `!!` | Not-null assertion | `x!!.length` | Throws NPE if x is null |
| `as?` | Safe cast | `x as? String` | Returns null if cast fails |

## Best Practices

1. **Prefer non-nullable types** - Only use nullable types when null is a valid state
2. **Avoid `!!`** - It defeats the purpose of null safety. Use safe calls or early returns instead
3. **Use `requireNotNull` for validation** - It provides clear error messages and smart casts
4. **Handle platform types defensively** - Treat Java interop values as nullable unless documented otherwise
5. **Leverage scope functions** - `let`, `run`, and `also` make null handling cleaner

```kotlin
// Instead of this
fun processUser(user: User?) {
    if (user != null) {
        if (user.email != null) {
            sendEmail(user.email)
        }
    }
}

// Prefer this
fun processUserBetter(user: User?) {
    user?.email?.let { email ->
        sendEmail(email)
    }
}

fun sendEmail(email: String) {
    println("Sending email to $email")
}
```

## Wrapping Up

Kotlin's null safety features are one of its biggest advantages over Java. By making nullability explicit in the type system, you catch potential issues at compile time rather than discovering them in production. Start by making your types non-nullable by default, use safe calls and the Elvis operator for nullable types, and only reach for `!!` when you have a very good reason.

Once you get used to thinking about nullability as part of your types, you'll find your code becomes more predictable and easier to reason about. And you'll wonder how you ever lived without it.
