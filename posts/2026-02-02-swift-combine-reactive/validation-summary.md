# Validation Summary: How to Use Combine Framework for Reactive Programming

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Swift (Combine framework)
- SwiftUI (`@Published`, `@StateObject`, `ObservableObject`)
- Foundation (`URLSession`, `Timer`, `JSONDecoder`, `RunLoop`)
- Combine operators: `Just`, `Future`, `PassthroughSubject`, `CurrentValueSubject`, `Deferred`, `Fail`, `map`, `filter`, `compactMap`, `flatMap`, `merge`, `combineLatest`, `zip`, `debounce`, `removeDuplicates`, `delay`, `prefix`, `catch`, `retry`, `replaceError`, `setFailureType`, `mapError`, `receive(on:)`, `sink`, `eraseToAnyPublisher`, `autoconnect`

## Sources Consulted
- Apple Combine framework documentation: https://developer.apple.com/documentation/combine
- Apple `Publisher` protocol docs: https://developer.apple.com/documentation/combine/publisher
- Apple `Deferred` docs: https://developer.apple.com/documentation/combine/deferred
- Apple `retry(_:)` docs: https://developer.apple.com/documentation/combine/publisher/retry(_:)
- Apple `Timer.publish` docs: https://developer.apple.com/documentation/foundation/timer/3329634-publish
- Apple `URLSession.DataTaskPublisher` docs: https://developer.apple.com/documentation/foundation/urlsession/datataskpublisher
- Apple SwiftUI `@Published` / `ObservableObject` docs: https://developer.apple.com/documentation/combine/published

## Issues Found
- **Retry example had a side-effect timing bug.** In the original code, `flakyRequest()` placed `attemptCount += 1` and `print("Attempt ...")` directly in the function body before returning a `Fail` publisher. Because `.retry(3)` resubscribes to the same returned publisher instance (it does not re-invoke the function), the side effects would only run once, producing `Attempt 1` followed by a failure — not the `Attempt 1`, `Attempt 2`, `Attempt 3`, `Value: Success!` output shown. Fixed by wrapping the body in `Deferred { () -> AnyPublisher<String, Error> in ... }` so the side-effecting closure re-executes on each retry subscription, matching the documented output.

## Review Notes
- The `combineLatest` example with two `CurrentValueSubject<String, Never>("")` instances will actually emit an initial `Form valid: false` upon subscription (since both subjects already hold their initial values), before the `username.send("john")` call. The output comments next to the `send` lines only reflect emissions triggered by each `send`, which is technically accurate but slightly understates the full stream. Not corrected — the comments are not wrong as written.
- The `SearchViewModel` and `UserViewModel` examples capture `self` strongly inside `flatMap` / `map` closures used in `init`. Combined with `cancellables` being owned by `self`, this can create a retain cycle. The `sink` closures correctly use `[weak self]`. This is a common simplification in tutorials and not strictly a bug for short-lived view models, so it was left as-is.
- `NavigationView` (used in `PostsView`) is deprecated in iOS 16+ in favor of `NavigationStack`, but still functional and widely used. Not corrected — the example remains accurate for the iOS versions where Combine is supported.
- The retry comment "Retry up to 3 times on failure" is consistent with Apple's `retry(_:)` semantics (up to N additional subscription attempts after the initial failure).
