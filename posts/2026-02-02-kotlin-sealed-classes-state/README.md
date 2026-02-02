# How to Use Sealed Classes for Type-Safe State in Kotlin

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Kotlin, Sealed Classes, State Management, Type Safety, Android

Description: Learn how to leverage Kotlin sealed classes for type-safe state management, exhaustive when expressions, and clean UI state handling patterns.

---

If you have ever worked with state management in an application, you know how messy things can get. String constants, integer flags, and enums all have their place, but they fall short when your states need to carry different data. Kotlin sealed classes solve this problem elegantly by combining the exhaustiveness of enums with the flexibility of inheritance.

## What Are Sealed Classes?

A sealed class is a class that restricts which other classes can inherit from it. All subclasses must be defined in the same file (or same package in Kotlin 1.5+). This restriction gives the compiler complete knowledge of all possible subtypes, enabling exhaustive `when` expressions without an `else` branch.

```kotlin
// All subclasses of NetworkState must be defined here
sealed class NetworkState {
    object Idle : NetworkState()
    object Loading : NetworkState()
    data class Success(val data: String) : NetworkState()
    data class Error(val message: String, val code: Int) : NetworkState()
}
```

The compiler knows exactly four states exist. No external code can add a fifth state without modifying this file.

## Sealed Classes vs Enums

Enums work well when each variant is a singleton with the same structure. Sealed classes shine when variants need different data.

| Feature | Enum | Sealed Class |
|---------|------|--------------|
| Instance type | Singleton only | Can be singleton or class |
| Different data per variant | No | Yes |
| Exhaustive when | Yes | Yes |
| Inheritance | No | Yes (within restrictions) |
| Serialization | Built-in name/ordinal | Requires custom handling |
| Memory usage | Lower (singletons) | Higher (can create instances) |

Use enums for simple flags like `Status.ACTIVE`, `Status.INACTIVE`. Use sealed classes when variants carry different payloads.

## Exhaustive When Expressions

The real power shows up in `when` expressions. The compiler enforces that you handle every case:

```kotlin
// Function to render UI based on current network state
fun renderState(state: NetworkState): String {
    // No 'else' needed - compiler verifies all cases are covered
    return when (state) {
        is NetworkState.Idle -> "Waiting to start"
        is NetworkState.Loading -> "Loading..."
        is NetworkState.Success -> "Got data: ${state.data}"
        is NetworkState.Error -> "Error ${state.code}: ${state.message}"
    }
}
```

If you add a new subclass to `NetworkState`, the compiler will flag every `when` expression that does not handle it. This prevents bugs where you forget to handle a new state.

## Sealed Interfaces (Kotlin 1.5+)

Sealed interfaces offer more flexibility than sealed classes. A class can implement multiple sealed interfaces but can only extend one sealed class.

```kotlin
// Sealed interface for authentication events
sealed interface AuthEvent {
    data class LoginRequested(val email: String, val password: String) : AuthEvent
    data class LogoutRequested(val userId: String) : AuthEvent
    object SessionExpired : AuthEvent
}

// Sealed interface for analytics events
sealed interface AnalyticsEvent {
    val eventName: String
}

// A class can implement both sealed interfaces
data class LoginAnalyticsEvent(
    val email: String,
    override val eventName: String = "login_attempt"
) : AuthEvent, AnalyticsEvent
```

Use sealed interfaces when you need multiple inheritance or when the sealed hierarchy should not share common implementation.

## Building a State Machine

Sealed classes are perfect for state machines where transitions are well-defined:

```kotlin
// Order state machine with restricted transitions
sealed class OrderState {
    // Initial state - can only move to Confirmed or Cancelled
    object Pending : OrderState()

    // Confirmed orders have a timestamp
    data class Confirmed(val confirmedAt: Long) : OrderState()

    // Shipped orders track the carrier
    data class Shipped(val trackingNumber: String, val carrier: String) : OrderState()

    // Delivered orders record the delivery timestamp
    data class Delivered(val deliveredAt: Long) : OrderState()

    // Cancelled orders include a reason
    data class Cancelled(val reason: String) : OrderState()
}

// Transition function that enforces valid state changes
fun OrderState.transition(event: OrderEvent): OrderState {
    return when (this) {
        is OrderState.Pending -> when (event) {
            is OrderEvent.Confirm -> OrderState.Confirmed(System.currentTimeMillis())
            is OrderEvent.Cancel -> OrderState.Cancelled(event.reason)
            else -> this // Invalid transition, stay in current state
        }
        is OrderState.Confirmed -> when (event) {
            is OrderEvent.Ship -> OrderState.Shipped(event.trackingNumber, event.carrier)
            is OrderEvent.Cancel -> OrderState.Cancelled(event.reason)
            else -> this
        }
        is OrderState.Shipped -> when (event) {
            is OrderEvent.Deliver -> OrderState.Delivered(System.currentTimeMillis())
            else -> this
        }
        // Terminal states - no transitions allowed
        is OrderState.Delivered -> this
        is OrderState.Cancelled -> this
    }
}

// Events that trigger state transitions
sealed class OrderEvent {
    object Confirm : OrderEvent()
    data class Ship(val trackingNumber: String, val carrier: String) : OrderEvent()
    object Deliver : OrderEvent()
    data class Cancel(val reason: String) : OrderEvent()
}
```

## UI State Pattern for Android/Compose

A common pattern in Android development is representing screen state with sealed classes:

```kotlin
// Generic UI state wrapper that works for any data type
sealed class UiState<out T> {
    // Initial state before any data is loaded
    object Initial : UiState<Nothing>()

    // Loading state, optionally showing previous data
    data class Loading<T>(val previousData: T? = null) : UiState<T>()

    // Success state with the loaded data
    data class Success<T>(val data: T) : UiState<T>()

    // Error state with message and optional retry action
    data class Error(val message: String, val retryAction: (() -> Unit)? = null) : UiState<Nothing>()
}

// Example: User profile data class
data class UserProfile(val name: String, val email: String, val avatarUrl: String?)

// ViewModel that manages profile state
class ProfileViewModel : ViewModel() {
    // StateFlow exposed to the UI layer
    private val _state = MutableStateFlow<UiState<UserProfile>>(UiState.Initial)
    val state: StateFlow<UiState<UserProfile>> = _state.asStateFlow()

    fun loadProfile(userId: String) {
        viewModelScope.launch {
            // Show loading, keeping previous data if available
            val previousData = (_state.value as? UiState.Success)?.data
            _state.value = UiState.Loading(previousData)

            try {
                val profile = repository.fetchProfile(userId)
                _state.value = UiState.Success(profile)
            } catch (e: Exception) {
                _state.value = UiState.Error(
                    message = e.message ?: "Unknown error",
                    retryAction = { loadProfile(userId) }
                )
            }
        }
    }
}
```

In your Compose UI, you can handle each state cleanly:

```kotlin
@Composable
fun ProfileScreen(viewModel: ProfileViewModel) {
    val state by viewModel.state.collectAsState()

    // Render based on current state
    when (val currentState = state) {
        is UiState.Initial -> {
            // Show placeholder or trigger initial load
            LaunchedEffect(Unit) { viewModel.loadProfile("user123") }
        }
        is UiState.Loading -> {
            // Show loading indicator, optionally with stale data
            LoadingSpinner()
            currentState.previousData?.let { ProfileContent(it, isStale = true) }
        }
        is UiState.Success -> {
            ProfileContent(currentState.data, isStale = false)
        }
        is UiState.Error -> {
            ErrorMessage(
                message = currentState.message,
                onRetry = currentState.retryAction
            )
        }
    }
}
```

## Nested Sealed Hierarchies

You can nest sealed classes for more complex state trees:

```kotlin
// Top-level authentication state
sealed class AuthState {
    // User is not logged in
    object LoggedOut : AuthState()

    // User is logged in - has nested states for different scenarios
    sealed class LoggedIn : AuthState() {
        // Normal active session
        data class Active(val user: User, val token: String) : LoggedIn()

        // Session needs refresh
        data class TokenExpiring(val user: User, val expiresIn: Long) : LoggedIn()

        // Currently refreshing the token
        object Refreshing : LoggedIn()
    }

    // Authentication in progress
    sealed class Authenticating : AuthState() {
        object ValidatingCredentials : Authenticating()
        object FetchingProfile : Authenticating()
        object SettingUpSession : Authenticating()
    }
}

// Handle all states with smart casts
fun getStatusMessage(state: AuthState): String = when (state) {
    is AuthState.LoggedOut -> "Please log in"
    is AuthState.LoggedIn.Active -> "Welcome, ${state.user.name}"
    is AuthState.LoggedIn.TokenExpiring -> "Session expires in ${state.expiresIn}ms"
    is AuthState.LoggedIn.Refreshing -> "Refreshing session..."
    is AuthState.Authenticating.ValidatingCredentials -> "Checking credentials..."
    is AuthState.Authenticating.FetchingProfile -> "Loading profile..."
    is AuthState.Authenticating.SettingUpSession -> "Setting up session..."
}
```

## Tips for Using Sealed Classes

**Keep hierarchies flat when possible.** Deep nesting makes code harder to read and `when` expressions longer. Two levels is usually enough.

**Use `object` for stateless variants.** If a state carries no data, declare it as an `object` to avoid unnecessary allocations.

**Prefer `data class` for states with data.** You get `equals()`, `hashCode()`, `copy()`, and `toString()` for free.

**Consider sealed interfaces for shared behavior.** If multiple states need the same interface (like `Parcelable` on Android), sealed interfaces let you implement it on each subclass differently.

**Document valid transitions.** State machines benefit from clear documentation of which transitions are valid from each state.

## Conclusion

Sealed classes bring type safety to state management in Kotlin. The compiler becomes your ally, catching missing cases at compile time rather than runtime. Whether you are building Android apps, backend services, or multiplatform projects, sealed classes help you model complex states clearly and safely.

Start simple with a basic sealed class for your next feature's state, and expand the hierarchy as requirements grow. The exhaustive `when` checks will guide you every time the state model changes.
