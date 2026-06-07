# Validation Summary: How to Write Unit Tests with XCTest

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Swift
- XCTest (Apple's testing framework)
- Xcode
- async/await (Swift concurrency)
- Combine
- Core Data (NSPersistentContainer, NSInMemoryStoreType)
- XCTestExpectation
- XCTMetric / XCTMeasureOptions (performance testing)
- xcodebuild (CLI)

## Sources Consulted
- Apple Developer Documentation — XCTest framework: https://developer.apple.com/documentation/xctest
- XCTestCase lifecycle methods (`setUp`, `setUpWithError`, `class func setUp`, `tearDown`, `tearDownWithError`, `class func tearDown`): https://developer.apple.com/documentation/xctest/xctestcase
- XCTest assertions (XCTAssertEqual, XCTAssertThrowsError, XCTUnwrap, etc.): https://developer.apple.com/documentation/xctest/xctest_assertions
- XCTestExpectation API (`isInverted`, `expectedFulfillmentCount`, `wait(for:timeout:enforceOrder:)`): https://developer.apple.com/documentation/xctest/xctestexpectation
- Performance testing metrics (XCTClockMetric, XCTCPUMetric, XCTMemoryMetric, XCTMeasureOptions): https://developer.apple.com/documentation/xctest/xctmetric
- xcodebuild man page (`-only-testing`, `-enableCodeCoverage`, `-resultBundlePath`, `-destination`): xcodebuild documentation
- Core Data NSPersistentContainer / NSInMemoryStoreType: https://developer.apple.com/documentation/coredata/nspersistentcontainer

## Issues Found

1. **Incorrect class-level lifecycle method names in mermaid diagram.** The diagram labeled `setUpWithError` and `tearDownWithError` as "Class Level" methods. This is wrong: `setUpWithError()` and `tearDownWithError()` are per-test-instance throwing variants. The actual class-level (once-per-class) lifecycle methods are `override class func setUp()` and `override class func tearDown()`. Updated the diagram nodes to read `class func setUp - Class Level` and `class func tearDown - Class Level`.

2. **`test_nilAssertions()` missing `throws` annotation.** The test method body invoked `try XCTUnwrap(optionalValue)`, but the function signature was `func test_nilAssertions()` (non-throwing), which would not compile because `XCTUnwrap` is a throwing call. Added `throws` to the signature so the example compiles as written.

## Review Notes

- The post mixes the legacy non-throwing lifecycle hooks (`override func setUp()` / `override func tearDown()`) with examples that could also use `setUpWithError()` / `tearDownWithError()`. Both are still supported by XCTest, so this is not an error — just a style note. Modern XCTest also supports `override func setUp() async throws` for async setup, which the post does not cover but is not required for correctness.
- For async waiting, the post uses the synchronous `wait(for:timeout:)` API inside async tests in some places (e.g. `LoginViewModelTests.test_login_updatesStateToLoading`). Apple's newer `await fulfillment(of:timeout:)` API (Xcode 13.3+/Swift 5.6+) is preferred in `async` contexts, but `wait(for:timeout:)` still works.
- The `TestDataFactory.makeTask` example uses `Task` as a domain model type. In Swift Concurrency, `Task` is also a standard-library type, so in practice a project would likely need to fully-qualify (e.g. `MyApp.Task`) to avoid ambiguity. This is a minor naming concern, not an XCTest correctness issue, and the example clearly references an app-defined `Task` type so it was left as-is.
- The `xcodebuild -destination 'platform=iOS Simulator,name=iPhone 15'` example assumes the iPhone 15 simulator is installed. The flag form is correct; users may need to substitute whichever simulator name is available on their machine.
- The `URLSession` mocking example (`mockURLSession.responseToReturn = HTTPURLResponse(...)`) relies on `HTTPURLResponse(url:statusCode:httpVersion:headerFields:)` which returns an optional. The mock property would need to be typed `HTTPURLResponse?` to accept the assignment without force-unwrap. This was left as-is because the surrounding mock type is intentionally abbreviated for illustration.
