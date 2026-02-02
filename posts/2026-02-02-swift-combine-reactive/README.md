# How to Use Combine Framework for Reactive Programming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Swift, Combine, iOS, Reactive Programming, Publishers

Description: Learn how to use Apple's Combine framework to build reactive iOS applications with publishers, subscribers, and operators for handling asynchronous events.

---

> Combine is Apple's native framework for handling asynchronous events by combining event-processing operators. If you've been using RxSwift or ReactiveCocoa, Combine brings similar patterns directly into the Apple ecosystem with tight SwiftUI integration.

Reactive programming changes how you think about data flow. Instead of imperatively checking states and calling callbacks, you declare how data transforms and flows through your app. Combine makes this pattern first-class in Swift.

---

## Core Concepts

### Publishers, Subscribers, and Operators

Combine is built around three main concepts:

- **Publishers**: Emit values over time
- **Subscribers**: Receive and react to values
- **Operators**: Transform values between publishers and subscribers

```mermaid
graph LR
    A[Publisher] --> B[Operator 1]
    B --> C[Operator 2]
    C --> D[Subscriber]

    style A fill:#e1f5fe
    style D fill:#c8e6c9
```

---

## Getting Started with Publishers

### Built-in Publishers

Combine provides several built-in publishers that you'll use constantly. Here's how to create and use the most common ones:

```swift
import Combine

// Just emits a single value and then completes
// Useful for converting a regular value into a publisher
let justPublisher = Just("Hello, Combine!")

// Future is for async operations that produce a single value
// It wraps completion handlers into the Combine world
let futurePublisher = Future<String, Error> { promise in
    // Simulate async work like a network call
    DispatchQueue.global().asyncAfter(deadline: .now() + 1) {
        promise(.success("Async result"))
    }
}

// PassthroughSubject lets you manually send values
// Great for bridging imperative code to reactive streams
let subject = PassthroughSubject<Int, Never>()

// CurrentValueSubject holds and publishes the current value
// Subscribers immediately get the current value when they subscribe
let currentValue = CurrentValueSubject<String, Never>("Initial")
print(currentValue.value) // "Initial"
```

### Subscribing to Publishers

There are multiple ways to subscribe to publishers. The `sink` operator is the most flexible, giving you access to both completion and values:

```swift
import Combine

// Store cancellables to keep subscriptions alive
// When a cancellable is deallocated, the subscription ends
var cancellables = Set<AnyCancellable>()

let numbers = [1, 2, 3, 4, 5].publisher

// sink provides two closures: one for completion, one for each value
numbers
    .sink(
        receiveCompletion: { completion in
            switch completion {
            case .finished:
                print("Publisher finished normally")
            case .failure(let error):
                print("Publisher failed with: \(error)")
            }
        },
        receiveValue: { value in
            print("Received: \(value)")
        }
    )
    .store(in: &cancellables)

// Output:
// Received: 1
// Received: 2
// Received: 3
// Received: 4
// Received: 5
// Publisher finished normally
```

---

## Essential Operators

### Transforming Values with Map

The `map` operator transforms each value emitted by a publisher. It works just like `map` on arrays:

```swift
import Combine

var cancellables = Set<AnyCancellable>()

struct User {
    let id: Int
    let name: String
}

let users = [
    User(id: 1, name: "Alice"),
    User(id: 2, name: "Bob"),
    User(id: 3, name: "Charlie")
].publisher

// Transform User objects into just their names
users
    .map { user in
        user.name.uppercased()
    }
    .sink { name in
        print(name)
    }
    .store(in: &cancellables)

// Output:
// ALICE
// BOB
// CHARLIE
```

### Filtering Values

Filter lets you selectively pass through values that match a condition:

```swift
import Combine

var cancellables = Set<AnyCancellable>()

let scores = [85, 42, 91, 67, 78, 95, 33].publisher

// Only pass through scores of 70 or higher
scores
    .filter { score in
        score >= 70
    }
    .sink { passingScore in
        print("Passing: \(passingScore)")
    }
    .store(in: &cancellables)

// Output:
// Passing: 85
// Passing: 91
// Passing: 78
// Passing: 95
```

### CompactMap for Optional Handling

When dealing with optionals, `compactMap` removes nil values automatically:

```swift
import Combine

var cancellables = Set<AnyCancellable>()

let strings = ["1", "two", "3", "four", "5"].publisher

// Int(string) returns nil for non-numeric strings
// compactMap filters out the nils automatically
strings
    .compactMap { string in
        Int(string)
    }
    .sink { number in
        print("Parsed: \(number)")
    }
    .store(in: &cancellables)

// Output:
// Parsed: 1
// Parsed: 3
// Parsed: 5
```

### FlatMap for Nested Publishers

When each value needs to trigger another async operation, `flatMap` flattens nested publishers:

```swift
import Combine

var cancellables = Set<AnyCancellable>()

// Simulate fetching user details from an API
func fetchUserDetails(userId: Int) -> AnyPublisher<String, Never> {
    // In real code, this would be a network request
    Just("Details for user \(userId)")
        .delay(for: .milliseconds(100), scheduler: RunLoop.main)
        .eraseToAnyPublisher()
}

let userIds = [1, 2, 3].publisher

// For each userId, fetch details and flatten results into single stream
userIds
    .flatMap { userId in
        fetchUserDetails(userId: userId)
    }
    .sink { details in
        print(details)
    }
    .store(in: &cancellables)

// Output (may vary in order due to async):
// Details for user 1
// Details for user 2
// Details for user 3
```

---

## Combining Publishers

### Merge

Merge combines multiple publishers of the same type into a single stream:

```swift
import Combine

var cancellables = Set<AnyCancellable>()

let publisher1 = [1, 2, 3].publisher
let publisher2 = [4, 5, 6].publisher

// Merge interleaves values from both publishers
publisher1
    .merge(with: publisher2)
    .sink { value in
        print(value)
    }
    .store(in: &cancellables)

// Output: 1, 2, 3, 4, 5, 6 (order may vary with async publishers)
```

### CombineLatest

CombineLatest emits a tuple whenever either publisher emits, using the latest value from each:

```swift
import Combine

var cancellables = Set<AnyCancellable>()

let username = CurrentValueSubject<String, Never>("")
let password = CurrentValueSubject<String, Never>("")

// Combine latest values from both to determine if form is valid
username
    .combineLatest(password)
    .map { (user, pass) in
        // Both fields must have content
        !user.isEmpty && !pass.isEmpty
    }
    .sink { isValid in
        print("Form valid: \(isValid)")
    }
    .store(in: &cancellables)

// Simulate user typing
username.send("john")    // Form valid: false
password.send("secret")  // Form valid: true
```

### Zip

Zip pairs values from multiple publishers by index, waiting for both to emit:

```swift
import Combine

var cancellables = Set<AnyCancellable>()

let names = ["Alice", "Bob", "Charlie"].publisher
let scores = [85, 92, 78].publisher

// Zip pairs up values: first with first, second with second, etc.
names
    .zip(scores)
    .map { (name, score) in
        "\(name): \(score)"
    }
    .sink { result in
        print(result)
    }
    .store(in: &cancellables)

// Output:
// Alice: 85
// Bob: 92
// Charlie: 78
```

---

## Error Handling

### Catching Errors

The `catch` operator lets you recover from errors by providing a fallback publisher:

```swift
import Combine

var cancellables = Set<AnyCancellable>()

enum APIError: Error {
    case networkError
    case invalidResponse
}

func fetchData() -> AnyPublisher<String, APIError> {
    Fail(error: APIError.networkError)
        .eraseToAnyPublisher()
}

fetchData()
    .catch { error -> Just<String> in
        // Return a fallback value when the original fails
        print("Caught error: \(error)")
        return Just("Fallback data")
    }
    .sink { value in
        print("Received: \(value)")
    }
    .store(in: &cancellables)

// Output:
// Caught error: networkError
// Received: Fallback data
```

### Retry Failed Operations

For transient failures, `retry` automatically resubscribes:

```swift
import Combine

var cancellables = Set<AnyCancellable>()
var attemptCount = 0

func flakyRequest() -> AnyPublisher<String, Error> {
    attemptCount += 1
    print("Attempt \(attemptCount)")

    // Succeed on third attempt
    if attemptCount < 3 {
        return Fail(error: NSError(domain: "test", code: 1))
            .eraseToAnyPublisher()
    }
    return Just("Success!")
        .setFailureType(to: Error.self)
        .eraseToAnyPublisher()
}

flakyRequest()
    .retry(3)  // Retry up to 3 times on failure
    .sink(
        receiveCompletion: { completion in
            print("Completed: \(completion)")
        },
        receiveValue: { value in
            print("Value: \(value)")
        }
    )
    .store(in: &cancellables)

// Output:
// Attempt 1
// Attempt 2
// Attempt 3
// Value: Success!
// Completed: finished
```

### ReplaceError

For simpler cases where you just want a default value on error:

```swift
import Combine

var cancellables = Set<AnyCancellable>()

func riskyOperation() -> AnyPublisher<Int, Error> {
    Fail(error: NSError(domain: "test", code: 1))
        .eraseToAnyPublisher()
}

riskyOperation()
    .replaceError(with: 0)  // Use 0 as default on any error
    .sink { value in
        print("Value: \(value)")
    }
    .store(in: &cancellables)

// Output: Value: 0
```

---

## Practical Examples

### Debouncing Search Input

Debounce waits for a pause in events before emitting. Perfect for search-as-you-type:

```swift
import Combine
import Foundation

class SearchViewModel: ObservableObject {
    // Published property automatically creates a publisher
    @Published var searchText = ""
    @Published var results: [String] = []

    private var cancellables = Set<AnyCancellable>()

    init() {
        // $searchText gives us a publisher for the property
        $searchText
            // Wait 300ms after user stops typing
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            // Don't search for empty strings
            .filter { !$0.isEmpty }
            // Don't search if text hasn't changed
            .removeDuplicates()
            // Perform the search
            .flatMap { query in
                self.search(query: query)
            }
            // Update UI on main thread
            .receive(on: RunLoop.main)
            .sink { [weak self] results in
                self?.results = results
            }
            .store(in: &cancellables)
    }

    private func search(query: String) -> AnyPublisher<[String], Never> {
        // Simulate API call
        Just(["Result 1 for \(query)", "Result 2 for \(query)"])
            .delay(for: .milliseconds(200), scheduler: RunLoop.main)
            .eraseToAnyPublisher()
    }
}
```

### Network Request with Combine

Here's how to wrap URLSession requests in Combine:

```swift
import Combine
import Foundation

struct Post: Codable {
    let id: Int
    let title: String
    let body: String
}

enum NetworkError: Error {
    case invalidURL
    case invalidResponse
    case decodingError
}

class APIClient {
    private var cancellables = Set<AnyCancellable>()

    // Fetch posts and decode JSON response
    func fetchPosts() -> AnyPublisher<[Post], NetworkError> {
        guard let url = URL(string: "https://jsonplaceholder.typicode.com/posts") else {
            return Fail(error: NetworkError.invalidURL)
                .eraseToAnyPublisher()
        }

        return URLSession.shared.dataTaskPublisher(for: url)
            // Map to just the data, ignoring the response
            .map(\.data)
            // Decode JSON to our model
            .decode(type: [Post].self, decoder: JSONDecoder())
            // Convert any error to our custom type
            .mapError { error -> NetworkError in
                if error is DecodingError {
                    return .decodingError
                }
                return .invalidResponse
            }
            .eraseToAnyPublisher()
    }

    // Fetch a single post by ID
    func fetchPost(id: Int) -> AnyPublisher<Post, NetworkError> {
        let url = URL(string: "https://jsonplaceholder.typicode.com/posts/\(id)")!

        return URLSession.shared.dataTaskPublisher(for: url)
            .map(\.data)
            .decode(type: Post.self, decoder: JSONDecoder())
            .mapError { _ in NetworkError.invalidResponse }
            .eraseToAnyPublisher()
    }

    // Example: fetch post then fetch related data
    func fetchPostWithComments(postId: Int) -> AnyPublisher<(Post, [String]), NetworkError> {
        fetchPost(id: postId)
            .flatMap { post -> AnyPublisher<(Post, [String]), NetworkError> in
                // Fetch comments for this post
                self.fetchComments(postId: post.id)
                    .map { comments in
                        (post, comments)
                    }
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }

    private func fetchComments(postId: Int) -> AnyPublisher<[String], NetworkError> {
        // Simplified - just return mock data
        Just(["Comment 1", "Comment 2"])
            .setFailureType(to: NetworkError.self)
            .eraseToAnyPublisher()
    }
}
```

### Timer Publisher

Create periodic events with a timer publisher:

```swift
import Combine
import Foundation

class CountdownTimer {
    private var cancellables = Set<AnyCancellable>()
    @Published var timeRemaining = 10

    func start() {
        // Timer.publish creates a publisher that emits at intervals
        Timer.publish(every: 1.0, on: .main, in: .common)
            // autoconnect starts the timer when first subscriber attaches
            .autoconnect()
            // Take only 10 values then complete
            .prefix(10)
            .sink { [weak self] _ in
                guard let self = self else { return }
                self.timeRemaining -= 1
                print("Time remaining: \(self.timeRemaining)")

                if self.timeRemaining == 0 {
                    print("Timer complete!")
                }
            }
            .store(in: &cancellables)
    }

    func stop() {
        // Removing cancellables stops the timer
        cancellables.removeAll()
    }
}
```

---

## SwiftUI Integration

### Using @Published with ObservableObject

Combine integrates seamlessly with SwiftUI through `@Published` properties:

```swift
import SwiftUI
import Combine

class UserViewModel: ObservableObject {
    // @Published automatically publishes changes to SwiftUI
    @Published var username = ""
    @Published var email = ""
    @Published var isValid = false
    @Published var validationMessage = ""

    private var cancellables = Set<AnyCancellable>()

    init() {
        // Validate form whenever username or email changes
        Publishers.CombineLatest($username, $email)
            .map { (username, email) -> (Bool, String) in
                // Validation logic
                if username.isEmpty && email.isEmpty {
                    return (false, "Enter username and email")
                }
                if username.count < 3 {
                    return (false, "Username must be at least 3 characters")
                }
                if !email.contains("@") {
                    return (false, "Enter a valid email")
                }
                return (true, "Looks good!")
            }
            // Small debounce so we don't validate on every keystroke
            .debounce(for: .milliseconds(200), scheduler: RunLoop.main)
            .sink { [weak self] (isValid, message) in
                self?.isValid = isValid
                self?.validationMessage = message
            }
            .store(in: &cancellables)
    }
}

struct SignupView: View {
    @StateObject private var viewModel = UserViewModel()

    var body: some View {
        Form {
            TextField("Username", text: $viewModel.username)
            TextField("Email", text: $viewModel.email)

            Text(viewModel.validationMessage)
                .foregroundColor(viewModel.isValid ? .green : .red)

            Button("Sign Up") {
                // Handle signup
            }
            .disabled(!viewModel.isValid)
        }
    }
}
```

### Handling Async Data Loading

Load data reactively and handle loading states:

```swift
import SwiftUI
import Combine

class PostsViewModel: ObservableObject {
    @Published var posts: [Post] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private var cancellables = Set<AnyCancellable>()
    private let apiClient = APIClient()

    func loadPosts() {
        isLoading = true
        errorMessage = nil

        apiClient.fetchPosts()
            .receive(on: RunLoop.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoading = false
                    if case .failure(let error) = completion {
                        self?.errorMessage = "Failed to load: \(error)"
                    }
                },
                receiveValue: { [weak self] posts in
                    self?.posts = posts
                }
            )
            .store(in: &cancellables)
    }
}

struct PostsView: View {
    @StateObject private var viewModel = PostsViewModel()

    var body: some View {
        NavigationView {
            Group {
                if viewModel.isLoading {
                    ProgressView("Loading...")
                } else if let error = viewModel.errorMessage {
                    Text(error)
                        .foregroundColor(.red)
                } else {
                    List(viewModel.posts, id: \.id) { post in
                        VStack(alignment: .leading) {
                            Text(post.title)
                                .font(.headline)
                            Text(post.body)
                                .font(.subheadline)
                                .foregroundColor(.gray)
                        }
                    }
                }
            }
            .navigationTitle("Posts")
            .onAppear {
                viewModel.loadPosts()
            }
        }
    }
}
```

---

## Common Operators Reference

Here's a quick reference table for the most commonly used Combine operators:

| Operator | Purpose | Example Use Case |
|----------|---------|------------------|
| `map` | Transform values | Convert models to view models |
| `filter` | Pass values matching condition | Only process valid inputs |
| `compactMap` | Transform and remove nils | Parse optional values |
| `flatMap` | Flatten nested publishers | Chain async operations |
| `merge` | Combine same-type publishers | Multiple event sources |
| `combineLatest` | Latest from multiple publishers | Form validation |
| `zip` | Pair values by index | Sync parallel operations |
| `debounce` | Wait for pause in events | Search input |
| `throttle` | Limit event frequency | Scroll events |
| `removeDuplicates` | Skip consecutive duplicates | Avoid redundant updates |
| `retry` | Retry on failure | Network requests |
| `catch` | Handle errors with fallback | Graceful error recovery |
| `receive(on:)` | Switch schedulers | Update UI on main thread |

---

## Best Practices

### 1. Always Store Cancellables

Subscriptions are automatically cancelled when their `AnyCancellable` is deallocated:

```swift
class MyClass {
    // Keep cancellables alive for the lifetime of the object
    private var cancellables = Set<AnyCancellable>()

    func subscribe() {
        publisher
            .sink { value in }
            .store(in: &cancellables) // Don't forget this!
    }
}
```

### 2. Use Type Erasure for Public APIs

Hide implementation details with `eraseToAnyPublisher()`:

```swift
// Instead of exposing the concrete type
func fetchUser() -> Publishers.Map<URLSession.DataTaskPublisher, User> { ... }

// Use type erasure
func fetchUser() -> AnyPublisher<User, Error> {
    URLSession.shared.dataTaskPublisher(for: url)
        .map(\.data)
        .decode(type: User.self, decoder: JSONDecoder())
        .eraseToAnyPublisher()  // Hides the complex type
}
```

### 3. Handle Errors Explicitly

Don't let errors silently fail - handle them or transform them:

```swift
publisher
    .catch { error -> Just<DefaultValue> in
        // Log the error
        print("Error occurred: \(error)")
        // Return a sensible default
        return Just(DefaultValue())
    }
    .sink { value in }
    .store(in: &cancellables)
```

### 4. Use Weak Self in Closures

Avoid retain cycles by capturing self weakly:

```swift
publisher
    .sink { [weak self] value in
        guard let self = self else { return }
        self.handleValue(value)
    }
    .store(in: &cancellables)
```

---

## Conclusion

Combine brings reactive programming directly into the Apple ecosystem. Key takeaways:

- **Publishers emit values** over time, subscribers receive them
- **Operators transform data** between publishers and subscribers
- **Combine integrates naturally** with SwiftUI through @Published
- **Error handling is explicit** - use catch, retry, and replaceError
- **Memory management matters** - store cancellables and use weak self

Start with simple publishers and gradually add operators as needed. The declarative style takes some getting used to, but it leads to cleaner, more testable code for handling async events.

---

*Building iOS applications that need reliability monitoring? [OneUptime](https://oneuptime.com) provides comprehensive monitoring and observability for your mobile backends, helping you catch issues before your users do.*

**Related Reading:**
- [How to Implement Networking with URLSession](https://oneuptime.com/blog/post/2026-02-02-swift-urlsession-networking/view)
- [How to Handle Optionals Safely in Swift](https://oneuptime.com/blog/post/2026-02-02-swift-optionals-safely/view)
