# How to Use Kotlin Coroutines for Async Programming

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kotlin, Coroutines, Async, Concurrency, Android

Description: A practical guide to Kotlin coroutines, covering suspend functions, coroutine scopes, dispatchers, structured concurrency, and error handling patterns.

---

If you've ever written callback-heavy code in Kotlin or Java, you know how quickly it turns into unreadable spaghetti. Threads are expensive, callbacks are ugly, and RxJava has a steep learning curve. Kotlin coroutines solve these problems by letting you write asynchronous code that looks and reads like synchronous code.

Coroutines are lightweight threads. Unlike OS threads that consume megabytes of memory, you can spin up thousands of coroutines without breaking a sweat. They suspend execution without blocking threads, which means your application stays responsive while waiting for network calls, database queries, or file I/O.

## Suspend Functions - The Building Blocks

A suspend function can pause its execution and resume later without blocking the thread it's running on. You mark a function with the `suspend` keyword, and Kotlin handles the rest.

```kotlin
// A suspend function can call other suspend functions
// and will pause at suspension points (like delay) without blocking
suspend fun fetchUserData(userId: String): User {
    // delay is a suspend function - it pauses without blocking the thread
    delay(1000) // Simulates network latency
    return User(userId, "John Doe")
}

// Suspend functions can only be called from other suspend functions
// or from a coroutine scope
suspend fun fetchUserWithPosts(userId: String): UserWithPosts {
    val user = fetchUserData(userId)
    val posts = fetchPosts(userId) // Another suspend function
    return UserWithPosts(user, posts)
}
```

The key thing here: suspend functions don't block. When `delay(1000)` runs, the coroutine pauses, but the thread is free to do other work.

## Launch vs Async - Fire-and-Forget vs Getting Results

Kotlin gives you two main coroutine builders. Use `launch` when you don't need a result back. Use `async` when you need to compute something and return a value.

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    // launch - fire and forget, returns a Job
    // Use when you don't need the result
    val job = launch {
        println("Starting background task...")
        delay(1000)
        println("Background task complete")
    }

    // async - returns a Deferred<T> which holds the eventual result
    // Use when you need to compute and return a value
    val deferred = async {
        delay(500)
        42 // Returns this value
    }

    // await() suspends until the result is ready
    val result = deferred.await()
    println("Async result: $result")

    // Wait for launch to complete
    job.join()
}
```

The real power shows when you run multiple async operations in parallel:

```kotlin
suspend fun fetchDashboardData(): DashboardData = coroutineScope {
    // These three network calls run in parallel
    val userDeferred = async { fetchUser() }
    val ordersDeferred = async { fetchOrders() }
    val notificationsDeferred = async { fetchNotifications() }

    // Wait for all three and combine results
    DashboardData(
        user = userDeferred.await(),
        orders = ordersDeferred.await(),
        notifications = notificationsDeferred.await()
    )
}
```

Without coroutines, this would either run sequentially (slow) or require complex callback orchestration (painful).

## Dispatchers - Where Your Code Runs

Dispatchers determine which thread or thread pool executes your coroutine. Pick the wrong dispatcher and you'll either block the main thread or waste resources.

| Dispatcher | Thread Pool | Use Case |
|------------|-------------|----------|
| Dispatchers.Main | Main/UI thread | UI updates, light work |
| Dispatchers.IO | Shared pool optimized for I/O | Network calls, file I/O, database |
| Dispatchers.Default | Shared pool sized to CPU cores | CPU-intensive calculations |
| Dispatchers.Unconfined | No specific thread | Testing, advanced use cases |

```kotlin
import kotlinx.coroutines.*

suspend fun processData() {
    // Switch to IO dispatcher for network call
    val data = withContext(Dispatchers.IO) {
        // This runs on the IO thread pool
        fetchFromNetwork()
    }

    // Switch to Default for CPU-intensive work
    val processed = withContext(Dispatchers.Default) {
        // This runs on the Default thread pool
        heavyComputation(data)
    }

    // Back to whatever dispatcher we started on
    updateUI(processed)
}
```

The `withContext` function switches dispatchers and suspends until the block completes. It's the clean way to hop between thread pools.

## Coroutine Scopes and Structured Concurrency

Structured concurrency means coroutines follow a parent-child hierarchy. When a parent scope cancels, all its children cancel too. When a child fails, it can propagate to the parent. This prevents resource leaks and orphaned coroutines.

```kotlin
class UserRepository {
    // Create a scope tied to the repository's lifecycle
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    fun fetchUsers() {
        // Coroutines launched here are children of this scope
        scope.launch {
            val users = api.getUsers()
            cache.store(users)
        }
    }

    // Clean up when the repository is no longer needed
    fun cleanup() {
        scope.cancel() // Cancels all coroutines in this scope
    }
}
```

On Android, use the built-in scopes:

```kotlin
class MyViewModel : ViewModel() {
    fun loadData() {
        // viewModelScope auto-cancels when ViewModel is cleared
        viewModelScope.launch {
            val result = repository.fetchData()
            _uiState.value = result
        }
    }
}

class MyFragment : Fragment() {
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        // lifecycleScope auto-cancels when lifecycle is destroyed
        viewLifecycleOwner.lifecycleScope.launch {
            val data = viewModel.getData()
            binding.textView.text = data
        }
    }
}
```

## Exception Handling

Exceptions in coroutines can be tricky. The behavior differs between `launch` and `async`.

```kotlin
fun main() = runBlocking {
    // Option 1: Try-catch inside the coroutine
    launch {
        try {
            riskyOperation()
        } catch (e: Exception) {
            println("Caught: ${e.message}")
        }
    }

    // Option 2: CoroutineExceptionHandler for launch
    val handler = CoroutineExceptionHandler { _, exception ->
        println("Caught in handler: ${exception.message}")
    }

    launch(handler) {
        throw RuntimeException("Something broke")
    }

    // Option 3: For async, exceptions are thrown when you call await()
    val deferred = async {
        throw RuntimeException("Async failure")
    }

    try {
        deferred.await()
    } catch (e: Exception) {
        println("Caught from await: ${e.message}")
    }
}
```

Use `SupervisorJob` when you want child failures to not cancel siblings:

```kotlin
val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

scope.launch {
    // If this fails, the other launch continues
    fetchUserData()
}

scope.launch {
    // This keeps running even if the above fails
    fetchProductData()
}
```

## Cancellation

Coroutines support cooperative cancellation. Your code needs to check for cancellation or call suspend functions that do.

```kotlin
suspend fun downloadFiles(urls: List<String>) = coroutineScope {
    for (url in urls) {
        // ensureActive() throws CancellationException if cancelled
        ensureActive()
        downloadFile(url)
    }
}

// Or check manually
suspend fun processItems(items: List<Item>) {
    for (item in items) {
        // isActive is false if the coroutine was cancelled
        if (!isActive) break
        process(item)
    }
}
```

Cancellation is important for resource cleanup. Always handle it properly:

```kotlin
suspend fun readFile() {
    val reader = openFile()
    try {
        while (reader.hasNext()) {
            ensureActive()
            processLine(reader.readLine())
        }
    } finally {
        // This runs even if cancelled
        reader.close()
    }
}
```

## Practical Example: Parallel API Calls with Timeout

Here's a real-world pattern combining everything:

```kotlin
suspend fun fetchDashboard(): Result<Dashboard> = coroutineScope {
    try {
        // Timeout the entire operation after 10 seconds
        withTimeout(10_000) {
            // Run all fetches in parallel
            val user = async(Dispatchers.IO) { userApi.fetch() }
            val orders = async(Dispatchers.IO) { orderApi.fetchRecent() }
            val stats = async(Dispatchers.IO) { statsApi.fetch() }

            Result.success(
                Dashboard(
                    user = user.await(),
                    orders = orders.await(),
                    stats = stats.await()
                )
            )
        }
    } catch (e: TimeoutCancellationException) {
        Result.failure(Exception("Dashboard load timed out"))
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

## Getting Started

Add the coroutines dependency to your project:

```kotlin
// build.gradle.kts
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")

    // For Android
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
}
```

Start small. Convert one callback-based function to a suspend function. Then expand from there. Once you get the hang of it, you'll wonder how you ever lived without coroutines.
