# How to Use Async/Await in Swift Concurrency

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Swift, Async Await, Concurrency, iOS, Modern Swift

Description: Master Swift's modern concurrency model with async/await, tasks, actors, and structured concurrency for cleaner and safer asynchronous code.

---

If you've been writing Swift for a while, you know the pain of callback hell. Nested completion handlers, retain cycles, forgotten error handling - we've all been there. With Swift 5.5+, Apple introduced a modern concurrency model that makes asynchronous code look almost like synchronous code. Let's dive into how async/await works and why it makes your life easier.

## The Old Way vs The New Way

Before we get into the details, here's a quick comparison of what we're replacing:

| Completion Handler Pattern | Async/Await Pattern |
|---------------------------|---------------------|
| Callback-based | Linear code flow |
| Error handling scattered | try/catch at call site |
| Easy to forget calling completion | Compiler enforces returns |
| Nested callbacks (pyramid of doom) | Flat, readable structure |
| Manual thread management | Structured concurrency |

## Async Functions Basics

An async function is declared with the `async` keyword. When you call it, you use `await` to wait for the result.

```swift
// Define an async function that fetches user data
func fetchUserProfile(userId: String) async throws -> UserProfile {
    // Create the URL for the API endpoint
    let url = URL(string: "https://api.example.com/users/\(userId)")!

    // URLSession's data method is async - we await the result
    let (data, response) = try await URLSession.shared.data(from: url)

    // Check for valid HTTP response
    guard let httpResponse = response as? HTTPURLResponse,
          httpResponse.statusCode == 200 else {
        throw NetworkError.invalidResponse
    }

    // Decode and return the user profile
    return try JSONDecoder().decode(UserProfile.self, from: data)
}
```

The `async` keyword tells Swift this function can suspend and resume. The `throws` keyword works the same way it always has - if something fails, it throws an error.

## Using await

You can only call async functions from async contexts. Here's how you use them:

```swift
// Another async function that uses our fetchUserProfile
func loadUserAndPosts(userId: String) async throws -> (UserProfile, [Post]) {
    // Fetch profile first
    let profile = try await fetchUserProfile(userId: userId)

    // Then fetch posts - these run sequentially
    let posts = try await fetchPosts(for: userId)

    return (profile, posts)
}
```

## Running Async Code in Parallel

If you have independent tasks, run them in parallel using `async let`:

```swift
func loadDashboard(userId: String) async throws -> Dashboard {
    // These three requests start immediately and run concurrently
    async let profile = fetchUserProfile(userId: userId)
    async let posts = fetchPosts(for: userId)
    async let notifications = fetchNotifications(for: userId)

    // Wait for all results - they're already running in parallel
    let dashboard = try await Dashboard(
        profile: profile,
        posts: posts,
        notifications: notifications
    )

    return dashboard
}
```

This is way cleaner than juggling multiple completion handlers with a dispatch group.

## Task - The Entry Point

Since you can't call async functions from synchronous code directly, you need a Task:

```swift
class ProfileViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        // Task creates an async context from synchronous code
        Task {
            do {
                let profile = try await fetchUserProfile(userId: "123")
                // Update UI with profile data
                self.updateUI(with: profile)
            } catch {
                self.showError(error)
            }
        }
    }

    func updateUI(with profile: UserProfile) {
        // UI updates happen here
        nameLabel.text = profile.name
    }
}
```

## TaskGroup for Dynamic Concurrency

When you need to run a variable number of tasks, use TaskGroup:

```swift
func fetchAllUserProfiles(userIds: [String]) async throws -> [UserProfile] {
    // withThrowingTaskGroup handles errors, withTaskGroup ignores them
    try await withThrowingTaskGroup(of: UserProfile.self) { group in
        // Add a child task for each user ID
        for userId in userIds {
            group.addTask {
                try await self.fetchUserProfile(userId: userId)
            }
        }

        // Collect results as they complete
        var profiles: [UserProfile] = []
        for try await profile in group {
            profiles.append(profile)
        }

        return profiles
    }
}
```

## Actors - Safe Shared State

Actors protect mutable state from data races. Think of them as classes with built-in synchronization:

```swift
// Actor ensures thread-safe access to the cache
actor ImageCache {
    private var cache: [URL: UIImage] = [:]

    func image(for url: URL) -> UIImage? {
        return cache[url]
    }

    func store(_ image: UIImage, for url: URL) {
        cache[url] = image
    }

    func clearCache() {
        cache.removeAll()
    }
}

// Using the actor
let imageCache = ImageCache()

func loadImage(from url: URL) async -> UIImage? {
    // Accessing actor properties/methods requires await
    if let cached = await imageCache.image(for: url) {
        return cached
    }

    // Fetch and cache the image
    guard let (data, _) = try? await URLSession.shared.data(from: url),
          let image = UIImage(data: data) else {
        return nil
    }

    await imageCache.store(image, for: url)
    return image
}
```

## MainActor for UI Updates

The `@MainActor` attribute ensures code runs on the main thread:

```swift
@MainActor
class ProfileViewModel: ObservableObject {
    @Published var profile: UserProfile?
    @Published var isLoading = false
    @Published var errorMessage: String?

    func loadProfile(userId: String) async {
        isLoading = true
        errorMessage = nil

        do {
            // This might run on background thread
            profile = try await fetchUserProfile(userId: userId)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}
```

You can also use MainActor for specific blocks:

```swift
func processData() async {
    let result = await heavyComputation()

    // Switch to main thread just for UI update
    await MainActor.run {
        self.resultLabel.text = result
    }
}
```

## Error Handling

Error handling with async/await uses the standard try/catch pattern:

```swift
func loadUserData() async {
    do {
        let profile = try await fetchUserProfile(userId: "123")
        let posts = try await fetchPosts(for: "123")
        await updateUI(profile: profile, posts: posts)
    } catch NetworkError.invalidResponse {
        await showAlert(message: "Server returned an invalid response")
    } catch NetworkError.noConnection {
        await showAlert(message: "Check your internet connection")
    } catch {
        await showAlert(message: "Something went wrong: \(error.localizedDescription)")
    }
}
```

## Bridging with Completion Handlers

You'll often need to wrap old completion handler APIs:

```swift
// Converting completion handler to async
func fetchLegacyData() async throws -> Data {
    try await withCheckedThrowingContinuation { continuation in
        // Call the old completion-based API
        LegacyAPI.fetchData { result in
            switch result {
            case .success(let data):
                continuation.resume(returning: data)
            case .failure(let error):
                continuation.resume(throwing: error)
            }
        }
    }
}

// For non-throwing continuations
func fetchOptionalData() async -> Data? {
    await withCheckedContinuation { continuation in
        LegacyAPI.fetchData { data in
            continuation.resume(returning: data)
        }
    }
}
```

Important: Only call `resume` exactly once per continuation. Calling it multiple times or not at all will cause problems.

## Task Cancellation

Swift's structured concurrency supports cooperative cancellation:

```swift
func downloadFiles(urls: [URL]) async throws -> [Data] {
    try await withThrowingTaskGroup(of: Data.self) { group in
        for url in urls {
            group.addTask {
                // Check if task was cancelled before starting work
                try Task.checkCancellation()

                let (data, _) = try await URLSession.shared.data(from: url)
                return data
            }
        }

        var results: [Data] = []
        for try await data in group {
            results.append(data)
        }
        return results
    }
}

// Cancelling a task
let downloadTask = Task {
    try await downloadFiles(urls: fileURLs)
}

// Later, if you need to cancel
downloadTask.cancel()
```

## Wrapping Up

Swift's async/await brings a lot to the table:

- Cleaner, more readable asynchronous code
- Compiler-enforced safety for concurrent access with actors
- Structured concurrency that handles cancellation automatically
- Better error handling that follows Swift conventions

The learning curve is worth it. Once you get comfortable with async/await, you'll find yourself writing more reliable concurrent code with less effort. Start by converting your network layer and work your way through the rest of your codebase.

The key things to remember: use `async let` for parallel work, actors for shared mutable state, and always check for cancellation in long-running tasks. Your future self will thank you for the cleaner code.
