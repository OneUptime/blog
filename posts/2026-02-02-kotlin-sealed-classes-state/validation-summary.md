# Validation Summary: How to Use Sealed Classes for Type-Safe State in Kotlin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kotlin (sealed classes, sealed interfaces, data classes, objects, generics)
- Kotlin 1.5+ language features
- Android (ViewModel, viewModelScope)
- Kotlin Coroutines (StateFlow, MutableStateFlow, asStateFlow, launch)
- Jetpack Compose (`@Composable`, `collectAsState`, `LaunchedEffect`)

## Sources Consulted
- Kotlin official documentation on sealed classes and interfaces: https://kotlinlang.org/docs/sealed-classes.html
- Kotlin release notes for 1.5 (sealed interfaces, relaxed package rules): https://kotlinlang.org/docs/whatsnew15.html
- Android developers — ViewModel and StateFlow guidance: https://developer.android.com/topic/libraries/architecture/viewmodel and https://developer.android.com/kotlin/flow/stateflow-and-sharedflow
- Jetpack Compose state APIs: https://developer.android.com/jetpack/compose/state and https://developer.android.com/jetpack/compose/side-effects (LaunchedEffect)
- Kotlin data class documentation: https://kotlinlang.org/docs/data-classes.html

## Issues Found
No technical issues found.

All code examples are syntactically valid Kotlin. The sealed class / sealed interface definitions, exhaustive `when` expressions, generic variance with `out T` and `Nothing`, the OrderState transition function, and the Android UiState / Compose patterns all use current, non-deprecated APIs and behave as described.

## Review Notes
- The post's description of the location rule — "All subclasses must be defined in the same file (or same package in Kotlin 1.5+)" — is a reasonable simplification. The formal Kotlin 1.5+ rule is that direct subclasses must be in the same package **and** same module/compilation unit. The "same module" caveat is omitted but does not introduce an error for the typical reader.
- In the `ProfileViewModel` example, `(_state.value as? UiState.Success)?.data` relies on the compiler narrowing the star-projected `UiState.Success<*>` against the receiver type `UiState<UserProfile>` to recover `UserProfile`. This compiles cleanly in modern Kotlin via type inference, though some readers may prefer an explicit `is UiState.Success` smart cast for clarity. Not an error — left as-is.
- The `UiState.Loading<T>` subclass shadows the outer `T` of `UiState<out T>` with its own invariant type parameter. This is valid and idiomatic Kotlin; type inference resolves the relationship at use sites.
- The nested `when` in `getStatusMessage` is exhaustive because each nested sealed class (`LoggedIn`, `Authenticating`) lists all its leaf cases. Correct as written.
